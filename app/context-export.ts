import type { LogEntry, LogPerson } from "./log-domain";

export const CONTEXT_EXPORT_VERSION = "management-log-context/v1";

type ExportNames = { people?: Map<string, string>; projects?: Map<string, string>; teams?: Map<string, string> };

const typeName = (type: LogEntry["type"]) => type === "decision" ? "Decision" : type === "task" ? "Task" : "Question";
const formatDateTime = (value: string, dateOnly = false) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), timeZone: "Europe/Tallinn" }).format(new Date(dateOnly ? `${value}T12:00:00Z` : value));
const personHandle = (entry: LogEntry, id: string | null, names: ExportNames) => {
  if (!id) return null;
  const person: LogPerson | undefined = entry.people.find((item) => item.id === id);
  return person ? `@${person.alias} (${person.displayName})` : names.people?.get(id) ?? "Unknown";
};

export function describeExportFilters(params: URLSearchParams, names: ExportNames = {}) {
  const parts: string[] = [];
  const values = (key: string) => params.getAll(key).flatMap((value) => value.split(",")).filter(Boolean);
  const readable = (key: "person" | "project" | "team", map?: Map<string, string>) => values(key).map((id) => map?.get(id) ?? id);
  if (values("type").length) parts.push(`type=${values("type").map((value) => typeName(value as LogEntry["type"])).join(",")}`);
  if (values("status").length) parts.push(`status=${values("status").join(",")}`);
  if (values("person").length) parts.push(`people=${readable("person", names.people).join(",")}`);
  if (values("team").length) parts.push(`teams=${readable("team", names.teams).join(",")}`);
  if (values("project").length) parts.push(`projects=${readable("project", names.projects).join(",")}`);
  if (params.get("from") || params.get("to")) parts.push(`period=${params.get("from") || "…"}—${params.get("to") || "…"}`);
  if (params.get("completedFrom") || params.get("completedTo")) parts.push(`completed=${params.get("completedFrom") || "…"}—${params.get("completedTo") || "…"}`);
  return parts.length ? parts.join(" · ") : "All records";
}

export function formatContextExport(entries: LogEntry[], options: { exportedAt: string; filters: string; names?: ExportNames }) {
  const names = options.names ?? {};
  const blocks = entries.map((entry) => {
    const heading = [`## ${typeName(entry.type)}`, formatDateTime(entry.occurredAt), entry.status].filter(Boolean).join(" · ");
    const lines = [heading, entry.content.trim()];
    if (entry.description.trim()) lines.push("", "Context:", entry.description.trim());
    if (entry.type === "task") {
      const assignee = personHandle(entry, entry.assigneeId, names); if (assignee) lines.push(`Assignee: ${assignee}`);
      if (entry.dueDate) lines.push(`Due: ${formatDateTime(entry.dueDate, true)}`);
      if (entry.completedAt) lines.push(`Completed: ${formatDateTime(entry.completedAt)}${personHandle(entry, entry.completedByPersonId, names) ? ` by ${personHandle(entry, entry.completedByPersonId, names)}` : ""}`);
    }
    if (entry.type === "question" && entry.resolvedAt) lines.push(`Resolved: ${formatDateTime(entry.resolvedAt)}${personHandle(entry, entry.resolvedByPersonId, names) ? ` by ${personHandle(entry, entry.resolvedByPersonId, names)}` : ""}`);
    if (entry.sources.length) lines.push("", "Sources:", ...entry.sources.map((source) => `- ${source.label} — ${source.url}`));
    return lines.join("\n");
  });
  return [`# Management Log context`, `Format: ${CONTEXT_EXPORT_VERSION}`, `Exported: ${formatDateTime(options.exportedAt)}`, `Filters: ${options.filters}`, `Records: ${entries.length}`, ...blocks].join("\n\n") + "\n";
}
