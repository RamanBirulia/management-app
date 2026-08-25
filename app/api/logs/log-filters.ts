const LOG_TYPES = new Set(["decision", "task", "question"]);
const LOG_STATUSES = new Set(["unassigned", "open", "done", "cancelled", "resolved"]);

function list(params: URLSearchParams, key: string, allowed?: Set<string>) {
  const values = params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
  return [...new Set(allowed ? values.filter((value) => allowed.has(value)) : values)];
}

function tallinnStart(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(guess);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const offset = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day), Number(value.hour), Number(value.minute), Number(value.second)) - guess;
  return new Date(guess - offset).toISOString();
}

export function parseLogFilters(params: URLSearchParams) {
  const from = params.get("from") ?? ""; const to = params.get("to") ?? "";
  const completedFrom = params.get("completedFrom") ?? ""; const completedTo = params.get("completedTo") ?? "";
  const nextDay = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T12:00:00Z`) : null;
  if (nextDay) nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const completedNextDay = completedTo && /^\d{4}-\d{2}-\d{2}$/.test(completedTo) ? new Date(`${completedTo}T12:00:00Z`) : null;
  if (completedNextDay) completedNextDay.setUTCDate(completedNextDay.getUTCDate() + 1);
  return {
    types: list(params, "type", LOG_TYPES), statuses: list(params, "status", LOG_STATUSES),
    personIds: list(params, "person"), projectIds: list(params, "project"), from, to,
    fromIso: from ? tallinnStart(from) : null,
    toIsoExclusive: nextDay ? tallinnStart(nextDay.toISOString().slice(0, 10)) : null,
    completedFrom, completedTo, completedFromIso: completedFrom ? tallinnStart(completedFrom) : null,
    completedToIsoExclusive: completedNextDay ? tallinnStart(completedNextDay.toISOString().slice(0, 10)) : null,
  };
}
