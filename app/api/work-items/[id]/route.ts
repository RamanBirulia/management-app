import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import type { WorkItemPayload } from "../../../work-item-domain";
import { encodeRank, validateWorkItemPayload, wouldCreateCycle } from "../../../work-item-domain";
import { defaultProjectIds, getWorkItem, listWorkItems } from "../work-item-storage";
import { getRequestActor } from "../../../chatgpt-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const payload = await request.json() as WorkItemPayload; const error = validateWorkItemPayload(payload, true);
  if (error) return Response.json({ error }, { status: 400 }); const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const current = await getWorkItem(db, id); if (!current) return Response.json({ error: "Задача не найдена" }, { status: 404 });
  const all = await listWorkItems(db); const parentId = payload.parentId === undefined ? current.parentId : payload.parentId;
  if (parentId && !all.some((item) => item.id === parentId)) return Response.json({ error: "Родительская задача не найдена" }, { status: 400 });
  if (wouldCreateCycle(all, id, parentId ?? null)) return Response.json({ error: "Нельзя переместить задачу под собственного потомка" }, { status: 409 });
  const projectIds = payload.projectIds === undefined ? current.projects.map((project) => project.id) : await defaultProjectIds(db, payload.projectIds);
  const ordered = all.filter((item) => item.id !== id); const target = payload.beforeId === undefined ? -1 : payload.beforeId === null ? ordered.length : ordered.findIndex((item) => item.id === payload.beforeId);
  if (payload.beforeId !== undefined && target < 0) return Response.json({ error: "Позиция для перемещения не найдена" }, { status: 400 });
  if (target >= 0) ordered.splice(target, 0, current);
  const statements = [db.prepare(`UPDATE work_items SET title = ?, description = ?, parent_id = ?, status = ?, workflow_stage = ?, assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(payload.title?.trim() ?? current.title, payload.description?.trim() ?? current.description, parentId ?? null, payload.status ?? current.status, payload.workflowStage ?? current.workflowStage, payload.assigneeId === undefined ? current.assigneeId : payload.assigneeId, payload.dueDate === undefined ? current.dueDate : payload.dueDate, id),
    db.prepare("DELETE FROM work_item_projects WHERE work_item_id = ?").bind(id)];
  for (const projectId of projectIds) statements.push(db.prepare("INSERT INTO work_item_projects (work_item_id, project_id) VALUES (?, ?)").bind(id, projectId));
  if (payload.links !== undefined) { statements.push(db.prepare("DELETE FROM work_item_links WHERE work_item_id = ?").bind(id)); for (const link of payload.links) statements.push(db.prepare("INSERT INTO work_item_links (id, work_item_id, label, url) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, link.label.trim(), link.url.trim())); }
  if (target >= 0) {
    for (let index = 0; index < ordered.length; index++) statements.push(db.prepare("UPDATE work_items SET rank = ? WHERE id = ?").bind(`tmp-${crypto.randomUUID()}`, ordered[index].id));
    for (let index = 0; index < ordered.length; index++) statements.push(db.prepare("UPDATE work_items SET rank = ? WHERE id = ?").bind(encodeRank(BigInt(index + 1) * BigInt(1024)), ordered[index].id));
  }
  statements.push(db.prepare("INSERT INTO work_item_events (id, work_item_id, kind, payload, actor_id) VALUES (?, ?, 'updated', ?, ?)").bind(crypto.randomUUID(), id, JSON.stringify(payload), getRequestActor(request)));
  await db.batch(statements); return Response.json({ item: await getWorkItem(db, id) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  if (await db.prepare("SELECT id FROM work_items WHERE parent_id = ? LIMIT 1").bind(id).first()) return Response.json({ error: "Сначала переместите или удалите дочерние задачи" }, { status: 409 });
  const result = await db.batch([db.prepare("DELETE FROM work_item_projects WHERE work_item_id = ?").bind(id), db.prepare("DELETE FROM work_item_links WHERE work_item_id = ?").bind(id), db.prepare("DELETE FROM work_item_events WHERE work_item_id = ?").bind(id), db.prepare("DELETE FROM work_items WHERE id = ?").bind(id)]);
  return Response.json({ deleted: result.at(-1)?.meta.changes === 1 });
}
