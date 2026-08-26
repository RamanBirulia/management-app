import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import { normalizeSuggestions, parseImportText } from "../../import-domain";

async function digest(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join(""); }

export async function GET() {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const result = await db.prepare(`SELECT s.id, s.batch_id AS batchId, b.title AS batchTitle, b.source_system AS sourceSystem,
    s.type, s.content, s.description, s.occurred_at AS occurredAt, s.status, s.external_key AS externalKey,
    s.external_url AS externalUrl, s.canonical_log_id AS canonicalLogId, s.reviewed_at AS reviewedAt, s.created_at AS createdAt
    FROM import_suggestions s JOIN import_batches b ON b.id = s.batch_id ORDER BY s.created_at DESC, s.id DESC LIMIT 300`).all();
  return Response.json({ suggestions: result.results });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const parsed = normalizeSuggestions(body.suggestions); const suggestions = parsed.length ? parsed : parseImportText(String(body.text ?? ""));
  if (!suggestions.length) return Response.json({ error: "Не найдено предложений. Используйте JSON contract v1 или строки Decision:, Task:, Question:." }, { status: 400 });
  const sourceSystem = String(body.sourceSystem ?? "manual").trim().toLowerCase() || "manual"; const title = String(body.title ?? "Import").trim().slice(0, 200) || "Import";
  const key = await digest(JSON.stringify({ version: "1", sourceSystem, suggestions }));
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const existing = await db.prepare("SELECT id FROM import_batches WHERE idempotency_key = ?").bind(key).first<{ id: string }>();
  if (existing) return Response.json({ batchId: existing.id, duplicate: true });
  const batchId = crypto.randomUUID(); const now = new Date().toISOString();
  const statements = [db.prepare("INSERT INTO import_batches (id, format_version, source_system, title, idempotency_key) VALUES (?, '1', ?, ?, ?)").bind(batchId, sourceSystem, title, key)];
  for (const suggestion of suggestions) {
    const externalKey = suggestion.externalKey ? `${sourceSystem}:${suggestion.externalKey}` : null;
    if (externalKey && await db.prepare("SELECT id FROM import_suggestions WHERE external_key = ?").bind(externalKey).first()) continue;
    statements.push(db.prepare(`INSERT INTO import_suggestions (id, batch_id, type, content, description, occurred_at, external_key, external_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), batchId, suggestion.type, suggestion.content, suggestion.description ?? "", suggestion.occurredAt && !Number.isNaN(Date.parse(suggestion.occurredAt)) ? new Date(suggestion.occurredAt).toISOString() : now, externalKey, suggestion.externalUrl ?? null));
  }
  await db.batch(statements); return Response.json({ batchId, duplicate: false }, { status: 201 });
}
