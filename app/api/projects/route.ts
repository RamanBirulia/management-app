import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import { defaultProjectColor, isProjectColor, isUniqueViolation, normalizeHandle, validateHandle } from "../../directory-domain";

export async function GET(request: Request) {
  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const query = `SELECT id, name, slug, color, note, status, created_at AS createdAt,
    updated_at AS updatedAt, archived_at AS archivedAt FROM projects
    ${includeArchived ? "" : "WHERE status = 'active'"}
    ORDER BY status ASC, name COLLATE NOCASE ASC`;
  const result = await db.prepare(query).all();
  return Response.json({ projects: result.results });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { name?: string; slug?: string; color?: unknown };
  const name = payload.name?.trim() ?? "";
  const slug = normalizeHandle(payload.slug ?? "");
  if (!name) return Response.json({ error: "Название обязательно" }, { status: 400 });
  const slugError = validateHandle(slug, "slug");
  if (slugError) return Response.json({ error: slugError }, { status: 400 });

  const db = getDirectoryDb();
  await ensureDirectorySchema(db);
  const id = crypto.randomUUID();
  const color = payload.color === undefined ? defaultProjectColor(id) : payload.color;
  if (!isProjectColor(color)) return Response.json({ error: "Выберите цвет из палитры проектов" }, { status: 400 });
  try {
    await db.prepare("INSERT INTO projects (id, name, slug, color) VALUES (?, ?, ?, ?)").bind(id, name, slug, color).run();
    const project = await db.prepare(`SELECT id, name, slug, color, note, status, created_at AS createdAt,
      updated_at AS updatedAt, archived_at AS archivedAt FROM projects WHERE id = ?`).bind(id).first();
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: `#${slug} уже используется` }, { status: 409 });
    throw error;
  }
}
