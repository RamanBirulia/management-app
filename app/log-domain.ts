export type LogType = "decision" | "task" | "question";
export type TaskStatus = "unassigned" | "open" | "done" | "cancelled";
export type QuestionStatus = "open" | "resolved";

export type LogSource = { id?: string; label: string; url: string };
export type LogPerson = { id: string; displayName: string; alias: string };
export type LogProject = { id: string; name: string; slug: string };

export type LogEntry = {
  id: string;
  type: LogType;
  content: string;
  description: string;
  occurredAt: string;
  status: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  people: LogPerson[];
  projects: LogProject[];
  sources: LogSource[];
};

export type LogPayload = {
  type?: string;
  content?: string;
  description?: string;
  occurredAt?: string;
  status?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  personIds?: string[];
  projectIds?: string[];
  sources?: LogSource[];
};

export function validateLogPayload(payload: LogPayload) {
  if (!payload.type || !["decision", "task", "question"].includes(payload.type)) return "Выберите тип записи";
  if (!payload.content?.trim()) return "Текст записи обязателен";
  if (payload.content.trim().length > 5000) return "Текст записи не должен превышать 5 000 символов";
  if ((payload.description ?? "").trim().length > 20_000) return "Описание не должно превышать 20 000 символов";
  if (!payload.occurredAt || Number.isNaN(Date.parse(payload.occurredAt))) return "Укажите корректные дату и время";
  if (payload.type === "task" && payload.status && !["unassigned", "open", "done", "cancelled"].includes(payload.status)) return "Некорректный статус задачи";
  if (payload.type === "question" && payload.status && !["open", "resolved"].includes(payload.status)) return "Некорректный статус вопроса";
  for (const source of payload.sources ?? []) {
    if (!source.label.trim()) return "Укажите название source-ссылки";
    try {
      const url = new URL(source.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "Source должен использовать http или https";
    } catch { return "Укажите корректный URL source-ссылки"; }
  }
  return null;
}
