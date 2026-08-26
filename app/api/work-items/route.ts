import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import type { WorkItemPayload } from "../../work-item-domain";
import { validateWorkItemPayload } from "../../work-item-domain";
import { createWorkItem, listWorkItems } from "./work-item-storage";
import { getRequestActor } from "../../chatgpt-auth";
import { retryTaskSync } from "../logs/canonical-log-service";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db); await retryTaskSync(db); const projectId = new URL(request.url).searchParams.get("project");
  return Response.json({ items: await listWorkItems(db, projectId) });
}

export async function POST(request: Request) {
  const payload = await request.json() as WorkItemPayload; const error = validateWorkItemPayload(payload);
  if (error) return Response.json({ error }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  if (payload.parentId && !await db.prepare("SELECT id FROM work_items WHERE id = ?").bind(payload.parentId).first()) return Response.json({ error: "Родительская задача не найдена" }, { status: 400 });
  const item = await createWorkItem(db, { ...payload, title: payload.title!, actorId: getRequestActor(request) }); return Response.json({ item }, { status: 201 });
}
