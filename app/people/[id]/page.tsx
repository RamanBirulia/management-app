import AppShell from "../../app-shell";
import ContextPageClient from "../../context-page-client";
import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const person = await db.prepare("SELECT display_name AS displayName, alias, note FROM people WHERE id = ?").bind(id).first<{ displayName: string; alias: string; note: string }>();
  const title = person ? `${person.displayName} · Management Log` : "Person · Management Log"; const description = person?.note || (person ? `Управленческий контекст @${person.alias}` : "Контекст человека");
  return { title, description, openGraph: { title, description, images: [] }, twitter: { card: "summary" as const, title, description, images: [] } };
}

export default async function PersonContextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell active="context" eyebrow="Контекст человека" title="История взаимодействий" description="Решения, задачи и вопросы, связанные с человеком."><ContextPageClient kind="person" id={id} /></AppShell>;
}
