"use client";

import { FormEvent, useState } from "react";
import type { Person, Project } from "./directory-domain";

type EditableRecord = Person | Project;

export default function DirectoryEditModal({ record, onClose, onSaved }: { record: EditableRecord; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isPerson = "displayName" in record;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const data = new FormData(event.currentTarget);
    const kind = isPerson ? "people" : "projects";
    const payload = isPerson
      ? { displayName: data.get("name"), alias: data.get("handle"), note: data.get("note") }
      : { name: data.get("name"), slug: data.get("handle"), note: data.get("note") };
    try {
      const response = await fetch(`/api/${kind}/${record.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить изменения");
      await onSaved(); onClose();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить изменения"); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
    <div className="modal-heading"><div><p className="eyebrow">Редактирование</p><h2 id="edit-title">{isPerson ? record.displayName : record.name}</h2></div><button className="close-button" onClick={onClose} aria-label="Закрыть">×</button></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <form onSubmit={save}>
      <label>{isPerson ? "Отображаемое имя" : "Название проекта"}<input name="name" required defaultValue={isPerson ? record.displayName : record.name} /></label>
      <label>{isPerson ? "Alias" : "Slug"}<div className="prefixed-input"><span>{isPerson ? "@" : "#"}</span><input name="handle" required pattern={isPerson ? "[A-Za-z0-9][A-Za-z0-9._-]{1,39}" : "[A-Za-z0-9][A-Za-z0-9_-]{1,39}"} defaultValue={isPerson ? record.alias : record.slug} /></div></label>
      <label>Note <span className="field-hint">Поддерживает Markdown и ссылки</span><textarea name="note" maxLength={10000} rows={8} defaultValue={record.note} placeholder={isPerson ? "Заметки one-on-one, договорённости, полезные ссылки…" : "Контекст проекта, ссылки, договорённости…"} /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Отмена</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Сохраняем…" : "Сохранить"}</button></div>
    </form>
  </section></div>;
}
