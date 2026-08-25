import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import { isUniqueViolation, normalizeHandle, validateHandle } from "../../directory-domain";
import { aliasOwner } from "../teams/team-storage";

export async function GET(request: Request) {
  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const query = `SELECT id, display_name AS displayName, alias, note, status,
    created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM people ${includeArchived ? "" : "WHERE status = 'active'"}
    ORDER BY status ASC, display_name COLLATE NOCASE ASC`;
  const result = await db.prepare(query).all();
  return Response.json({ people: result.results });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { displayName?: string; alias?: string };
  const displayName = payload.displayName?.trim() ?? "";
  const alias = normalizeHandle(payload.alias ?? "");
  if (!displayName) return Response.json({ error: "Имя обязательно" }, { status: 400 });
  const aliasError = validateHandle(alias, "alias");
  if (aliasError) return Response.json({ error: aliasError }, { status: 400 });

  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  if (await aliasOwner(db, alias)) return Response.json({ error: `@${alias} уже используется человеком или командой` }, { status: 409 });
  const id = crypto.randomUUID();
  try {
    await db.prepare("INSERT INTO people (id, display_name, alias) VALUES (?, ?, ?)")
      .bind(id, displayName, alias).run();
    const person = await db.prepare(`SELECT id, display_name AS displayName, alias, note, status,
      created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM people WHERE id = ?`).bind(id).first();
    return Response.json({ person }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `@${alias} уже используется` }, { status: 409 });
    throw error;
  }
}
