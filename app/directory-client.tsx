"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import DirectoryEditModal from "./directory-edit-modal";
import type { Person, Project } from "./directory-domain";
import { generatePersonAlias, generateProjectSlug } from "./directory-domain";

type Tab = "people" | "projects";
type EditableRecord = Person | Project;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Не удалось выполнить запрос");
  return data;
}

export default function DirectoryClient() {
  const [tab, setTab] = useState<Tab>("people");
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableRecord | null>(null);
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suffix = includeArchived ? "?includeArchived=true" : "";
      const [peopleResult, projectResult] = await Promise.all([
        api<{ people: Person[] }>(`/api/people${suffix}`), api<{ projects: Project[] }>(`/api/projects${suffix}`),
      ]);
      setPeople(peopleResult.people); setProjects(projectResult.projects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить справочники");
    } finally { setLoading(false); }
  }, [includeArchived]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);
  const records = tab === "people" ? people : projects;
  const activeCount = useMemo(() => records.filter((item) => item.status === "active").length, [records]);

  async function saveNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    try {
      if (tab === "people") await api("/api/people", { method: "POST", body: JSON.stringify({ displayName: newName, alias: newHandle }) });
      else await api("/api/projects", { method: "POST", body: JSON.stringify({ name: newName, slug: newHandle }) });
      setNewName(""); setNewHandle(""); setHandleEdited(false); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить"); }
  }

  async function changeStatus(record: EditableRecord) {
    const kind = "displayName" in record ? "people" : "projects";
    const nextStatus = record.status === "active" ? "archived" : "active";
    if (nextStatus === "archived" && !window.confirm("Архивировать запись? Старые ссылки останутся читаемыми.")) return;
    try { await api(`/api/${kind}/${record.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); await load(); }
    catch (statusError) { setError(statusError instanceof Error ? statusError.message : "Не удалось изменить статус"); }
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab); setEditing(null); setNewName(""); setNewHandle(""); setHandleEdited(false);
  }

  function changeNewName(value: string) {
    setNewName(value);
    if (!handleEdited) setNewHandle(tab === "people" ? generatePersonAlias(value) : generateProjectSlug(value));
  }

  return <>
    <section className="directory-toolbar" aria-label="Переключатель справочников">
      <div className="tabs" role="tablist">
        <button className={tab === "people" ? "tab active" : "tab"} onClick={() => selectTab("people")} role="tab" aria-selected={tab === "people"}>Люди <span>{people.length}</span></button>
        <button className={tab === "projects" ? "tab active" : "tab"} onClick={() => selectTab("projects")} role="tab" aria-selected={tab === "projects"}>Проекты <span>{projects.length}</span></button>
      </div>
      <label className="archive-toggle"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Показывать архив</label>
    </section>

    <section className="directory-layout">
      <div className="records-panel">
        <div className="panel-heading"><div><p className="eyebrow">{tab === "people" ? "People" : "Projects"}</p><h2>{tab === "people" ? "Справочник людей" : "Справочник проектов"}</h2></div><span className="counter">{activeCount} активных</span></div>
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError(null)} aria-label="Закрыть">×</button></div>}
        {loading ? <div className="state-card">Загружаем записи…</div> : records.length === 0 ? <div className="state-card"><strong>{tab === "people" ? "Добавьте первого человека" : "Добавьте первый проект"}</strong><p>Стабильный идентификатор будет использоваться в будущих упоминаниях.</p></div> : <div className="record-list">
          {records.map((record) => { const isPerson = "displayName" in record; const name = isPerson ? record.displayName : record.name; const handle = isPerson ? `@${record.alias}` : `#${record.slug}`; return <article className={`record-card ${record.status}`} key={record.id}>
            <div className="record-avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</div>
            <div className="record-main"><div className="record-title"><Link href={`/${isPerson ? "people" : "projects"}/${record.id}`}>{name}</Link>{record.status === "archived" && <span className="archived-label">архив</span>}</div><span className="handle">{handle}</span></div>
            <div className="record-actions"><button onClick={() => setEditing(record)}>Изменить</button><button onClick={() => void changeStatus(record)}>{record.status === "active" ? "В архив" : "Вернуть"}</button></div>
            {record.note && <div className="record-note"><ReactMarkdown components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a> }}>{record.note}</ReactMarkdown></div>}
          </article>; })}
        </div>}
      </div>

      <aside className="form-panel">
        <p className="eyebrow">Новая запись</p><h2>{tab === "people" ? "Добавить человека" : "Добавить проект"}</h2>
        <p className="form-intro">{tab === "people" ? "Alias создаётся автоматически в формате first.last и используется после @." : "Slug создаётся автоматически через нижнее подчёркивание и используется после #."}</p>
        <form onSubmit={saveNew}>
          <label>{tab === "people" ? "Отображаемое имя" : "Название проекта"}<input name="name" required maxLength={100} value={newName} onChange={(event) => changeNewName(event.target.value)} placeholder={tab === "people" ? "Alex Morgan" : "Content Editing Form"} /></label>
          <label>{tab === "people" ? "Alias" : "Slug"}<div className="prefixed-input"><span>{tab === "people" ? "@" : "#"}</span><input name="handle" required minLength={2} maxLength={40} pattern={tab === "people" ? "[A-Za-z0-9][A-Za-z0-9._-]{1,39}" : "[A-Za-z0-9][A-Za-z0-9_-]{1,39}"} value={newHandle} onChange={(event) => { setNewHandle(event.target.value.toLowerCase()); setHandleEdited(true); }} placeholder={tab === "people" ? "alex.morgan" : "content_editing_form"} /></div></label>
          <button className="primary-button" type="submit">Добавить</button>
        </form>
        <div className="form-note"><strong>Стабильные связи</strong><p>Переименование не изменяет внутренний ID и не сломает будущие записи журнала.</p></div>
      </aside>
    </section>

    {editing && <DirectoryEditModal record={editing} onClose={() => setEditing(null)} onSaved={load} />}
  </>;
}
