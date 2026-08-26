import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import type { LogPayload } from "../../log-domain";
import { validateLogPayload } from "../../log-domain";
import { hydrateLogs } from "./log-storage";
import { parseLogFilters } from "./log-filters";
import { createCanonicalLog } from "./canonical-log-service";
import { getRequestActor } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const params = new URL(request.url).searchParams; const filters = parseLogFilters(params);
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = Math.min(200, Math.max(1, Number(params.get("limit") ?? "20") || 20)); const cursor = params.get("cursor"); const [cursorAt, cursorId] = cursor?.split("|") ?? []; const offset = cursor ? 0 : (page - 1) * limit;
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
    FROM log_entries le ${predicate} ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`).bind(...values, limit + 1, offset).all();
  const rows = result.results.slice(0, limit) as never[];
  const last = rows.at(-1) as { occurredAt?: string; id?: string } | undefined;
  return Response.json({ entries: await hydrateLogs(db, rows), page, hasMore: result.results.length > limit, nextCursor: result.results.length > limit && last ? `${last.occurredAt}|${last.id}` : null });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as LogPayload;
  const error = validateLogPayload(payload);
  if (error) return Response.json({ error }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  try { return Response.json({ entry: await createCanonicalLog(db, { ...payload, type: payload.type as "decision" | "task" | "question", content: payload.content!, occurredAt: payload.occurredAt! }, getRequestActor(request)) }, { status: 201 }); }
  catch (creationError) { return Response.json({ error: creationError instanceof Error ? creationError.message : "Не удалось создать запись" }, { status: 400 }); }
}
