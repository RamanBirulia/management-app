import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import type { PlanningScope } from "../../planning-domain";

async function listScopes(db: D1Database): Promise<PlanningScope[]> {
  const [scopes, projects] = await Promise.all([
    db.prepare(`SELECT ps.id, ps.team_id AS teamId, t.name AS teamName, t.alias AS teamAlias FROM planning_scopes ps JOIN teams t ON t.id = ps.team_id ORDER BY t.name COLLATE NOCASE`).all<Omit<PlanningScope, "projects">>(),
    db.prepare(`SELECT psp.scope_id AS scopeId, p.id, p.name, p.slug, p.color, p.note, p.status, p.created_at AS createdAt, p.updated_at AS updatedAt, p.archived_at AS archivedAt FROM planning_scope_projects psp JOIN projects p ON p.id = psp.project_id ORDER BY p.name COLLATE NOCASE`).all<PlanningScope["projects"][number] & { scopeId: string }>(),
  ]);
  return scopes.results.map((scope) => ({ ...scope, projects: projects.results.filter((project) => project.scopeId === scope.id).map((project) => ({ id: project.id, name: project.name, slug: project.slug, color: project.color, note: project.note, status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt, archivedAt: project.archivedAt })) }));
}

export async function GET() { const db = getDirectoryDb(); await ensureDirectorySchema(db); return Response.json({ scopes: await listScopes(db) }); }

export async function PUT(request: Request) {
  const payload = await request.json() as { teamId?: string; projectIds?: string[] }; const teamId = payload.teamId?.trim(); const projectIds = [...new Set((payload.projectIds ?? []).filter((id): id is string => typeof id === "string" && Boolean(id)))];
  if (!teamId) return Response.json({ error: "Выберите команду" }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  if (!await db.prepare("SELECT id FROM teams WHERE id = ? AND status = 'active'").bind(teamId).first()) return Response.json({ error: "Команда не найдена" }, { status: 404 });
  if (projectIds.length) { const placeholders = projectIds.map(() => "?").join(","); const found = await db.prepare(`SELECT id FROM projects WHERE status = 'active' AND id IN (${placeholders})`).bind(...projectIds).all(); if (found.results.length !== projectIds.length) return Response.json({ error: "Один из проектов недоступен" }, { status: 400 }); }
  let scope = await db.prepare("SELECT id FROM planning_scopes WHERE team_id = ?").bind(teamId).first<{ id: string }>();
  if (!scope) { scope = { id: crypto.randomUUID() }; await db.prepare("INSERT INTO planning_scopes (id, team_id) VALUES (?, ?)").bind(scope.id, teamId).run(); }
  const statements = [db.prepare("DELETE FROM planning_scope_projects WHERE scope_id = ?").bind(scope.id), db.prepare("UPDATE planning_scopes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(scope.id)];
  for (const projectId of projectIds) statements.push(db.prepare("INSERT INTO planning_scope_projects (scope_id, project_id) VALUES (?, ?)").bind(scope.id, projectId));
  await db.batch(statements); return Response.json({ scopes: await listScopes(db) });
}
