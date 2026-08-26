"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { Person, Project } from "./directory-domain";
import LogsClient from "./logs-client";

export default function ContextPageClient({ kind, id }: { kind: "person" | "project"; id: string }) {
  const [record, setRecord] = useState<Person | Project | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const frame = requestAnimationFrame(() => { void fetch(`/api/${kind === "person" ? "people" : "projects"}/${id}`).then(async (response) => { const result = await response.json() as { error?: string; person?: Person; project?: Project }; if (!response.ok) throw new Error(result.error); setRecord(kind === "person" ? result.person ?? null : result.project ?? null); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить контекст")); }); return () => cancelAnimationFrame(frame); }, [id, kind]);
  if (error) return <div className="state-card error-state"><strong>Контекст недоступен</strong><p>{error}</p></div>;
  if (!record) return <div className="state-card">Загружаем контекст…</div>;
  const isPerson = "displayName" in record; const name = isPerson ? record.displayName : record.name; const handle = isPerson ? `@${record.alias}` : `#${record.slug}`;
  return <><section className="context-hero"><div className={`context-avatar ${isPerson ? "person" : "project"}`}>{name.slice(0,2).toUpperCase()}</div><div><p className="eyebrow">{isPerson ? "Person context" : "Project context"}</p><h2>{name}</h2><span className="handle">{handle}</span></div>{isPerson ? record.status === "archived" && <span className="archived-label">архив</span> : <div className="context-actions">{record.status === "archived" && <span className="archived-label">архив</span>}<Link className="secondary-button" href={`/planning?project=${record.id}`}>Открыть backlog</Link></div>}{record.note && <div className="context-note"><ReactMarkdown>{record.note}</ReactMarkdown></div>}</section><LogsClient context={{ kind, id }} showComposer={false} /></>;
}
