import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import { encodeRank } from "../../work-item-domain";
import { inspectRanks, type PlanningIssue } from "../../planning-domain";

export async function GET() {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const [items, emptyScopes, overlaps, readiness] = await Promise.all([
    db.prepare("SELECT id, rank FROM work_items ORDER BY rank").all<{ id: string; rank: string }>(),
    db.prepare(`SELECT ps.id, t.name FROM planning_scopes ps JOIN teams t ON t.id = ps.team_id LEFT JOIN planning_scope_projects psp ON psp.scope_id = ps.id GROUP BY ps.id HAVING COUNT(psp.project_id) = 0`).all<{ id: string; name: string }>(),
    db.prepare(`SELECT p.id, p.name, COUNT(DISTINCT psp.scope_id) AS scopeCount FROM projects p JOIN planning_scope_projects psp ON psp.project_id = p.id GROUP BY p.id HAVING COUNT(DISTINCT psp.scope_id) > 1`).all<{ id: string; name: string; scopeCount: number }>(),
    db.prepare(`SELECT id, title FROM work_items WHERE status = 'active' AND workflow_stage IN ('design','pbr','engineering') AND (design_owner_id IS NULL OR design_draft_url IS NULL OR design_draft_url = '')`).all<{ id: string; title: string }>(),
  ]);
  const issues: PlanningIssue[] = inspectRanks(items.results);
  for (const scope of emptyScopes.results) issues.push({ code: "empty_scope", message: `Scope команды «${scope.name}» не содержит проектов.` });
  for (const project of overlaps.results) issues.push({ code: "scope_overlap", projectId: project.id, message: `Проект «${project.name}» входит сразу в ${project.scopeCount} planning scopes.` });
  for (const item of readiness.results) issues.push({ code: "design_readiness", itemId: item.id, message: `Для «${item.title}» не заполнены design owner и draft URL.` });
  return Response.json({ healthy: issues.length === 0, issues });
}

export async function POST() {
  const db = getDirectoryDb(); await ensureDirectorySchema(db); const items = await db.prepare("SELECT id FROM work_items ORDER BY rank, created_at, id").all<{ id: string }>();
  const temporary = items.results.map((item) => db.prepare("UPDATE work_items SET rank = ? WHERE id = ?").bind(`tmp-${crypto.randomUUID()}`, item.id));
  const final = items.results.map((item, index) => db.prepare("UPDATE work_items SET rank = ? WHERE id = ?").bind(encodeRank(BigInt(index + 1) * BigInt(1024)), item.id));
  if (temporary.length) await db.batch([...temporary, ...final]); return Response.json({ repaired: items.results.length });
}
