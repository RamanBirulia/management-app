import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { isUniqueViolation, normalizeHandle, validateHandle } from "../../../directory-domain";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json()) as { displayName?: string; alias?: string; status?: "active" | "archived" };
  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  const current = await db.prepare("SELECT id, display_name, alias, status FROM people WHERE id = ?").bind(id).first();
  if (!current) return Response.json({ error: "Человек не найден" }, { status: 404 });

  const displayName = payload.displayName?.trim() ?? String(current.display_name);
  const alias = payload.alias === undefined ? String(current.alias) : normalizeHandle(payload.alias);
  const status = payload.status ?? String(current.status);
  if (!displayName) return Response.json({ error: "Имя обязательно" }, { status: 400 });
  const aliasError = validateHandle(alias, "alias");
  if (aliasError) return Response.json({ error: aliasError }, { status: 400 });
  if (status !== "active" && status !== "archived") return Response.json({ error: "Некорректный статус" }, { status: 400 });

  try {
    await db.prepare(`UPDATE people SET display_name = ?, alias = ?, status = ?,
      archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(displayName, alias, status, status, id).run();
    const person = await db.prepare(`SELECT id, display_name AS displayName, alias, status,
      created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM people WHERE id = ?`).bind(id).first();
    return Response.json({ person });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `@${alias} уже используется` }, { status: 409 });
    throw error;
  }
}
