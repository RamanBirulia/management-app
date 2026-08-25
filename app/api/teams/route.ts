import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import { isUniqueViolation, normalizeHandle, validateHandle } from "../../directory-domain";
import { aliasOwner, getTeamById, hydrateTeams, validateActivePeople } from "./team-storage";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const result = await db.prepare(`SELECT id, name, alias, note, status, created_at AS createdAt,
    updated_at AS updatedAt, archived_at AS archivedAt FROM teams
    ${includeArchived ? "" : "WHERE status = 'active'"} ORDER BY status ASC, name COLLATE NOCASE ASC`).all();
  return Response.json({ teams: await hydrateTeams(db, result.results as never[]) });
}

export async function POST(request: Request) {
  const payload = await request.json() as { name?: string; alias?: string; note?: string; personIds?: string[] };
  const name = payload.name?.trim() ?? ""; const alias = normalizeHandle(payload.alias ?? ""); const note = payload.note?.trim() ?? "";
  if (!name) return Response.json({ error: "Название команды обязательно" }, { status: 400 });
  const aliasError = validateHandle(alias, "alias"); if (aliasError) return Response.json({ error: aliasError }, { status: 400 });
  if (note.length > 10_000) return Response.json({ error: "Note не должен превышать 10 000 символов" }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  if (await aliasOwner(db, alias)) return Response.json({ error: `@${alias} уже используется человеком или командой` }, { status: 409 });
  const personIds = await validateActivePeople(db, payload.personIds ?? []);
  if (!personIds) return Response.json({ error: "Один из участников не найден или находится в архиве" }, { status: 400 });
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.prepare("INSERT INTO teams (id, name, alias, note) VALUES (?, ?, ?, ?)").bind(id, name, alias, note),
      ...personIds.map((personId) => db.prepare("INSERT INTO team_people (team_id, person_id) VALUES (?, ?)").bind(id, personId)),
    ]);
    return Response.json({ team: await getTeamById(db, id) }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `@${alias} уже используется` }, { status: 409 });
    throw error;
  }
}
