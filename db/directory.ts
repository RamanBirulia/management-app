import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

export function getDirectoryDb(): D1Database {
  const runtimeEnv = env as typeof env & { DB?: D1Database };
  if (!runtimeEnv.DB) {
    throw new Error("D1 binding `DB` is unavailable.");
  }
  return runtimeEnv.DB;
}

export function ensureDirectorySchema(db = getDirectoryDb()): Promise<void> {
  schemaReady ??= initializeSchema(db).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function initializeSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      alias TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_people_alias_unique ON people(alias)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_unique ON projects(slug)"),
  ]);

  const [personColumns, projectColumns] = await Promise.all([
    db.prepare("PRAGMA table_info(people)").all<{ name: string }>(),
    db.prepare("PRAGMA table_info(projects)").all<{ name: string }>(),
  ]);
  if (!personColumns.results.some((column) => column.name === "note")) {
    await db.prepare("ALTER TABLE people ADD COLUMN note TEXT NOT NULL DEFAULT ''").run();
  }
  if (!projectColumns.results.some((column) => column.name === "note")) {
    await db.prepare("ALTER TABLE projects ADD COLUMN note TEXT NOT NULL DEFAULT ''").run();
  }

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS log_entries (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('decision', 'task', 'question')),
      content TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      status TEXT,
      assignee_id TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_log_entries_occurred_at ON log_entries(occurred_at DESC, id DESC)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS log_people (
      log_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      PRIMARY KEY (log_id, person_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS log_projects (
      log_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      PRIMARY KEY (log_id, project_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY NOT NULL,
      log_id TEXT NOT NULL,
      label TEXT NOT NULL,
      url TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_log_people_person_id ON log_people(person_id, log_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_log_projects_project_id ON log_projects(project_id, log_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sources_log_id ON sources(log_id)"),
  ]);
}
