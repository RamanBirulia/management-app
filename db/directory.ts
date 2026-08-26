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
  await db.prepare("SELECT id FROM import_batches LIMIT 1").first();
}
