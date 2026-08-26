import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import type { LogPayload } from "../../../log-domain";
import { validateLogPayload } from "../../../log-domain";
import { getLogById } from "../log-storage";
import { resolveMentionIds } from "../mention-resolution";
import { resolveCompletionFacts } from "../../../completion-facts";
import { detachTaskWorkItem, syncTaskWorkItem } from "../../work-items/work-item-storage";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const payload = (await request.json()) as LogPayload;
  const error = validateLogPayload(payload); if (error) return Response.json({ error }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const current = await getLogById(db, id); if (!current) return Response.json({ error: "Запись не найдена" }, { status: 404 });
  const type = payload.type!; const status = type === "task" ? (payload.status ?? "unassigned") : type === "question" ? (payload.status ?? "open") : null;
  const description = (payload.description ?? "").trim();
  const { completedAt, completedByPersonId, resolvedAt, resolvedByPersonId } = resolveCompletionFacts(current, { ...payload, type, status });
  const terminalPersonId = completedByPersonId ?? resolvedByPersonId;
  if (terminalPersonId && !await db.prepare("SELECT id FROM people WHERE id = ? AND status = 'active'").bind(terminalPersonId).first()) return Response.json({ error: "Выбранный человек не найден или находится в архиве" }, { status: 400 });
  const mentionIds = await resolveMentionIds(db, `${payload.content!.trim()}\n${description}`, payload.personIds, payload.projectIds, payload.teamIds);
  const statements = [
    db.prepare(`UPDATE log_entries SET type = ?, content = ?, description = ?, occurred_at = ?, status = ?, assignee_id = ?, due_date = ?,
      completed_at = ?, completed_by_person_id = ?, resolved_at = ?, resolved_by_person_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(type, payload.content!.trim(), description, new Date(payload.occurredAt!).toISOString(), status, type === "task" ? payload.assigneeId ?? null : null, type === "task" ? payload.dueDate ?? null : null, completedAt, completedByPersonId, resolvedAt, resolvedByPersonId, id),
    db.prepare("DELETE FROM log_people WHERE log_id = ?").bind(id),
    db.prepare("DELETE FROM log_projects WHERE log_id = ?").bind(id),
    db.prepare("DELETE FROM log_teams WHERE log_id = ?").bind(id),
    db.prepare("DELETE FROM sources WHERE log_id = ?").bind(id),
  ];
  for (const personId of mentionIds.personIds) statements.push(db.prepare("INSERT INTO log_people (log_id, person_id) VALUES (?, ?)").bind(id, personId));
  for (const projectId of mentionIds.projectIds) statements.push(db.prepare("INSERT INTO log_projects (log_id, project_id) VALUES (?, ?)").bind(id, projectId));
  for (const teamId of mentionIds.teamIds) statements.push(db.prepare("INSERT INTO log_teams (log_id, team_id) VALUES (?, ?)").bind(id, teamId));
  for (const source of payload.sources ?? []) statements.push(db.prepare("INSERT INTO sources (id, log_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, source.label.trim(), source.url.trim()));
  await db.batch(statements);
  if (type === "task") await syncTaskWorkItem(db, id, { title: payload.content!.trim(), description, status, assigneeId: payload.assigneeId ?? null, dueDate: payload.dueDate ?? null, projectIds: mentionIds.projectIds, links: payload.sources ?? [] });
  else if (current.type === "task") await detachTaskWorkItem(db, id);
  return Response.json({ entry: await getLogById(db, id) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  await detachTaskWorkItem(db, id);
  const result = await db.batch([
    db.prepare("DELETE FROM log_people WHERE log_id = ?").bind(id), db.prepare("DELETE FROM log_projects WHERE log_id = ?").bind(id), db.prepare("DELETE FROM log_teams WHERE log_id = ?").bind(id),
    db.prepare("DELETE FROM sources WHERE log_id = ?").bind(id), db.prepare("DELETE FROM log_entries WHERE id = ?").bind(id),
  ]);
  return Response.json({ deleted: result.at(-1)?.meta.changes === 1 });
}
