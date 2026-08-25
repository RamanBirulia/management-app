import type { Team, TeamMember } from "../../directory-domain";

type TeamRow = Omit<Team, "people">;

export async function hydrateTeams(db: D1Database, rows: TeamRow[]): Promise<Team[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const result = await db.prepare(`SELECT tp.team_id AS teamId, p.id, p.display_name AS displayName, p.alias, p.status
    FROM team_people tp JOIN people p ON p.id = tp.person_id
    WHERE tp.team_id IN (${ids.map(() => "?").join(",")})
    ORDER BY p.display_name COLLATE NOCASE`).bind(...ids).all<TeamMember & { teamId: string }>();
  return rows.map((row) => ({ ...row, people: result.results.filter((person) => person.teamId === row.id).map((person) => ({ id: person.id, displayName: person.displayName, alias: person.alias, status: person.status })) }));
}

export async function getTeamById(db: D1Database, id: string) {
  const row = await db.prepare(`SELECT id, name, alias, note, status, created_at AS createdAt,
    updated_at AS updatedAt, archived_at AS archivedAt FROM teams WHERE id = ?`).bind(id).first<TeamRow>();
  if (!row) return null;
  const [team] = await hydrateTeams(db, [row]);
  return team;
}

export async function aliasOwner(db: D1Database, alias: string, except?: { kind: "person" | "team"; id: string }) {
  const person = await db.prepare("SELECT id FROM people WHERE alias = ?").bind(alias).first<{ id: string }>();
  if (person && !(except?.kind === "person" && except.id === person.id)) return "person";
  const team = await db.prepare("SELECT id FROM teams WHERE alias = ?").bind(alias).first<{ id: string }>();
  if (team && !(except?.kind === "team" && except.id === team.id)) return "team";
  return null;
}

export async function validateActivePeople(db: D1Database, personIds: string[]) {
  const ids = [...new Set(personIds)];
  if (!ids.length) return ids;
  const result = await db.prepare(`SELECT id FROM people WHERE status = 'active' AND id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<{ id: string }>();
  return result.results.length === ids.length ? ids : null;
}
