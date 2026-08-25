import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import type { LogPayload } from "../../log-domain";
import { validateLogPayload } from "../../log-domain";
import { getLogById, hydrateLogs } from "./log-storage";
import { resolveMentionIds } from "./mention-resolution";
import { parseLogFilters } from "./log-filters";
import { resolveCompletionFacts } from "../../completion-facts";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const params = new URL(request.url).searchParams; const filters = parseLogFilters(params);
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = Math.min(200, Math.max(1, Number(params.get("limit") ?? "20") || 20)); const offset = (page - 1) * limit;
  const where: string[] = []; const values: unknown[] = [];
  const inGroup = (column: string, items: string[]) => { if (items.length) { where.push(`${column} IN (${items.map(() => "?").join(",")})`); values.push(...items); } };
  inGroup("le.type", filters.types); inGroup("le.status", filters.statuses);
  if (filters.personIds.length) { where.push(`EXISTS (SELECT 1 FROM log_people lp WHERE lp.log_id = le.id AND lp.person_id IN (${filters.personIds.map(() => "?").join(",")}))`); values.push(...filters.personIds); }
  if (filters.projectIds.length) { where.push(`EXISTS (SELECT 1 FROM log_projects lp WHERE lp.log_id = le.id AND lp.project_id IN (${filters.projectIds.map(() => "?").join(",")}))`); values.push(...filters.projectIds); }
  if (filters.fromIso) { where.push("le.occurred_at >= ?"); values.push(filters.fromIso); }
  if (filters.toIsoExclusive) { where.push("le.occurred_at < ?"); values.push(filters.toIsoExclusive); }
  if (filters.completedFromIso) { where.push("COALESCE(le.completed_at, le.resolved_at) >= ?"); values.push(filters.completedFromIso); }
  if (filters.completedToIsoExclusive) { where.push("COALESCE(le.completed_at, le.resolved_at) < ?"); values.push(filters.completedToIsoExclusive); }
  const predicate = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await db.prepare(`SELECT id, type, content, description, occurred_at AS occurredAt, status,
    assignee_id AS assigneeId, due_date AS dueDate, completed_at AS completedAt, completed_by_person_id AS completedByPersonId,
    resolved_at AS resolvedAt, resolved_by_person_id AS resolvedByPersonId, created_at AS createdAt, updated_at AS updatedAt
    FROM log_entries le ${predicate} ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`).bind(...values, limit + 1, offset).all();
  const rows = result.results.slice(0, limit) as never[];
  return Response.json({ entries: await hydrateLogs(db, rows), page, hasMore: result.results.length > limit });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as LogPayload;
  const error = validateLogPayload(payload);
  if (error) return Response.json({ error }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const id = crypto.randomUUID();
  const type = payload.type!; const content = payload.content!.trim(); const description = (payload.description ?? "").trim(); const occurredAt = new Date(payload.occurredAt!).toISOString();
  const status = type === "task" ? (payload.status ?? "unassigned") : type === "question" ? (payload.status ?? "open") : null;
  const assigneeId = type === "task" ? (payload.assigneeId ?? null) : null;
  const dueDate = type === "task" ? (payload.dueDate ?? null) : null;
  const { completedAt, completedByPersonId, resolvedAt, resolvedByPersonId } = resolveCompletionFacts(null, { ...payload, type, status, assigneeId });
  const terminalPersonId = completedByPersonId ?? resolvedByPersonId;
  if (terminalPersonId && !await db.prepare("SELECT id FROM people WHERE id = ? AND status = 'active'").bind(terminalPersonId).first()) return Response.json({ error: "Выбранный человек не найден или находится в архиве" }, { status: 400 });
  const mentionIds = await resolveMentionIds(db, `${content}\n${description}`, payload.personIds, payload.projectIds);
  const statements = [db.prepare(`INSERT INTO log_entries
    (id, type, content, description, occurred_at, status, assignee_id, due_date, completed_at, completed_by_person_id, resolved_at, resolved_by_person_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, type, content, description, occurredAt, status, assigneeId, dueDate, completedAt, completedByPersonId, resolvedAt, resolvedByPersonId)];
  for (const personId of mentionIds.personIds) statements.push(db.prepare("INSERT INTO log_people (log_id, person_id) VALUES (?, ?)").bind(id, personId));
  for (const projectId of mentionIds.projectIds) statements.push(db.prepare("INSERT INTO log_projects (log_id, project_id) VALUES (?, ?)").bind(id, projectId));
  for (const source of payload.sources ?? []) statements.push(db.prepare("INSERT INTO sources (id, log_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, source.label.trim(), source.url.trim()));
  await db.batch(statements);
  return Response.json({ entry: await getLogById(db, id) }, { status: 201 });
}
