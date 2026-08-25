"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Person, Project, Team } from "./directory-domain";
import DirectoryEditModal from "./directory-edit-modal";
import type { LogEntry, LogSource, LogType } from "./log-domain";
import { addCalendarDays, currentTallinnDate, groupEntriesByProject, isoWeekRange } from "./journal-period";

type SourceDraft = LogSource & { key: string };
type Suggestion = { kind: "person" | "team" | "project"; id: string; name: string; handle: string };

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

function formatCompactDate(value: string | Date, includeTime = false) {
  const date = value instanceof Date ? value : new Date(value);
  const timeZone = "Europe/Tallinn";
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(date);
  const currentYear = new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(new Date());
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", ...(year !== currentYear ? { year: "numeric" } : {}), ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone }).format(date).replace(/\sг\./, "").replace(/\./g, "");
}

function formatDueDate(value: string) { return formatCompactDate(new Date(`${value}T12:00:00Z`)); }
function dayKey(value: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
function dayTitle(value: string) { return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Tallinn" }).format(new Date(`${value}T12:00:00Z`)); }

function renderLinkedContent(entry: LogEntry, text: string, openRecord: (kind: "person" | "team" | "project", id: string) => void) {
  const peopleByAlias = new Map(entry.people.map((person) => [person.alias.toLowerCase(), person]));
  const teamsByAlias = new Map(entry.teams.map((team) => [team.alias.toLowerCase(), team]));
  const projectsBySlug = new Map(entry.projects.map((project) => [project.slug.toLowerCase(), project]));
  const parts = text.split(/([@#][a-zA-Z0-9._-]+)/g);

  return parts.map((part, index) => {
    const match = part.match(/^([@#])([a-zA-Z0-9._-]+)$/);
    if (!match) return part;
    const [, prefix, handle] = match;
    if (prefix === "@") {
      const person = peopleByAlias.get(handle.toLowerCase());
      if (person) return <button type="button" className="inline-mention person" title={`@${person.alias} · двойной клик для редактирования`} onDoubleClick={() => openRecord("person", person.id)} key={`${part}-${index}`}>{person.displayName}</button>;
      const team = teamsByAlias.get(handle.toLowerCase());
      return team ? <span className="team-mention-wrap" key={`${part}-${index}`}><button type="button" className="inline-mention team" title={`@${team.alias} · двойной клик для редактирования`} onDoubleClick={() => openRecord("team", team.id)}>{team.name}</button><span className="team-popover" role="tooltip"><strong>{team.name}</strong>{team.people.length ? team.people.map((member) => <span key={member.id}>@{member.alias} · {member.displayName}</span>) : <span>В команде пока нет участников</span>}</span></span> : part;
    }
    const project = projectsBySlug.get(handle.toLowerCase());
    return project ? <button type="button" className="inline-mention project" title={`#${project.slug} · двойной клик для редактирования`} onDoubleClick={() => openRecord("project", project.id)} key={`${part}-${index}`}>{project.name}</button> : part;
  });
}

type ContextFilter = { kind: "person" | "project"; id: string };
type JournalView = "all" | "daily" | "weekly";

function queryForApi(query: string) {
  const params = new URLSearchParams(query); const view = params.get("view") as JournalView | null; const date = params.get("date") ?? currentTallinnDate();
  params.delete("view"); params.delete("date"); params.delete("page");
  if (view === "daily") { params.set("from", date); params.set("to", date); params.set("limit", "200"); }
  if (view === "weekly") { const range = isoWeekRange(date); params.set("from", range.from); params.set("to", range.to); params.set("limit", "200"); }
  return params.toString();
}

export default function LogsClient({ context, showComposer = true }: { context?: ContextFilter; showComposer?: boolean }) {
  const [people, setPeople] = useState<Person[]>([]); const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]); const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); const [type, setType] = useState<LogType>("decision");
  const [content, setContent] = useState(""); const [description, setDescription] = useState(""); const [occurredAt, setOccurredAt] = useState(localDateTime());
  const [status, setStatus] = useState("open"); const [assigneeId, setAssigneeId] = useState(""); const [dueDate, setDueDate] = useState("");
  const [completionPersonId, setCompletionPersonId] = useState("");
  const [sources, setSources] = useState<SourceDraft[]>([]); const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<Person | Team | Project | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(() => new Set());
  const [filterQuery, setFilterQuery] = useState("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]); const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPeople, setFilterPeople] = useState<string[]>([]); const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterTeams, setFilterTeams] = useState<string[]>([]);
  const [filterFrom, setFilterFrom] = useState(""); const [filterTo, setFilterTo] = useState("");
  const [completedFrom, setCompletedFrom] = useState(""); const [completedTo, setCompletedTo] = useState("");
  const [journalView, setJournalView] = useState<JournalView>("all"); const [periodDate, setPeriodDate] = useState(currentTallinnDate());

  const load = useCallback(async (nextPage = 1, append = false, query = "") => {
    setLoading(true); setError(null);
    try {
      const [logsResult, peopleResult, teamsResult, projectsResult] = await Promise.all([
        api<{ entries: LogEntry[]; hasMore: boolean }>(`/api/logs?${queryForApi(query)}${queryForApi(query) ? "&" : ""}page=${nextPage}`),
        api<{ people: Person[] }>("/api/people"), api<{ teams: Team[] }>("/api/teams"), api<{ projects: Project[] }>("/api/projects"),
      ]);
      setEntries((current) => append ? [...current, ...logsResult.entries] : logsResult.entries);
      setPeople(peopleResult.people); setTeams(teamsResult.teams); setProjects(projectsResult.projects); setPage(nextPage); setHasMore(logsResult.hasMore);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить журнал"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const frame = requestAnimationFrame(() => {
    const params = new URLSearchParams(window.location.search); const initialPage = Math.max(1, Number(params.get("page") ?? "1") || 1);
    if (context) params.set(context.kind, context.id); params.delete("page");
    const initialView = (["daily", "weekly"].includes(params.get("view") ?? "") ? params.get("view") : "all") as JournalView; const initialDate = params.get("date") ?? currentTallinnDate();
    setJournalView(initialView); setPeriodDate(initialDate); if (initialView !== "all") { params.set("view", initialView); params.set("date", initialDate); }
    const values = (key: string) => params.getAll(key).flatMap((value) => value.split(",")).filter(Boolean);
    setFilterTypes(values("type")); setFilterStatuses(values("status")); setFilterPeople(values("person")); setFilterTeams(values("team")); setFilterProjects(values("project")); setFilterFrom(params.get("from") ?? ""); setFilterTo(params.get("to") ?? ""); setCompletedFrom(params.get("completedFrom") ?? ""); setCompletedTo(params.get("completedTo") ?? "");
    const query = params.toString(); setFilterQuery(query); void load(initialPage, false, query);
  }); return () => cancelAnimationFrame(frame); }, [context, load]);

  function applyFilters() {
    const params = new URLSearchParams();
    filterTypes.forEach((value) => params.append("type", value)); filterStatuses.forEach((value) => params.append("status", value));
    filterPeople.forEach((value) => params.append("person", value)); filterTeams.forEach((value) => params.append("team", value)); filterProjects.forEach((value) => params.append("project", value));
    if (context) { params.delete(context.kind); params.set(context.kind, context.id); }
    if (filterFrom) params.set("from", filterFrom); if (filterTo) params.set("to", filterTo);
    if (completedFrom) params.set("completedFrom", completedFrom); if (completedTo) params.set("completedTo", completedTo);
    if (journalView !== "all") { params.set("view", journalView); params.set("date", periodDate); params.delete("from"); params.delete("to"); }
    const query = params.toString(); setFilterQuery(query); window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`); void load(1, false, query);
  }

  function resetFilters() {
    setFilterTypes([]); setFilterStatuses([]); setFilterPeople(context?.kind === "person" ? [context.id] : []); setFilterTeams([]); setFilterProjects(context?.kind === "project" ? [context.id] : []); setFilterFrom(""); setFilterTo(""); setCompletedFrom(""); setCompletedTo("");
    const params = new URLSearchParams(); if (context) params.set(context.kind, context.id); if (journalView !== "all") { params.set("view", journalView); params.set("date", periodDate); } const query = params.toString(); setFilterQuery(query); window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`); void load(1, false, query);
  }

  function changeView(nextView: JournalView, nextDate = periodDate) {
    const params = new URLSearchParams(filterQuery); params.delete("page"); params.delete("from"); params.delete("to");
    if (nextView === "all") { params.delete("view"); params.delete("date"); }
    else { params.set("view", nextView); params.set("date", nextDate); }
    const query = params.toString(); setJournalView(nextView); setPeriodDate(nextDate); setFilterQuery(query); window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`); void load(1, false, query);
  }

  function movePeriod(direction: -1 | 0 | 1) { const base = direction === 0 ? currentTallinnDate() : addCalendarDays(periodDate, direction * (journalView === "weekly" ? 7 : 1)); changeView(journalView, base); }

  const mentionMatch = content.match(/(?:^|\s)([@#])([a-zA-Z0-9._-]*)$/);
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!mentionMatch) return [];
    const query = mentionMatch[2].toLowerCase();
    return mentionMatch[1] === "@"
      ? [...people.filter((person) => person.alias.includes(query)).map((person) => ({ kind: "person" as const, id: person.id, name: person.displayName, handle: person.alias })), ...teams.filter((team) => team.alias.includes(query)).map((team) => ({ kind: "team" as const, id: team.id, name: team.name, handle: team.alias }))].slice(0, 6)
      : projects.filter((project) => project.slug.includes(query)).slice(0, 6).map((project) => ({ kind: "project", id: project.id, name: project.name, handle: project.slug }));
  }, [mentionMatch, people, teams, projects]);

  function chooseSuggestion(suggestion: Suggestion) {
    if (!mentionMatch) return;
    const start = content.length - mentionMatch[2].length - 1;
    setContent(`${content.slice(0, start)}${suggestion.kind === "project" ? "#" : "@"}${suggestion.handle} `);
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
    const tokens = new Set(`${content}\n${description}`.split(/\s+/).map((token) => token.replace(/[,:;!?]+$/g, "")));
    return {
      personIds: people.filter((person) => tokens.has(`@${person.alias}`)).map((person) => person.id),
      teamIds: teams.filter((team) => tokens.has(`@${team.alias}`)).map((team) => team.id),
      projectIds: projects.filter((project) => tokens.has(`#${project.slug}`)).map((project) => project.id),
    };
  }

  function resetComposer() {
    setEditingId(null); setType("decision"); setContent(""); setDescription(""); setOccurredAt(localDateTime()); setStatus("open"); setAssigneeId(""); setDueDate(""); setCompletionPersonId(""); setSources([]); setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError(null);
    const ids = linkedIds();
    const payload = { type, content, description, occurredAt, status: type === "task" ? status : type === "question" ? status : null, assigneeId: type === "task" ? assigneeId || null : null, dueDate: type === "task" ? dueDate || null : null, completionPersonId: (type === "task" && status === "done") || (type === "question" && status === "resolved") ? completionPersonId || null : null, ...ids, sources: sources.filter((source) => source.label.trim() || source.url.trim()).map(({ label, url }) => ({ label, url })) };
    try {
      await api(editingId ? `/api/logs/${editingId}` : "/api/logs", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      resetComposer(); await load(1, false, filterQuery);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить. Черновик оставлен в composer."); }
    finally { setSaving(false); }
  }

  function edit(entry: LogEntry) {
    setMenuId(null);
    setEditingId(entry.id); setType(entry.type); setContent(entry.content); setDescription(entry.description); setOccurredAt(localDateTime(new Date(entry.occurredAt)));
    setStatus(entry.status ?? (entry.type === "task" ? "unassigned" : "open")); setAssigneeId(entry.assigneeId ?? ""); setDueDate(entry.dueDate ?? "");
    setCompletionPersonId(entry.type === "task" ? entry.completedByPersonId ?? entry.assigneeId ?? "" : entry.resolvedByPersonId ?? "");
    setSources(entry.sources.map((source) => ({ ...source, key: source.id ?? crypto.randomUUID() })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(entry: LogEntry) {
    setMenuId(null);
    if (!window.confirm("Удалить запись? Она исчезнет из всех будущих представлений.")) return;
    try { await api(`/api/logs/${entry.id}`, { method: "DELETE" }); await load(1, false, filterQuery); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить запись"); }
  }

  const assigneeName = (id: string | null) => people.find((person) => person.id === id)?.displayName;
  const openRecord = (kind: "person" | "team" | "project", id: string) => setEditingRecord(kind === "person" ? people.find((person) => person.id === id) ?? null : kind === "team" ? teams.find((team) => team.id === id) ?? null : projects.find((project) => project.id === id) ?? null);
  const toggleDescription = (id: string) => setExpandedDescriptions((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const weeklyGroups = groupEntriesByProject(entries);
  const dailyGroups = [...new Set(entries.map((entry) => dayKey(entry.occurredAt)))].map((date) => ({ date, entries: entries.filter((entry) => dayKey(entry.occurredAt) === date) }));
  const periodLabel = journalView === "daily" ? dayTitle(periodDate) : journalView === "weekly" ? (() => { const range = isoWeekRange(periodDate); return `${formatDueDate(range.from)} — ${formatDueDate(range.to)}`; })() : "";

  const renderEntry = (entry: LogEntry) => { const terminalAt = entry.type === "task" ? entry.completedAt : entry.type === "question" ? entry.resolvedAt : null; const terminalBy = entry.type === "task" ? entry.completedByPersonId : entry.type === "question" ? entry.resolvedByPersonId : null; return <article className={`log-card ${entry.type}`} key={entry.id}>
    <div className="log-meta"><span className="meta-item type-label">{typeLabel(entry.type)}</span><time className="meta-item">{formatCompactDate(new Date(entry.occurredAt), true)}</time>{entry.type === "task" && entry.assigneeId && <span className="meta-item">@{assigneeName(entry.assigneeId) ?? "Unknown"}</span>}{entry.type === "task" && entry.dueDate && <span className="meta-item">до {formatDueDate(entry.dueDate)}</span>}{terminalAt ? <><span className="meta-item">{entry.type === "task" ? "done" : "resolved"} {formatCompactDate(new Date(terminalAt), true)}</span>{terminalBy && <span className="meta-item">@{assigneeName(terminalBy) ?? "Unknown"}</span>}</> : entry.status && <span className="meta-item">{entry.status}</span>}{entry.updatedAt !== entry.createdAt && <span className="meta-item updated-mark" title={`Изменено ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${entry.updatedAt.replace(" ", "T")}Z`))}`}>↻</span>}</div>
    <button className="log-menu-trigger" aria-label="Действия с записью" aria-haspopup="menu" aria-expanded={menuId === entry.id} onClick={() => setMenuId((current) => current === entry.id ? null : entry.id)}>⋯</button>
    {menuId === entry.id && <div className="log-menu" role="menu"><button role="menuitem" onClick={() => edit(entry)}>Изменить</button><button role="menuitem" className="danger" onClick={() => void remove(entry)}>Удалить</button></div>}
    <div className="log-title-line"><p className="log-content">{renderLinkedContent(entry, entry.content, openRecord)}</p>{entry.description && <button type="button" className="description-toggle" aria-label={expandedDescriptions.has(entry.id) ? "Скрыть описание" : "Показать описание"} aria-expanded={expandedDescriptions.has(entry.id)} title={expandedDescriptions.has(entry.id) ? "Скрыть описание" : "Показать описание"} onClick={() => toggleDescription(entry.id)}>›</button>}</div>
    {entry.description && expandedDescriptions.has(entry.id) && <div className="log-description">{renderLinkedContent(entry, entry.description, openRecord)}</div>}
    {entry.sources.length > 0 && <div className="source-links">{entry.sources.map((source) => <a key={source.id ?? source.url} href={source.url} target="_blank" rel="noreferrer">↗ {source.label}</a>)}</div>}
  </article>; };

  return <>
    {showComposer && <section className="composer-card">
      <div className="composer-heading"><div><p className="eyebrow">{editingId ? "Редактирование" : "Новая запись"}</p><h2>{editingId ? "Обновить контекст" : "Зафиксировать событие"}</h2></div>{editingId && <button className="secondary-button" type="button" onClick={resetComposer}>Отмена</button>}</div>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError(null)} aria-label="Закрыть">×</button></div>}
      <form onSubmit={save}>
        <div className="composer-row"><label>Тип<select value={type} onChange={(event) => { const next = event.target.value as LogType; setType(next); setStatus(next === "task" ? "unassigned" : "open"); setCompletionPersonId(""); }}><option value="decision">Decision</option><option value="task">Task</option><option value="question">Question</option></select></label><label>Когда<input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required /></label></div>
        <label>Заголовок <span className="field-hint">Короткая формулировка; @ — человек или команда, # — проект</span><div className="composer-input-wrap"><textarea className="composer-text" value={content} onChange={(event) => { setContent(event.target.value); setSuggestionIndex(0); }} onKeyDown={handleComposerKey} maxLength={5000} required rows={3} placeholder="Объединить команды @core и @platform в рамках #quotes" />{suggestions.length > 0 && <div className="mention-menu" role="listbox">{suggestions.map((suggestion, index) => <button type="button" role="option" aria-selected={index === suggestionIndex} className={index === suggestionIndex ? "selected" : ""} key={`${suggestion.kind}-${suggestion.id}`} onMouseDown={(event) => { event.preventDefault(); chooseSuggestion(suggestion); }}><span>{suggestion.kind === "project" ? "#" : "@"}{suggestion.handle}</span><small>{suggestion.kind === "team" ? `Команда · ${suggestion.name}` : suggestion.name}</small></button>)}</div>}</div></label>
        <label>Описание <span className="field-hint">Необязательно; подробный контекст, причины и упоминания</span><textarea className="description-input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} rows={7} placeholder="Почему приняли решение, какие варианты обсуждали и что важно учесть…" /></label>
        {type === "task" && <><div className="composer-row three"><label>Статус<select value={status} onChange={(event) => { const next = event.target.value; setStatus(next); if (next === "done") { if (!completionPersonId) setCompletionPersonId(assigneeId); } else setCompletionPersonId(""); }}><option value="unassigned">Unassigned</option><option value="open">Open</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></label><label>Assignee<select value={assigneeId} onChange={(event) => { setAssigneeId(event.target.value); if (status === "done" && !completionPersonId) setCompletionPersonId(event.target.value); }}><option value="">Не назначен</option>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>{status === "done" && <label className="short-field">Завершил<select required value={completionPersonId} onChange={(event) => setCompletionPersonId(event.target.value)}><option value="">Выберите человека</option>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>}</>}
        {type === "question" && <><label className="short-field">Статус<select value={status} onChange={(event) => { setStatus(event.target.value); if (event.target.value !== "resolved") setCompletionPersonId(""); }}><option value="open">Open</option><option value="resolved">Resolved</option></select></label>{status === "resolved" && <label className="short-field">Решил<select required value={completionPersonId} onChange={(event) => setCompletionPersonId(event.target.value)}><option value="">Выберите человека</option>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>}</>}
        <div className="sources-editor"><div className="sources-heading"><span>Sources</span><button type="button" onClick={() => setSources((current) => [...current, { key: crypto.randomUUID(), label: "", url: "" }])}>+ Добавить ссылку</button></div>{sources.map((source) => <div className="source-row" key={source.key}><input aria-label="Название источника" placeholder="Slack thread" value={source.label} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, label: event.target.value } : item))} /><input aria-label="URL источника" type="url" placeholder="https://…" value={source.url} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, url: event.target.value } : item))} /><button type="button" aria-label="Удалить источник" onClick={() => setSources((current) => current.filter((item) => item.key !== source.key))}>×</button></div>)}</div>
        <div className="composer-footer"><span>{content.length} / 5000</span><button className="primary-button" disabled={saving} type="submit">{saving ? "Сохраняем…" : editingId ? "Сохранить изменения" : "Добавить в журнал"}</button></div>
      </form>
    </section>}

    <section className="journal-section"><div className="journal-heading"><div><p className="eyebrow">Journal views</p><h2>{journalView === "all" ? "Обратная хронология" : journalView === "daily" ? "День" : "Неделя по проектам"}</h2></div><span className="counter">{entries.length} {journalView === "weekly" ? "уникальных" : "записей"}</span></div>
      <div className="view-toolbar"><div className="view-tabs" role="tablist" aria-label="Представление журнала">{[["all","All"],["daily","Daily"],["weekly","Weekly"]].map(([value,label]) => <button key={value} role="tab" aria-selected={journalView === value} className={journalView === value ? "active" : ""} onClick={() => changeView(value as JournalView)}>{label}</button>)}</div>{journalView !== "all" && <div className="period-nav"><button aria-label="Предыдущий период" onClick={() => movePeriod(-1)}>‹</button><button className="current-period" onClick={() => movePeriod(0)}>{periodLabel}</button><button aria-label="Следующий период" onClick={() => movePeriod(1)}>›</button></div>}</div>
      <details className="filters-panel"><summary>Фильтры <span>AND между группами · OR внутри группы</span></summary><div className="filters-grid">
        <fieldset><legend>Тип</legend>{[["decision","Decision"],["task","Task"],["question","Question"]].map(([value,label]) => <label key={value}><input type="checkbox" checked={filterTypes.includes(value)} onChange={(event) => setFilterTypes((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />{label}</label>)}</fieldset>
        <fieldset><legend>Статус</legend>{["open","unassigned","done","cancelled","resolved"].map((value) => <label key={value}><input type="checkbox" checked={filterStatuses.includes(value)} onChange={(event) => setFilterStatuses((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />{value}</label>)}</fieldset>
        {!context || context.kind !== "person" ? <label>Люди<select multiple value={filterPeople} onChange={(event) => setFilterPeople(Array.from(event.target.selectedOptions, (option) => option.value))}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label> : null}
        <label>Команды<select multiple value={filterTeams} onChange={(event) => setFilterTeams(Array.from(event.target.selectedOptions, (option) => option.value))}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        {!context || context.kind !== "project" ? <label>Проекты<select multiple value={filterProjects} onChange={(event) => setFilterProjects(Array.from(event.target.selectedOptions, (option) => option.value))}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : null}
        {journalView === "all" && <><label>С даты<input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} /></label><label>По дату<input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} /></label></>}
        <label>Завершено с<input type="date" value={completedFrom} onChange={(event) => setCompletedFrom(event.target.value)} /></label><label>Завершено по<input type="date" value={completedTo} onChange={(event) => setCompletedTo(event.target.value)} /></label>
      </div><div className="filter-actions"><button type="button" className="secondary-button" onClick={resetFilters}>Сбросить</button><button type="button" className="primary-button" onClick={applyFilters}>Применить</button></div></details>
      {loading && entries.length === 0 ? <div className="state-card">Загружаем журнал…</div> : entries.length === 0 ? <div className="state-card"><strong>{filterQuery || context ? "Ничего не найдено" : "Журнал пока пуст"}</strong><p>{filterQuery || context ? "Измените период или условия фильтра." : "Создайте первую Decision, Task или Question — запись останется доступной после перезагрузки."}</p></div> : journalView === "weekly" ? <div className="weekly-groups">{weeklyGroups.map((group) => <section className="weekly-group" key={group.key}><header><div><p className="eyebrow">{group.project ? `#${group.project.slug}` : "Без проекта"}</p><h3>{group.project?.name ?? "Без проекта"}</h3></div><div className="weekly-counts"><span>D {group.counts.decision}</span><span>T {group.counts.task}</span><span>Q {group.counts.question}</span><span>Open {group.counts.open}</span></div></header><div className="log-list">{group.entries.map(renderEntry)}</div></section>)}</div> : journalView === "daily" ? <div className="daily-groups">{dailyGroups.map((group) => <section className="daily-group" key={group.date}><h3>{dayTitle(group.date)}</h3><div className="log-list">{group.entries.map(renderEntry)}</div></section>)}</div> : <div className="log-list">{entries.map(renderEntry)}</div>}
      {hasMore && <button className="load-more" disabled={loading} onClick={() => { const nextPage = page + 1; const params = new URLSearchParams(filterQuery); params.set("page", String(nextPage)); window.history.replaceState(null, "", `${window.location.pathname}?${params}`); void load(nextPage, true, filterQuery); }}>{loading ? "Загружаем…" : "Показать ещё"}</button>}
    </section>
    {editingRecord && <DirectoryEditModal record={editingRecord} people={people} onClose={() => setEditingRecord(null)} onSaved={() => load(1, false, filterQuery)} />}
  </>;
}
