import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";

export async function GET() {
  const db = getDirectoryDb(); await ensureDirectorySchema(db); const setting = await db.prepare("SELECT value FROM app_settings WHERE key = 'default_project_id'").first<{ value: string }>();
  return Response.json({ defaultProjectId: setting?.value ?? null });
}

export async function PATCH(request: Request) {
  const { defaultProjectId } = await request.json() as { defaultProjectId?: string }; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  if (!defaultProjectId || !await db.prepare("SELECT id FROM projects WHERE id = ? AND status = 'active'").bind(defaultProjectId).first()) return Response.json({ error: "Активный проект не найден" }, { status: 400 });
  await db.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('default_project_id', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`).bind(defaultProjectId).run();
  return Response.json({ defaultProjectId });
}
