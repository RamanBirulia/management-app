import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import type { LogPayload } from "../../log-domain";
import { validateLogPayload } from "../../log-domain";
import { getLogById, hydrateLogs } from "./log-storage";
import { resolveMentionIds } from "./mention-resolution";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? "1") || 1);
  const limit = 20; const offset = (page - 1) * limit;
  const result = await db.prepare(`SELECT id, type, content, occurred_at AS occurredAt, status,
    assignee_id AS assigneeId, due_date AS dueDate, created_at AS createdAt, updated_at AS updatedAt
    FROM log_entries ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`).bind(limit + 1, offset).all();
  const rows = result.results.slice(0, limit) as never[];
  return Response.json({ entries: await hydrateLogs(db, rows), page, hasMore: result.results.length > limit });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as LogPayload;
  const error = validateLogPayload(payload);
  if (error) return Response.json({ error }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const id = crypto.randomUUID();
  const type = payload.type!; const content = payload.content!.trim(); const occurredAt = new Date(payload.occurredAt!).toISOString();
  const status = type === "task" ? (payload.status ?? "unassigned") : type === "question" ? (payload.status ?? "open") : null;
  const assigneeId = type === "task" ? (payload.assigneeId ?? null) : null;
  const dueDate = type === "task" ? (payload.dueDate ?? null) : null;
  const mentionIds = await resolveMentionIds(db, content, payload.personIds, payload.projectIds);
  const statements = [db.prepare(`INSERT INTO log_entries
    (id, type, content, occurred_at, status, assignee_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, type, content, occurredAt, status, assigneeId, dueDate)];
  for (const personId of mentionIds.personIds) statements.push(db.prepare("INSERT INTO log_people (log_id, person_id) VALUES (?, ?)").bind(id, personId));
  for (const projectId of mentionIds.projectIds) statements.push(db.prepare("INSERT INTO log_projects (log_id, project_id) VALUES (?, ?)").bind(id, projectId));
  for (const source of payload.sources ?? []) statements.push(db.prepare("INSERT INTO sources (id, log_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, source.label.trim(), source.url.trim()));
  await db.batch(statements);
  return Response.json({ entry: await getLogById(db, id) }, { status: 201 });
}
