import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";
import type { LogPayload } from "../../log-domain";
import { validateLogPayload } from "../../log-domain";
import { queryLogPage } from "./log-query";
import { createCanonicalLog } from "./canonical-log-service";
import { getRequestActor } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  return Response.json(await queryLogPage(db, new URL(request.url).searchParams));
}

export async function POST(request: Request) {
  const payload = (await request.json()) as LogPayload;
  const error = validateLogPayload(payload);
  if (error) return Response.json({ error }, { status: 400 });
  const db = getDirectoryDb(); await ensureDirectorySchema(db);
  try { return Response.json({ entry: await createCanonicalLog(db, { ...payload, type: payload.type as "decision" | "task" | "question", content: payload.content!, occurredAt: payload.occurredAt! }, getRequestActor(request)) }, { status: 201 }); }
  catch (creationError) { return Response.json({ error: creationError instanceof Error ? creationError.message : "Не удалось создать запись" }, { status: 400 }); }
}
