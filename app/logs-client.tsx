"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Person, Project } from "./directory-domain";
import type { LogEntry, LogSource, LogType } from "./log-domain";

type SourceDraft = LogSource & { key: string };
type Suggestion = { kind: "person" | "project"; id: string; name: string; handle: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Не удалось выполнить запрос");
  return data;
}

function localDateTime(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function typeLabel(type: LogType) { return type === "decision" ? "Decision" : type === "task" ? "Task" : "Question"; }

export default function LogsClient() {
  const [people, setPeople] = useState<Person[]>([]); const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]); const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); const [type, setType] = useState<LogType>("decision");
  const [content, setContent] = useState(""); const [occurredAt, setOccurredAt] = useState(localDateTime());
  const [status, setStatus] = useState("open"); const [assigneeId, setAssigneeId] = useState(""); const [dueDate, setDueDate] = useState("");
  const [sources, setSources] = useState<SourceDraft[]>([]); const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, append = false) => {
    setLoading(true); setError(null);
    try {
      const [logsResult, peopleResult, projectsResult] = await Promise.all([
        api<{ entries: LogEntry[]; hasMore: boolean }>(`/api/logs?page=${nextPage}`),
        api<{ people: Person[] }>("/api/people"), api<{ projects: Project[] }>("/api/projects"),
      ]);
      setEntries((current) => append ? [...current, ...logsResult.entries] : logsResult.entries);
      setPeople(peopleResult.people); setProjects(projectsResult.projects); setPage(nextPage); setHasMore(logsResult.hasMore);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить журнал"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const frame = requestAnimationFrame(() => { void load(); }); return () => cancelAnimationFrame(frame); }, [load]);

  const mentionMatch = content.match(/(?:^|\s)([@#])([a-zA-Z0-9._-]*)$/);
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!mentionMatch) return [];
    const query = mentionMatch[2].toLowerCase();
    return mentionMatch[1] === "@"
      ? people.filter((person) => person.alias.includes(query)).slice(0, 6).map((person) => ({ kind: "person", id: person.id, name: person.displayName, handle: person.alias }))
      : projects.filter((project) => project.slug.includes(query)).slice(0, 6).map((project) => ({ kind: "project", id: project.id, name: project.name, handle: project.slug }));
  }, [mentionMatch, people, projects]);

  function chooseSuggestion(suggestion: Suggestion) {
    if (!mentionMatch) return;
    const start = content.length - mentionMatch[2].length - 1;
    setContent(`${content.slice(0, start)}${suggestion.kind === "person" ? "@" : "#"}${suggestion.handle} `);
    setSuggestionIndex(0);
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setSuggestionIndex((index) => (index + 1) % suggestions.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length); }
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); chooseSuggestion(suggestions[suggestionIndex] ?? suggestions[0]); }
    if (event.key === "Escape") setContent(`${content} `);
  }

  function linkedIds() {
    const tokens = new Set(content.split(/\s+/).map((token) => token.replace(/[,:;!?]+$/g, "")));
    return {
      personIds: people.filter((person) => tokens.has(`@${person.alias}`)).map((person) => person.id),
      projectIds: projects.filter((project) => tokens.has(`#${project.slug}`)).map((project) => project.id),
    };
  }

  function resetComposer() {
    setEditingId(null); setType("decision"); setContent(""); setOccurredAt(localDateTime()); setStatus("open"); setAssigneeId(""); setDueDate(""); setSources([]); setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError(null);
    const ids = linkedIds();
    const payload = { type, content, occurredAt, status: type === "task" ? status : type === "question" ? status : null, assigneeId: type === "task" ? assigneeId || null : null, dueDate: type === "task" ? dueDate || null : null, ...ids, sources: sources.filter((source) => source.label.trim() || source.url.trim()).map(({ label, url }) => ({ label, url })) };
    try {
      await api(editingId ? `/api/logs/${editingId}` : "/api/logs", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      resetComposer(); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить. Черновик оставлен в composer."); }
    finally { setSaving(false); }
  }

  function edit(entry: LogEntry) {
    setMenuId(null);
    setEditingId(entry.id); setType(entry.type); setContent(entry.content); setOccurredAt(localDateTime(new Date(entry.occurredAt)));
    setStatus(entry.status ?? (entry.type === "task" ? "unassigned" : "open")); setAssigneeId(entry.assigneeId ?? ""); setDueDate(entry.dueDate ?? "");
    setSources(entry.sources.map((source) => ({ ...source, key: source.id ?? crypto.randomUUID() })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(entry: LogEntry) {
    setMenuId(null);
    if (!window.confirm("Удалить запись? Она исчезнет из всех будущих представлений.")) return;
    try { await api(`/api/logs/${entry.id}`, { method: "DELETE" }); await load(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить запись"); }
  }

  const assigneeName = (id: string | null) => people.find((person) => person.id === id)?.displayName;

  return <>
    <section className="composer-card">
      <div className="composer-heading"><div><p className="eyebrow">{editingId ? "Редактирование" : "Новая запись"}</p><h2>{editingId ? "Обновить контекст" : "Зафиксировать событие"}</h2></div>{editingId && <button className="secondary-button" type="button" onClick={resetComposer}>Отмена</button>}</div>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError(null)} aria-label="Закрыть">×</button></div>}
      <form onSubmit={save}>
        <div className="composer-row"><label>Тип<select value={type} onChange={(event) => { const next = event.target.value as LogType; setType(next); setStatus(next === "task" ? "unassigned" : "open"); }}><option value="decision">Decision</option><option value="task">Task</option><option value="question">Question</option></select></label><label>Когда<input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required /></label></div>
        <label>Текст <span className="field-hint">Введите @ для человека или # для проекта</span><div className="composer-input-wrap"><textarea className="composer-text" value={content} onChange={(event) => { setContent(event.target.value); setSuggestionIndex(0); }} onKeyDown={handleComposerKey} maxLength={5000} required rows={4} placeholder="Решили перенести rollout на пятницу @alex #approvals" />{suggestions.length > 0 && <div className="mention-menu" role="listbox">{suggestions.map((suggestion, index) => <button type="button" role="option" aria-selected={index === suggestionIndex} className={index === suggestionIndex ? "selected" : ""} key={`${suggestion.kind}-${suggestion.id}`} onMouseDown={(event) => { event.preventDefault(); chooseSuggestion(suggestion); }}><span>{suggestion.kind === "person" ? "@" : "#"}{suggestion.handle}</span><small>{suggestion.name}</small></button>)}</div>}</div></label>
        {type === "task" && <div className="composer-row three"><label>Статус<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="unassigned">Unassigned</option><option value="open">Open</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></label><label>Assignee<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Не назначен</option>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>}
        {type === "question" && <label className="short-field">Статус<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option></select></label>}
        <div className="sources-editor"><div className="sources-heading"><span>Sources</span><button type="button" onClick={() => setSources((current) => [...current, { key: crypto.randomUUID(), label: "", url: "" }])}>+ Добавить ссылку</button></div>{sources.map((source) => <div className="source-row" key={source.key}><input aria-label="Название источника" placeholder="Slack thread" value={source.label} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, label: event.target.value } : item))} /><input aria-label="URL источника" type="url" placeholder="https://…" value={source.url} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, url: event.target.value } : item))} /><button type="button" aria-label="Удалить источник" onClick={() => setSources((current) => current.filter((item) => item.key !== source.key))}>×</button></div>)}</div>
        <div className="composer-footer"><span>{content.length} / 5000</span><button className="primary-button" disabled={saving} type="submit">{saving ? "Сохраняем…" : editingId ? "Сохранить изменения" : "Добавить в журнал"}</button></div>
      </form>
    </section>

    <section className="journal-section"><div className="journal-heading"><div><p className="eyebrow">All logs</p><h2>Обратная хронология</h2></div><span className="counter">{entries.length} записей</span></div>
      {loading && entries.length === 0 ? <div className="state-card">Загружаем журнал…</div> : entries.length === 0 ? <div className="state-card"><strong>Журнал пока пуст</strong><p>Создайте первую Decision, Task или Question — запись останется доступной после перезагрузки.</p></div> : <div className="log-list">{entries.map((entry) => <article className={`log-card ${entry.type}`} key={entry.id}>
        <div className="log-meta"><span className={`type-pill ${entry.type}`}>{typeLabel(entry.type)}</span><time>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Tallinn" }).format(new Date(entry.occurredAt))}</time>{entry.updatedAt !== entry.createdAt && <span className="updated-mark" title={`Изменено ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${entry.updatedAt.replace(" ", "T")}Z`))}`}>↻</span>}{entry.status && <span className="log-status">{entry.status}</span>}</div>
        <button className="log-menu-trigger" aria-label="Действия с записью" aria-haspopup="menu" aria-expanded={menuId === entry.id} onClick={() => setMenuId((current) => current === entry.id ? null : entry.id)}>⋯</button>
        {menuId === entry.id && <div className="log-menu" role="menu"><button role="menuitem" onClick={() => edit(entry)}>Изменить</button><button role="menuitem" className="danger" onClick={() => void remove(entry)}>Удалить</button></div>}
        <p className="log-content">{entry.content}</p>
        {(entry.people.length > 0 || entry.projects.length > 0) && <div className="relation-chips">{entry.people.map((person) => <span key={person.id}>@{person.alias}</span>)}{entry.projects.map((project) => <span key={project.id}>#{project.slug}</span>)}</div>}
        {entry.type === "task" && (entry.assigneeId || entry.dueDate) && <div className="task-detail">{entry.assigneeId && <span>Assignee: {assigneeName(entry.assigneeId) ?? "Unknown"}</span>}{entry.dueDate && <span>Due: {entry.dueDate}</span>}</div>}
        {entry.sources.length > 0 && <div className="source-links">{entry.sources.map((source) => <a key={source.id ?? source.url} href={source.url} target="_blank" rel="noreferrer">↗ {source.label}</a>)}</div>}
      </article>)}</div>}
      {hasMore && <button className="load-more" disabled={loading} onClick={() => void load(page + 1, true)}>{loading ? "Загружаем…" : "Показать ещё"}</button>}
    </section>
  </>;
}
