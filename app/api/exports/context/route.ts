import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { describeExportFilters, formatContextExport } from "../../../context-export";
import { queryAllLogs } from "../../logs/log-query";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const params = new URL(request.url).searchParams; params.delete("page"); params.delete("limit"); params.delete("cursor");
  const entries = await queryAllLogs(db, params);
  if (!entries.length) return Response.json({ error: "В текущей выборке нет записей для экспорта" }, { status: 400 });
  const [people, projects, teams] = await Promise.all([
    db.prepare("SELECT id, '@' || alias || ' (' || display_name || ')' AS label FROM people").all<{ id: string; label: string }>(),
    db.prepare("SELECT id, '#' || slug || ' (' || name || ')' AS label FROM projects").all<{ id: string; label: string }>(),
    db.prepare("SELECT id, '@' || alias || ' (' || name || ')' AS label FROM teams").all<{ id: string; label: string }>(),
  ]);
  const names = { people: new Map(people.results.map((item) => [item.id, item.label])), projects: new Map(projects.results.map((item) => [item.id, item.label])), teams: new Map(teams.results.map((item) => [item.id, item.label])) };
  const exportedAt = new Date().toISOString();
  return Response.json({ count: entries.length, text: formatContextExport(entries, { exportedAt, filters: describeExportFilters(params, names), names }), filename: `management-log-context-${exportedAt.slice(0, 10)}.txt` });
}
