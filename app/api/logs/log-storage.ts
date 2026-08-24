import type { LogEntry, LogPerson, LogProject, LogSource } from "../../log-domain";

type LogRow = Omit<LogEntry, "people" | "projects" | "sources">;

export async function hydrateLogs(db: D1Database, rows: LogRow[]): Promise<LogEntry[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");
  const [peopleResult, projectsResult, sourcesResult] = await Promise.all([
    db.prepare(`SELECT lp.log_id AS logId, p.id, p.display_name AS displayName, p.alias
      FROM log_people lp JOIN people p ON p.id = lp.person_id
      WHERE lp.log_id IN (${placeholders}) ORDER BY p.display_name COLLATE NOCASE`).bind(...ids).all<LogPerson & { logId: string }>(),
    db.prepare(`SELECT lp.log_id AS logId, p.id, p.name, p.slug
      FROM log_projects lp JOIN projects p ON p.id = lp.project_id
      WHERE lp.log_id IN (${placeholders}) ORDER BY p.name COLLATE NOCASE`).bind(...ids).all<LogProject & { logId: string }>(),
    db.prepare(`SELECT log_id AS logId, id, label, url FROM sources
      WHERE log_id IN (${placeholders}) ORDER BY rowid`).bind(...ids).all<LogSource & { logId: string }>(),
  ]);

  return rows.map((row) => ({
    ...row,
    people: peopleResult.results.filter((item) => item.logId === row.id).map((item) => ({ id: item.id, displayName: item.displayName, alias: item.alias })),
    projects: projectsResult.results.filter((item) => item.logId === row.id).map((item) => ({ id: item.id, name: item.name, slug: item.slug })),
    sources: sourcesResult.results.filter((item) => item.logId === row.id).map((item) => ({ id: item.id, label: item.label, url: item.url })),
  }));
}

export async function getLogById(db: D1Database, id: string) {
  const row = await db.prepare(`SELECT id, type, content, description, occurred_at AS occurredAt, status,
    assignee_id AS assigneeId, due_date AS dueDate, created_at AS createdAt, updated_at AS updatedAt
    FROM log_entries WHERE id = ?`).bind(id).first<LogRow>();
  if (!row) return null;
  const [entry] = await hydrateLogs(db, [row]);
  return entry;
}
