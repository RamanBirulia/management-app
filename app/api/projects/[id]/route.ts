import { ensureDirectorySchema, getDirectoryDb } from "../../../../db/directory";
import { isUniqueViolation, normalizeHandle, validateHandle } from "../../../directory-domain";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const project = await db.prepare(`SELECT id, name, slug, note, status, created_at AS createdAt,
    updated_at AS updatedAt, archived_at AS archivedAt FROM projects WHERE id = ?`).bind(id).first();
  return project ? Response.json({ project }) : Response.json({ error: "Проект не найден" }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json()) as { name?: string; slug?: string; note?: string; status?: "active" | "archived" };
  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  const current = await db.prepare("SELECT id, name, slug, note, status FROM projects WHERE id = ?").bind(id).first();
  if (!current) return Response.json({ error: "Проект не найден" }, { status: 404 });

  const name = payload.name?.trim() ?? String(current.name);
  const slug = payload.slug === undefined ? String(current.slug) : normalizeHandle(payload.slug);
  const note = payload.note === undefined ? String(current.note ?? "") : payload.note.trim();
  const status = payload.status ?? String(current.status);
  if (!name) return Response.json({ error: "Название обязательно" }, { status: 400 });
  const slugError = validateHandle(slug, "slug");
  if (slugError) return Response.json({ error: slugError }, { status: 400 });
  if (status !== "active" && status !== "archived") return Response.json({ error: "Некорректный статус" }, { status: 400 });
  if (note.length > 10_000) return Response.json({ error: "Note не должен превышать 10 000 символов" }, { status: 400 });

  try {
    await db.prepare(`UPDATE projects SET name = ?, slug = ?, note = ?, status = ?,
      archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(name, slug, note, status, status, id).run();
    const project = await db.prepare(`SELECT id, name, slug, note, status, created_at AS createdAt,
      updated_at AS updatedAt, archived_at AS archivedAt FROM projects WHERE id = ?`).bind(id).first();
    return Response.json({ project });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `#${slug} уже используется` }, { status: 409 });
    throw error;
  }
}
