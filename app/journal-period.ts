import type { LogEntry, LogProject } from "./log-domain";

function dateAtNoon(value: string) { return new Date(`${value}T12:00:00Z`); }
export function addCalendarDays(value: string, amount: number) { const date = dateAtNoon(value); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
export function currentTallinnDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function isoWeekRange(value: string) { const date = dateAtNoon(value); const weekday = date.getUTCDay() || 7; const from = addCalendarDays(value, 1 - weekday); return { from, to: addCalendarDays(from, 6) }; }

export type WeeklyGroup = { key: string; project: LogProject | null; entries: LogEntry[]; counts: { decision: number; task: number; question: number; open: number } };
export function groupEntriesByProject(entries: LogEntry[]): WeeklyGroup[] {
  const groups = new Map<string, WeeklyGroup>();
  const add = (key: string, project: LogProject | null, entry: LogEntry) => {
    const group = groups.get(key) ?? { key, project, entries: [], counts: { decision: 0, task: 0, question: 0, open: 0 } };
    group.entries.push(entry); group.counts[entry.type] += 1; if (entry.status === "open" || entry.status === "unassigned") group.counts.open += 1; groups.set(key, group);
  };
  for (const entry of entries) { if (entry.projects.length) entry.projects.forEach((project) => add(project.id, project, entry)); else add("unassigned", null, entry); }
  return [...groups.values()].sort((a, b) => a.project && b.project ? a.project.name.localeCompare(b.project.name) : a.project ? -1 : b.project ? 1 : 0);
}
