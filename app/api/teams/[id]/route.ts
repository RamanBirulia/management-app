import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { isUniqueViolation, normalizeHandle, validateHandle } from "../../../directory-domain";
import { aliasOwner, getTeamById, validateActivePeople } from "../team-storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const team = await getTeamById(db, id);
  return team ? Response.json({ team }) : Response.json({ error: "Команда не найдена" }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const payload = await request.json() as { name?: string; alias?: string; note?: string; status?: "active" | "archived"; personIds?: string[] };
  const db = getDirectoryDb(); await ensureDirectorySchema(db); const current = await getTeamById(db, id);
  if (!current) return Response.json({ error: "Команда не найдена" }, { status: 404 });
  const name = payload.name?.trim() ?? current.name; const alias = payload.alias === undefined ? current.alias : normalizeHandle(payload.alias);
  const note = payload.note === undefined ? current.note : payload.note.trim(); const status = payload.status ?? current.status;
  if (!name) return Response.json({ error: "Название команды обязательно" }, { status: 400 });
  const aliasError = validateHandle(alias, "alias"); if (aliasError) return Response.json({ error: aliasError }, { status: 400 });
  if (note.length > 10_000) return Response.json({ error: "Note не должен превышать 10 000 символов" }, { status: 400 });
  if (status !== "active" && status !== "archived") return Response.json({ error: "Некорректный статус" }, { status: 400 });
  if (await aliasOwner(db, alias, { kind: "team", id })) return Response.json({ error: `@${alias} уже используется человеком или командой` }, { status: 409 });
  const personIds = payload.personIds === undefined ? null : await validateActivePeople(db, payload.personIds);
  if (payload.personIds !== undefined && !personIds) return Response.json({ error: "Один из участников не найден или находится в архиве" }, { status: 400 });
  try {
    const statements = [db.prepare(`UPDATE teams SET name = ?, alias = ?, note = ?, status = ?,
      archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(name, alias, note, status, status, id)];
    if (personIds) {
      statements.push(db.prepare("DELETE FROM team_people WHERE team_id = ?").bind(id));
      for (const personId of personIds) statements.push(db.prepare("INSERT INTO team_people (team_id, person_id) VALUES (?, ?)").bind(id, personId));
    }
    await db.batch(statements); return Response.json({ team: await getTeamById(db, id) });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `@${alias} уже используется` }, { status: 409 });
    throw error;
  }
}
