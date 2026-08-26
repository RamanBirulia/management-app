"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import DirectoryEditModal from "./directory-edit-modal";
import type { Person, Project, ProjectColor, Team } from "./directory-domain";
import { generatePersonAlias, generateProjectSlug, PROJECT_COLORS, projectColorHex } from "./directory-domain";

type Tab = "people" | "teams" | "projects";
type EditableRecord = Person | Project | Team;

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableRecord | null>(null);
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newProjectColor, setNewProjectColor] = useState<ProjectColor>("amber");
  const [handleEdited, setHandleEdited] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState<Person | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suffix = includeArchived ? "?includeArchived=true" : "";
      const [peopleResult, teamResult, projectResult] = await Promise.all([
        api<{ people: Person[] }>(`/api/people${suffix}`), api<{ teams: Team[] }>(`/api/teams${suffix}`), api<{ projects: Project[] }>(`/api/projects${suffix}`),
      ]);
      setPeople(peopleResult.people); setTeams(teamResult.teams); setProjects(projectResult.projects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить справочники");
    } finally { setLoading(false); }
  }, [includeArchived]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);
  const records: EditableRecord[] = tab === "people" ? people : tab === "teams" ? teams : projects;
  const activeCount = useMemo(() => records.filter((item) => item.status === "active").length, [records]);

  async function saveNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    try {
      if (tab === "people") await api("/api/people", { method: "POST", body: JSON.stringify({ displayName: newName, alias: newHandle }) });
      else if (tab === "teams") await api("/api/teams", { method: "POST", body: JSON.stringify({ name: newName, alias: newHandle }) });
      else await api("/api/projects", { method: "POST", body: JSON.stringify({ name: newName, slug: newHandle, color: newProjectColor }) });
      setNewName(""); setNewHandle(""); setHandleEdited(false); setCreating(false); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить"); }
  }

  async function changeStatus(record: EditableRecord) {
    const kind = "displayName" in record ? "people" : "people" in record ? "teams" : "projects";
    const nextStatus = record.status === "active" ? "archived" : "active";
    if (nextStatus === "archived" && !window.confirm("Архивировать запись? Старые ссылки останутся читаемыми.")) return;
    try { await api(`/api/${kind}/${record.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); await load(); }
    catch (statusError) { setError(statusError instanceof Error ? statusError.message : "Не удалось изменить статус"); }
  }

  async function addPersonToTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!addingPerson || !selectedTeamId) return;
    const team = teams.find((item) => item.id === selectedTeamId); if (!team) return;
    try {
      await api(`/api/teams/${team.id}`, { method: "PATCH", body: JSON.stringify({ personIds: [...new Set([...team.people.map((person) => person.id), addingPerson.id])] }) });
      setAddingPerson(null); setSelectedTeamId(""); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось добавить в команду"); }
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab); setEditing(null); setCreating(false); setNewName(""); setNewHandle(""); setHandleEdited(false); setNewProjectColor("amber");
  }

  function changeNewName(value: string) {
    setNewName(value);
    if (!handleEdited) setNewHandle(tab === "projects" ? generateProjectSlug(value) : generatePersonAlias(value));
  }

  return <>
    <section className="directory-toolbar" aria-label="Переключатель справочников">
      <div className="tabs" role="tablist">
        <button className={tab === "people" ? "tab active" : "tab"} onClick={() => selectTab("people")} role="tab" aria-selected={tab === "people"}>Люди <span>{people.length}</span></button>
        <button className={tab === "teams" ? "tab active" : "tab"} onClick={() => selectTab("teams")} role="tab" aria-selected={tab === "teams"}>Команды <span>{teams.length}</span></button>
        <button className={tab === "projects" ? "tab active" : "tab"} onClick={() => selectTab("projects")} role="tab" aria-selected={tab === "projects"}>Проекты <span>{projects.length}</span></button>
      </div>
      <label className="archive-toggle"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Показывать архив</label>
    </section>

    <section className="directory-layout directory-layout-compact">
      <div className="records-panel">
        <div className="panel-heading"><div><p className="eyebrow">{tab === "people" ? "People" : tab === "teams" ? "Teams" : "Projects"}</p><h2>{tab === "people" ? "Справочник людей" : tab === "teams" ? "Справочник команд" : "Справочник проектов"}</h2></div><span className="counter">{activeCount} активных</span></div>
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError(null)} aria-label="Закрыть">×</button></div>}
        {loading ? <div className="state-card">Загружаем записи…</div> : records.length === 0 ? <div className="state-card"><strong>{tab === "people" ? "Добавьте первого человека" : tab === "teams" ? "Добавьте первую команду" : "Добавьте первый проект"}</strong><p>Стабильный идентификатор будет использоваться в упоминаниях.</p></div> : <div className="record-list">
          {records.map((record) => { const isPerson = "displayName" in record; const isTeam = "people" in record; const isProject = !isPerson && !isTeam; const name = isPerson ? record.displayName : record.name; const handle = isPerson || isTeam ? `@${record.alias}` : `#${record.slug}`; return <article className={`record-card ${record.status}`} key={record.id}>
            <div className={`record-avatar${isProject ? " project-color-avatar" : ""}`} style={isProject ? { backgroundColor: projectColorHex(record.color) } : undefined} aria-hidden="true">{name.slice(0, 2).toUpperCase()}</div>
            <div className="record-main"><div className="record-title">{isTeam ? name : <Link href={`/${isPerson ? "people" : "projects"}/${record.id}`}>{name}</Link>}{record.status === "archived" && <span className="archived-label">архив</span>}</div><span className="handle">{handle}</span>{isTeam && <div className="membership-list">{record.people.length ? record.people.map((person) => <span key={person.id}>@{person.alias}</span>) : <span>Без участников</span>}</div>}{isPerson && <div className="membership-list">{teams.filter((team) => team.people.some((person) => person.id === record.id)).map((team) => <span key={team.id}>@{team.alias}</span>)}</div>}</div>
            <div className="record-actions menu-actions"><button aria-label="Действия" onClick={() => setMenuId((current) => current === record.id ? null : record.id)}>⋯</button>{menuId === record.id && <div className="record-menu"><button onClick={() => { setEditing(record); setMenuId(null); }}>Изменить</button>{isPerson && record.status === "active" && <button onClick={() => { setAddingPerson(record); setSelectedTeamId(teams.find((team) => team.status === "active" && !team.people.some((person) => person.id === record.id))?.id ?? ""); setMenuId(null); }}>Добавить в команду</button>}<button onClick={() => { setMenuId(null); void changeStatus(record); }}>{record.status === "active" ? "В архив" : "Вернуть"}</button></div>}</div>
            {record.note && <div className="record-note"><ReactMarkdown components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a> }}>{record.note}</ReactMarkdown></div>}
          </article>; })}
        </div>}
      </div>

    </section>

    <button className="floating-add" type="button" aria-label={tab === "people" ? "Добавить человека" : tab === "teams" ? "Добавить команду" : "Добавить проект"} title={tab === "people" ? "Добавить человека" : tab === "teams" ? "Добавить команду" : "Добавить проект"} onClick={() => setCreating(true)}>+</button>

    {creating && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false); }}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="create-directory-title"><div className="modal-heading"><div><p className="eyebrow">Новая запись</p><h2 id="create-directory-title">{tab === "people" ? "Добавить человека" : tab === "teams" ? "Добавить команду" : "Добавить проект"}</h2></div><button className="close-button" onClick={() => setCreating(false)} aria-label="Закрыть">×</button></div><p className="form-intro">{tab === "projects" ? "Slug создаётся автоматически через нижнее подчёркивание и используется после #." : "Alias создаётся автоматически и используется после @."}</p><form onSubmit={saveNew}><label>{tab === "people" ? "Отображаемое имя" : tab === "teams" ? "Название команды" : "Название проекта"}<input name="name" autoFocus required maxLength={100} value={newName} onChange={(event) => changeNewName(event.target.value)} placeholder={tab === "people" ? "Alex Morgan" : tab === "teams" ? "Platform Team" : "Content Editing Form"} /></label><label>{tab === "projects" ? "Slug" : "Alias"}<div className="prefixed-input"><span>{tab === "projects" ? "#" : "@"}</span><input name="handle" required minLength={2} maxLength={40} pattern={tab === "projects" ? "[A-Za-z0-9][A-Za-z0-9_-]{1,39}" : "[A-Za-z0-9][A-Za-z0-9._-]{1,39}"} value={newHandle} onChange={(event) => { setNewHandle(event.target.value.toLowerCase()); setHandleEdited(true); }} placeholder={tab === "people" ? "alex.morgan" : tab === "teams" ? "platform" : "content_editing_form"} /></div></label>{tab === "projects" && <fieldset className="project-color-field"><legend>Цвет проекта</legend><div className="project-color-options">{PROJECT_COLORS.map((color) => <label key={color.value} title={color.label}><input type="radio" checked={newProjectColor === color.value} onChange={() => setNewProjectColor(color.value)} /><span style={{ backgroundColor: color.hex }} /><small>{color.label}</small></label>)}</div></fieldset>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Отмена</button><button className="primary-button" type="submit">Добавить</button></div></form></section></div>}

    {editing && <DirectoryEditModal record={editing} people={people} onClose={() => setEditing(null)} onSaved={load} />}
    {addingPerson && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddingPerson(null); }}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="add-team-title"><div className="modal-heading"><div><p className="eyebrow">Membership</p><h2 id="add-team-title">Добавить {addingPerson.displayName}</h2></div><button className="close-button" onClick={() => setAddingPerson(null)} aria-label="Закрыть">×</button></div><form onSubmit={addPersonToTeam}><label>Команда<select required value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}><option value="">Выберите команду</option>{teams.filter((team) => team.status === "active" && !team.people.some((person) => person.id === addingPerson.id)).map((team) => <option key={team.id} value={team.id}>{team.name} · @{team.alias}</option>)}</select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAddingPerson(null)}>Отмена</button><button className="primary-button" type="submit" disabled={!selectedTeamId}>Добавить</button></div></form></section></div>}
  </>;
}
