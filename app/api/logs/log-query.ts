import type { LogEntry } from "../../log-domain";
import { hydrateLogs } from "./log-storage";
import { parseLogFilters } from "./log-filters";

type LogRow = Omit<LogEntry, "people" | "projects" | "teams" | "sources">;

export async function queryLogPage(db: D1Database, params: URLSearchParams, options?: { cursor?: string | null; limit?: number; page?: number }) {
  const filters = parseLogFilters(params);
  const page = options?.page ?? Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = options?.limit ?? Math.min(200, Math.max(1, Number(params.get("limit") ?? "20") || 20));
  const cursor = options?.cursor ?? params.get("cursor"); const [cursorAt, cursorId] = cursor?.split("|") ?? []; const offset = cursor ? 0 : (page - 1) * limit;
  const where: string[] = []; const values: unknown[] = [];
  const inGroup = (column: string, items: string[]) => { if (items.length) { where.push(`${column} IN (${items.map(() => "?").join(",")})`); values.push(...items); } };
  inGroup("le.type", filters.types); inGroup("le.status", filters.statuses);
  if (filters.personIds.length) { where.push(`EXISTS (SELECT 1 FROM log_people lp WHERE lp.log_id = le.id AND lp.person_id IN (${filters.personIds.map(() => "?").join(",")}))`); values.push(...filters.personIds); }
  if (filters.projectIds.length) { where.push(`EXISTS (SELECT 1 FROM log_projects lp WHERE lp.log_id = le.id AND lp.project_id IN (${filters.projectIds.map(() => "?").join(",")}))`); values.push(...filters.projectIds); }
  if (filters.teamIds.length) { where.push(`EXISTS (SELECT 1 FROM log_teams lt WHERE lt.log_id = le.id AND lt.team_id IN (${filters.teamIds.map(() => "?").join(",")}))`); values.push(...filters.teamIds); }
  if (filters.fromIso) { where.push("le.occurred_at >= ?"); values.push(filters.fromIso); }
  if (filters.toIsoExclusive) { where.push("le.occurred_at < ?"); values.push(filters.toIsoExclusive); }
  if (filters.completedFromIso) { where.push("COALESCE(le.completed_at, le.resolved_at) >= ?"); values.push(filters.completedFromIso); }
  if (filters.completedToIsoExclusive) { where.push("COALESCE(le.completed_at, le.resolved_at) < ?"); values.push(filters.completedToIsoExclusive); }
  if (cursorAt && cursorId && !Number.isNaN(Date.parse(cursorAt))) { where.push("(le.occurred_at < ? OR (le.occurred_at = ? AND le.id < ?))"); values.push(cursorAt, cursorAt, cursorId); }
  const predicate = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await db.prepare(`SELECT id, type, content, description, occurred_at AS occurredAt, status,
    assignee_id AS assigneeId, due_date AS dueDate, completed_at AS completedAt, completed_by_person_id AS completedByPersonId,
    resolved_at AS resolvedAt, resolved_by_person_id AS resolvedByPersonId, created_at AS createdAt, updated_at AS updatedAt
    FROM log_entries le ${predicate} ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`).bind(...values, limit + 1, offset).all<LogRow>();
  const rows = result.results.slice(0, limit); const last = rows.at(-1);
  return { entries: await hydrateLogs(db, rows), page, hasMore: result.results.length > limit, nextCursor: result.results.length > limit && last ? `${last.occurredAt}|${last.id}` : null };
}

export async function queryAllLogs(db: D1Database, params: URLSearchParams) {
  const entries: LogEntry[] = []; let cursor: string | null = null;
  do { const result = await queryLogPage(db, params, { cursor, limit: 200, page: 1 }); entries.push(...result.entries); cursor = result.nextCursor; } while (cursor);
  return entries;
}
