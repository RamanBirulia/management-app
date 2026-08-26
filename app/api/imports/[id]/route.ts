import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { resolveMentionIds } from "../../logs/mention-resolution";
import { syncTaskWorkItem } from "../../work-items/work-item-storage";

type SuggestionRow = { id: string; type: "decision" | "task" | "question"; content: string; description: string; occurredAt: string; status: string; externalUrl: string | null };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const body = await request.json() as { action?: string };
  if (!['approve','reject'].includes(body.action ?? "")) return Response.json({ error: "Некорректное действие" }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const suggestion = await db.prepare(`SELECT id, type, content, description, occurred_at AS occurredAt, status, external_url AS externalUrl FROM import_suggestions WHERE id = ?`).bind(id).first<SuggestionRow>();
  if (!suggestion) return Response.json({ error: "Предложение не найдено" }, { status: 404 });
  if (suggestion.status !== "pending") return Response.json({ error: "Предложение уже проверено" }, { status: 409 });
  if (body.action === "reject") { await db.prepare("UPDATE import_suggestions SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(id).run(); return Response.json({ status: "rejected" }); }
  const logId = crypto.randomUUID(); const mentions = await resolveMentionIds(db, `${suggestion.content}\n${suggestion.description}`, [], [], []);
  const logStatus = suggestion.type === "task" ? "unassigned" : suggestion.type === "question" ? "open" : null;
  const statements = [db.prepare(`INSERT INTO log_entries (id, type, content, description, occurred_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(logId, suggestion.type, suggestion.content, suggestion.description, suggestion.occurredAt, logStatus), db.prepare("UPDATE import_suggestions SET status = 'approved', canonical_log_id = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(logId, id)];
  for (const personId of mentions.personIds) statements.push(db.prepare("INSERT INTO log_people (log_id, person_id) VALUES (?, ?)").bind(logId, personId));
  for (const projectId of mentions.projectIds) statements.push(db.prepare("INSERT INTO log_projects (log_id, project_id) VALUES (?, ?)").bind(logId, projectId));
  for (const teamId of mentions.teamIds) statements.push(db.prepare("INSERT INTO log_teams (log_id, team_id) VALUES (?, ?)").bind(logId, teamId));
  if (suggestion.externalUrl) statements.push(db.prepare("INSERT INTO sources (id, log_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), logId, "Imported source", suggestion.externalUrl));
  await db.batch(statements);
  if (suggestion.type === "task") await syncTaskWorkItem(db, logId, { title: suggestion.content, description: suggestion.description, status: "unassigned", assigneeId: null, dueDate: null, projectIds: mentions.projectIds, links: suggestion.externalUrl ? [{ label: "Imported source", url: suggestion.externalUrl }] : [] });
  return Response.json({ status: "approved", canonicalLogId: logId });
}
