import type { LogEntry, LogPerson, LogProject, LogSource, LogTeam } from "../../log-domain";

type LogRow = Omit<LogEntry, "people" | "projects" | "teams" | "sources">;

function groupBy<T extends { logId: string }>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) grouped.set(item.logId, [...(grouped.get(item.logId) ?? []), item]);
  return grouped;
}

export async function hydrateLogs(db: D1Database, rows: LogRow[]): Promise<LogEntry[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");
  const [peopleResult, projectsResult, teamsResult, teamPeopleResult, sourcesResult] = await Promise.all([
    db.prepare(`SELECT lp.log_id AS logId, p.id, p.display_name AS displayName, p.alias
      FROM log_people lp JOIN people p ON p.id = lp.person_id
      WHERE lp.log_id IN (${placeholders}) ORDER BY p.display_name COLLATE NOCASE`).bind(...ids).all<LogPerson & { logId: string }>(),
    db.prepare(`SELECT lp.log_id AS logId, p.id, p.name, p.slug
      FROM log_projects lp JOIN projects p ON p.id = lp.project_id
      WHERE lp.log_id IN (${placeholders}) ORDER BY p.name COLLATE NOCASE`).bind(...ids).all<LogProject & { logId: string }>(),
    db.prepare(`SELECT lt.log_id AS logId, t.id, t.name, t.alias
      FROM log_teams lt JOIN teams t ON t.id = lt.team_id
      WHERE lt.log_id IN (${placeholders}) ORDER BY t.name COLLATE NOCASE`).bind(...ids).all<Omit<LogTeam, "people"> & { logId: string }>(),
    db.prepare(`SELECT lt.log_id AS logId, lt.team_id AS teamId, p.id, p.display_name AS displayName, p.alias
      FROM log_teams lt JOIN team_people tp ON tp.team_id = lt.team_id JOIN people p ON p.id = tp.person_id
      WHERE lt.log_id IN (${placeholders}) AND p.status = 'active' ORDER BY p.display_name COLLATE NOCASE`).bind(...ids).all<LogPerson & { logId: string; teamId: string }>(),
    db.prepare(`SELECT log_id AS logId, id, label, url FROM sources
      WHERE log_id IN (${placeholders}) ORDER BY rowid`).bind(...ids).all<LogSource & { logId: string }>(),
  ]);

  const peopleByLog = groupBy(peopleResult.results); const projectsByLog = groupBy(projectsResult.results);
  const teamsByLog = groupBy(teamsResult.results); const teamPeopleByLog = groupBy(teamPeopleResult.results); const sourcesByLog = groupBy(sourcesResult.results);
  return rows.map((row) => ({
    ...row,
    people: (peopleByLog.get(row.id) ?? []).map((item) => ({ id: item.id, displayName: item.displayName, alias: item.alias })),
    projects: (projectsByLog.get(row.id) ?? []).map((item) => ({ id: item.id, name: item.name, slug: item.slug })),
    teams: (teamsByLog.get(row.id) ?? []).map((item) => ({ id: item.id, name: item.name, alias: item.alias, people: (teamPeopleByLog.get(row.id) ?? []).filter((person) => person.teamId === item.id).map((person) => ({ id: person.id, displayName: person.displayName, alias: person.alias })) })),
    sources: (sourcesByLog.get(row.id) ?? []).map((item) => ({ id: item.id, label: item.label, url: item.url })),
  }));
}

export async function getLogById(db: D1Database, id: string) {
  const row = await db.prepare(`SELECT id, type, content, description, occurred_at AS occurredAt, status,
    assignee_id AS assigneeId, due_date AS dueDate, completed_at AS completedAt, completed_by_person_id AS completedByPersonId,
    resolved_at AS resolvedAt, resolved_by_person_id AS resolvedByPersonId, created_at AS createdAt, updated_at AS updatedAt
    FROM log_entries WHERE id = ?`).bind(id).first<LogRow>();
  if (!row) return null;
  const [entry] = await hydrateLogs(db, [row]);
  return entry;
}
