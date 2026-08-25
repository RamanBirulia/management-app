import type { LogEntry, LogPayload } from "./log-domain";

type CurrentCompletion = Pick<LogEntry, "type" | "status" | "completedAt" | "completedByPersonId" | "resolvedAt" | "resolvedByPersonId"> | null;

export function resolveCompletionFacts(current: CurrentCompletion, payload: LogPayload, now = new Date().toISOString()) {
  const completedAt = payload.type === "task" && payload.status === "done"
    ? current?.type === "task" && current.status === "done" && current.completedAt ? current.completedAt : now : null;
  const resolvedAt = payload.type === "question" && payload.status === "resolved"
    ? current?.type === "question" && current.status === "resolved" && current.resolvedAt ? current.resolvedAt : now : null;
  return {
    completedAt, completedByPersonId: completedAt ? payload.completionPersonId ?? payload.assigneeId ?? current?.completedByPersonId ?? null : null,
    resolvedAt, resolvedByPersonId: resolvedAt ? payload.completionPersonId ?? current?.resolvedByPersonId ?? null : null,
  };
}
