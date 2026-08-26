import type { WorkItem, WorkItemProject, WorkItemPayload } from "../../work-item-domain";
import { nextRank } from "../../work-item-domain";

type WorkItemRow = Omit<WorkItem, "projects" | "links">;

export async function hydrateWorkItems(db: D1Database, rows: WorkItemRow[]): Promise<WorkItem[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id); const placeholders = ids.map(() => "?").join(",");
  const [projects, links] = await Promise.all([
    db.prepare(`SELECT wip.work_item_id AS workItemId, p.id, p.name, p.slug FROM work_item_projects wip
      JOIN projects p ON p.id = wip.project_id WHERE wip.work_item_id IN (${placeholders}) ORDER BY p.name COLLATE NOCASE`).bind(...ids).all<WorkItemProject & { workItemId: string }>(),
    db.prepare(`SELECT work_item_id AS workItemId, id, label, url FROM work_item_links
      WHERE work_item_id IN (${placeholders}) ORDER BY rowid`).bind(...ids).all<{ workItemId: string; id: string; label: string; url: string }>(),
  ]);
  return rows.map((row) => ({ ...row,
    projects: projects.results.filter((item) => item.workItemId === row.id).map(({ id, name, slug }) => ({ id, name, slug })),
    links: links.results.filter((item) => item.workItemId === row.id).map(({ id, label, url }) => ({ id, label, url })),
  }));
}

export async function listWorkItems(db: D1Database, projectId?: string | null) {
  const condition = projectId ? "WHERE EXISTS (SELECT 1 FROM work_item_projects wip WHERE wip.work_item_id = wi.id AND wip.project_id = ?)" : "";
  const statement = db.prepare(`SELECT id, title, description, parent_id AS parentId, status, workflow_stage AS workflowStage,
    assignee_id AS assigneeId, due_date AS dueDate, rank, source_log_id AS sourceLogId, created_at AS createdAt, updated_at AS updatedAt
    FROM work_items wi ${condition} ORDER BY rank ASC`);
  const result = projectId ? await statement.bind(projectId).all<WorkItemRow>() : await statement.all<WorkItemRow>();
  return hydrateWorkItems(db, result.results);
}

export async function getWorkItem(db: D1Database, id: string) {
  const result = await db.prepare(`SELECT id, title, description, parent_id AS parentId, status, workflow_stage AS workflowStage,
    assignee_id AS assigneeId, due_date AS dueDate, rank, source_log_id AS sourceLogId, created_at AS createdAt, updated_at AS updatedAt
    FROM work_items WHERE id = ?`).bind(id).first<WorkItemRow>();
  if (!result) return null; const [item] = await hydrateWorkItems(db, [result]); return item;
}

export async function defaultProjectIds(db: D1Database, explicit: string[] = []) {
  if (explicit.length) return [...new Set(explicit)];
  const setting = await db.prepare("SELECT value FROM app_settings WHERE key = 'default_project_id'").first<{ value: string }>();
  if (setting && await db.prepare("SELECT id FROM projects WHERE id = ? AND status = 'active'").bind(setting.value).first()) return [setting.value];
  let project = await db.prepare("SELECT id FROM projects WHERE status = 'active' ORDER BY created_at ASC LIMIT 1").first<{ id: string }>();
  if (!project) {
    const id = crypto.randomUUID(); await db.prepare("INSERT INTO projects (id, name, slug) VALUES (?, 'General', 'general')").bind(id).run(); project = { id };
  }
  await db.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('default_project_id', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`).bind(project.id).run();
  return [project.id];
}

export async function nextWorkItemRank(db: D1Database) {
  const last = await db.prepare("SELECT rank FROM work_items ORDER BY rank DESC LIMIT 1").first<{ rank: string }>();
  return nextRank(last?.rank);
}

export async function createWorkItem(db: D1Database, payload: Required<Pick<WorkItemPayload, "title">> & WorkItemPayload & { sourceLogId?: string | null }) {
  const id = crypto.randomUUID(); const projectIds = await defaultProjectIds(db, payload.projectIds); const rank = await nextWorkItemRank(db);
  const statements = [db.prepare(`INSERT INTO work_items
    (id, title, description, parent_id, status, workflow_stage, assignee_id, due_date, rank, source_log_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, payload.title.trim(), payload.description?.trim() ?? "", payload.parentId ?? null,
      payload.status ?? "active", payload.workflowStage ?? "backlog", payload.assigneeId ?? null, payload.dueDate ?? null, rank, payload.sourceLogId ?? null)];
  for (const projectId of projectIds) statements.push(db.prepare("INSERT INTO work_item_projects (work_item_id, project_id) VALUES (?, ?)").bind(id, projectId));
  for (const link of payload.links ?? []) statements.push(db.prepare("INSERT INTO work_item_links (id, work_item_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, link.label.trim(), link.url.trim()));
  statements.push(db.prepare("INSERT INTO work_item_events (id, work_item_id, kind, payload) VALUES (?, ?, 'created', ?)").bind(crypto.randomUUID(), id, JSON.stringify({ projectIds })));
  await db.batch(statements); return getWorkItem(db, id);
}

export async function syncTaskWorkItem(db: D1Database, logId: string, payload: { title: string; description: string; status: string | null; assigneeId: string | null; dueDate: string | null; projectIds: string[]; links: { label: string; url: string }[] }) {
  const existing = await db.prepare("SELECT id FROM work_items WHERE source_log_id = ?").bind(logId).first<{ id: string }>();
  const status = payload.status === "done" ? "done" : payload.status === "cancelled" ? "cancelled" : "active";
  if (!existing) return createWorkItem(db, { title: payload.title, description: payload.description, status, assigneeId: payload.assigneeId, dueDate: payload.dueDate, projectIds: payload.projectIds, links: payload.links, sourceLogId: logId });
  const projectIds = await defaultProjectIds(db, payload.projectIds);
  const statements = [db.prepare(`UPDATE work_items SET title = ?, description = ?, status = ?, assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(payload.title, payload.description, status, payload.assigneeId, payload.dueDate, existing.id),
    db.prepare("DELETE FROM work_item_projects WHERE work_item_id = ?").bind(existing.id), db.prepare("DELETE FROM work_item_links WHERE work_item_id = ?").bind(existing.id)];
  for (const projectId of projectIds) statements.push(db.prepare("INSERT INTO work_item_projects (work_item_id, project_id) VALUES (?, ?)").bind(existing.id, projectId));
  for (const link of payload.links) statements.push(db.prepare("INSERT INTO work_item_links (id, work_item_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), existing.id, link.label.trim(), link.url.trim()));
  statements.push(db.prepare("INSERT INTO work_item_events (id, work_item_id, kind, payload) VALUES (?, ?, 'synced_from_log', ?)").bind(crypto.randomUUID(), existing.id, JSON.stringify({ logId })));
  await db.batch(statements); return getWorkItem(db, existing.id);
}

export async function detachTaskWorkItem(db: D1Database, logId: string) {
  const existing = await db.prepare("SELECT id FROM work_items WHERE source_log_id = ?").bind(logId).first<{ id: string }>();
  if (!existing) return;
  await db.batch([
    db.prepare("UPDATE work_items SET source_log_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(existing.id),
    db.prepare("INSERT INTO work_item_events (id, work_item_id, kind, payload) VALUES (?, ?, 'detached_from_log', ?)").bind(crypto.randomUUID(), existing.id, JSON.stringify({ logId })),
  ]);
}
