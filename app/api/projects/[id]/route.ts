import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { isUniqueViolation, normalizeHandle, validateHandle } from "../../../directory-domain";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json()) as { name?: string; slug?: string; status?: "active" | "archived" };
  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  const current = await db.prepare("SELECT id, name, slug, status FROM projects WHERE id = ?").bind(id).first();
  if (!current) return Response.json({ error: "Проект не найден" }, { status: 404 });

  const name = payload.name?.trim() ?? String(current.name);
  const slug = payload.slug === undefined ? String(current.slug) : normalizeHandle(payload.slug);
  const status = payload.status ?? String(current.status);
  if (!name) return Response.json({ error: "Название обязательно" }, { status: 400 });
  const slugError = validateHandle(slug, "slug");
  if (slugError) return Response.json({ error: slugError }, { status: 400 });
  if (status !== "active" && status !== "archived") return Response.json({ error: "Некорректный статус" }, { status: 400 });

  try {
    await db.prepare(`UPDATE projects SET name = ?, slug = ?, status = ?,
      archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(name, slug, status, status, id).run();
    const project = await db.prepare(`SELECT id, name, slug, status, created_at AS createdAt,
      updated_at AS updatedAt, archived_at AS archivedAt FROM projects WHERE id = ?`).bind(id).first();
    return Response.json({ project });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `#${slug} уже используется` }, { status: 409 });
    throw error;
  }
}
