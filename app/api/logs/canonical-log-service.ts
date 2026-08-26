import type { LogPayload, LogType } from "../../log-domain";
import { resolveCompletionFacts } from "../../completion-facts";
import { getLogById } from "./log-storage";
import { resolveMentionIds } from "./mention-resolution";
import { syncTaskWorkItem } from "../work-items/work-item-storage";

export async function createCanonicalLog(db: D1Database, payload: LogPayload & { type: LogType; content: string; occurredAt: string; importSuggestionId?: string }, actorId: string | null) {
  if (payload.importSuggestionId) { const existing = await db.prepare("SELECT id FROM log_entries WHERE import_suggestion_id = ?").bind(payload.importSuggestionId).first<{ id: string }>(); if (existing) return getLogById(db, existing.id); }
  const id = crypto.randomUUID(); const type = payload.type; const content = payload.content.trim(); const description = (payload.description ?? "").trim();
  const occurredAt = new Date(payload.occurredAt).toISOString(); const status = type === "task" ? (payload.status ?? "unassigned") : type === "question" ? (payload.status ?? "open") : null;
  const assigneeId = type === "task" ? (payload.assigneeId ?? null) : null; const dueDate = type === "task" ? (payload.dueDate ?? null) : null;
  const { completedAt, completedByPersonId, resolvedAt, resolvedByPersonId } = resolveCompletionFacts(null, { ...payload, type, status, assigneeId });
  const terminalPersonId = completedByPersonId ?? resolvedByPersonId;
  if (terminalPersonId && !await db.prepare("SELECT id FROM people WHERE id = ? AND status = 'active'").bind(terminalPersonId).first()) throw new Error("Выбранный человек не найден или находится в архиве");
  const mentionIds = await resolveMentionIds(db, `${content}\n${description}`, payload.personIds, payload.projectIds, payload.teamIds);
  const statements = [db.prepare(`INSERT INTO log_entries
    (id, type, content, description, occurred_at, status, assignee_id, due_date, completed_at, completed_by_person_id, resolved_at, resolved_by_person_id, created_by, updated_by, import_suggestion_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, type, content, description, occurredAt, status, assigneeId, dueDate, completedAt, completedByPersonId, resolvedAt, resolvedByPersonId, actorId, actorId, payload.importSuggestionId ?? null)];
  for (const personId of mentionIds.personIds) statements.push(db.prepare("INSERT INTO log_people (log_id, person_id) VALUES (?, ?)").bind(id, personId));
  for (const projectId of mentionIds.projectIds) statements.push(db.prepare("INSERT INTO log_projects (log_id, project_id) VALUES (?, ?)").bind(id, projectId));
  for (const teamId of mentionIds.teamIds) statements.push(db.prepare("INSERT INTO log_teams (log_id, team_id) VALUES (?, ?)").bind(id, teamId));
  for (const source of payload.sources ?? []) statements.push(db.prepare("INSERT INTO sources (id, log_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, source.label.trim(), source.url.trim()));
  if (type === "task") statements.push(db.prepare("INSERT INTO log_sync_outbox (log_id) VALUES (?) ON CONFLICT(log_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP").bind(id));
  await db.batch(statements); if (type === "task") await retryTaskSync(db, id); return getLogById(db, id);
}

export async function enqueueTaskSync(db: D1Database, logId: string) {
  await db.prepare("INSERT INTO log_sync_outbox (log_id) VALUES (?) ON CONFLICT(log_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP").bind(logId).run();
  await retryTaskSync(db, logId);
}

export async function retryTaskSync(db: D1Database, onlyLogId?: string) {
  const result = onlyLogId ? { results: [{ logId: onlyLogId }] } : await db.prepare("SELECT log_id AS logId FROM log_sync_outbox ORDER BY updated_at LIMIT 10").all<{ logId: string }>();
  for (const row of result.results) {
    try {
      const entry = await getLogById(db, row.logId); if (!entry || entry.type !== "task") { await db.prepare("DELETE FROM log_sync_outbox WHERE log_id = ?").bind(row.logId).run(); continue; }
      const audit = await db.prepare("SELECT COALESCE(updated_by, created_by) AS actorId FROM log_entries WHERE id = ?").bind(row.logId).first<{ actorId: string | null }>();
      await syncTaskWorkItem(db, row.logId, { title: entry.content, description: entry.description, status: entry.status, assigneeId: entry.assigneeId, dueDate: entry.dueDate, projectIds: entry.projects.map((project) => project.id), links: entry.sources }, audit?.actorId ?? null);
      await db.prepare("DELETE FROM log_sync_outbox WHERE log_id = ?").bind(row.logId).run();
    } catch (error) {
      await db.prepare("UPDATE log_sync_outbox SET attempts = CAST(attempts AS INTEGER) + 1, last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE log_id = ?").bind(error instanceof Error ? error.message.slice(0, 1000) : "Unknown sync error", row.logId).run();
    }
  }
}
