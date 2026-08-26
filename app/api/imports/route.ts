import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import { contractFromText, parseImportContract } from "../../import-domain";
import { getRequestActor } from "../../chatgpt-auth";
import { ZodError } from "zod";

async function digest(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join(""); }

export async function GET() {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  await db.prepare("UPDATE import_suggestions SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE status = 'processing' AND reviewed_at < datetime('now', '-5 minutes')").run();
  const result = await db.prepare(`SELECT s.id, s.batch_id AS batchId, b.title AS batchTitle, b.source_system AS sourceSystem,
    s.type, s.content, s.description, s.occurred_at AS occurredAt, s.status, s.external_key AS externalKey,
    s.external_url AS externalUrl, s.canonical_log_id AS canonicalLogId, s.reviewed_at AS reviewedAt, s.created_at AS createdAt
    FROM import_suggestions s JOIN import_batches b ON b.id = s.batch_id ORDER BY s.created_at DESC, s.id DESC LIMIT 300`).all();
  return Response.json({ suggestions: result.results });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  let contract;
  try { contract = body.suggestions ? parseImportContract(body) : contractFromText({ title: body.title, sourceSystem: body.sourceSystem, text: body.text }); }
  catch (error) { return Response.json({ error: error instanceof ZodError ? error.issues[0]?.message ?? "Некорректный import contract v1" : "Некорректный import contract v1" }, { status: 400 }); }
  const { sourceSystem, title, suggestions } = contract; const key = await digest(JSON.stringify(contract));
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const existing = await db.prepare("SELECT id FROM import_batches WHERE idempotency_key = ?").bind(key).first<{ id: string }>();
  if (existing) return Response.json({ batchId: existing.id, duplicate: true });
  const batchId = crypto.randomUUID(); const now = new Date().toISOString(); const actorId = getRequestActor(request); const seenExternalKeys = new Set<string>();
  const statements = [db.prepare("INSERT INTO import_batches (id, format_version, source_system, title, idempotency_key, created_by) VALUES (?, '1', ?, ?, ?, ?)").bind(batchId, sourceSystem, title, key, actorId)];
  let inserted = 0;
  for (const suggestion of suggestions) {
    const externalKey = suggestion.externalKey ? `${sourceSystem}:${suggestion.externalKey}` : null;
    if (externalKey && (seenExternalKeys.has(externalKey) || await db.prepare("SELECT id FROM import_suggestions WHERE external_key = ?").bind(externalKey).first())) continue;
    if (externalKey) seenExternalKeys.add(externalKey); inserted++;
    statements.push(db.prepare(`INSERT INTO import_suggestions (id, batch_id, type, content, description, occurred_at, external_key, external_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), batchId, suggestion.type, suggestion.content, suggestion.description ?? "", suggestion.occurredAt && !Number.isNaN(Date.parse(suggestion.occurredAt)) ? new Date(suggestion.occurredAt).toISOString() : now, externalKey, suggestion.externalUrl ?? null));
  }
  if (!inserted) return Response.json({ error: "Все предложения уже были импортированы" }, { status: 409 });
  await db.batch(statements); return Response.json({ batchId, duplicate: false }, { status: 201 });
}
