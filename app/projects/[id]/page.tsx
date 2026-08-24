import AppShell from "../../app-shell";
import ContextPageClient from "../../context-page-client";
import { ensureDirectorySchema, getDirectoryDb } from "../../../db/directory";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const db = getDirectoryDb(); await ensureDirectorySchema(db);
  const project = await db.prepare("SELECT name, slug, note FROM projects WHERE id = ?").bind(id).first<{ name: string; slug: string; note: string }>();
  const title = project ? `${project.name} · Management Log` : "Project · Management Log"; const description = project?.note || (project ? `Управленческий контекст #${project.slug}` : "Контекст проекта");
  return { title, description, openGraph: { title, description, images: [] }, twitter: { card: "summary" as const, title, description, images: [] } };
}

export default async function ProjectContextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell active="context" eyebrow="Контекст проекта" title="Журнал проекта" description="Решения, задачи, вопросы и источники по проекту."><ContextPageClient kind="project" id={id} /></AppShell>;
}
