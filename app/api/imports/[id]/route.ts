import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { createCanonicalLog } from "../../logs/canonical-log-service";
import { getRequestActor } from "../../../chatgpt-auth";

type SuggestionRow = { id: string; type: "decision" | "task" | "question"; content: string; description: string; occurredAt: string; status: string; externalUrl: string | null };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const body = await request.json() as { action?: string };
  if (!['approve','reject'].includes(body.action ?? "")) return Response.json({ error: "Некорректное действие" }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const actorId = getRequestActor(request);
  const suggestion = await db.prepare(`SELECT id, type, content, description, occurred_at AS occurredAt, status, external_url AS externalUrl FROM import_suggestions WHERE id = ?`).bind(id).first<SuggestionRow>();
  if (!suggestion) return Response.json({ error: "Предложение не найдено" }, { status: 404 });
  if (suggestion.status !== "pending") return Response.json({ error: "Предложение уже проверено" }, { status: 409 });
  if (body.action === "reject") { await db.prepare("UPDATE import_suggestions SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ? AND status = 'pending'").bind(actorId, id).run(); return Response.json({ status: "rejected" }); }
  const claim = await db.prepare("UPDATE import_suggestions SET status = 'processing', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(actorId, id).run();
  if (claim.meta.changes !== 1) return Response.json({ error: "Предложение уже проверяется" }, { status: 409 });
  try {
    const entry = await createCanonicalLog(db, { type: suggestion.type, content: suggestion.content, description: suggestion.description, occurredAt: suggestion.occurredAt, status: suggestion.type === "task" ? "unassigned" : suggestion.type === "question" ? "open" : null, sources: suggestion.externalUrl ? [{ label: "Imported source", url: suggestion.externalUrl }] : [], importSuggestionId: id }, actorId);
    if (!entry) throw new Error("Не удалось создать запись");
    await db.prepare("UPDATE import_suggestions SET status = 'approved', canonical_log_id = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'processing'").bind(entry.id, id).run();
    return Response.json({ status: "approved", canonicalLogId: entry.id });
  } catch (error) {
    await db.prepare("UPDATE import_suggestions SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE id = ? AND status = 'processing'").bind(id).run();
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось подтвердить предложение" }, { status: 500 });
  }
}
