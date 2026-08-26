import type { ProjectColor } from "./directory-domain";
import type { LogSource } from "./log-domain";

export type WorkItemStatus = "active" | "done" | "cancelled";
export type WorkflowStage = "backlog" | "product" | "design" | "pbr" | "engineering";
export type WorkItemProject = { id: string; name: string; slug: string; color: ProjectColor };

export type WorkItem = {
  id: string; title: string; description: string; parentId: string | null;
  status: WorkItemStatus; workflowStage: WorkflowStage; assigneeId: string | null;
  dueDate: string | null; rank: string; sourceLogId: string | null;
  createdAt: string; updatedAt: string; projects: WorkItemProject[]; links: LogSource[];
};

export type WorkItemPayload = Partial<Pick<WorkItem, "title" | "description" | "parentId" | "status" | "workflowStage" | "assigneeId" | "dueDate">> & {
  projectIds?: string[]; links?: LogSource[]; beforeId?: string | null;
};

export function validateWorkItemPayload(payload: WorkItemPayload, partial = false) {
  if (!partial || payload.title !== undefined) {
    if (!payload.title?.trim()) return "Название задачи обязательно";
    if (payload.title.trim().length > 500) return "Название не должно превышать 500 символов";
  }
  if ((payload.description ?? "").length > 20_000) return "Описание не должно превышать 20 000 символов";
  if (payload.status && !["active", "done", "cancelled"].includes(payload.status)) return "Некорректный lifecycle status";
  if (payload.workflowStage && !["backlog", "product", "design", "pbr", "engineering"].includes(payload.workflowStage)) return "Некорректная стадия";
  for (const link of payload.links ?? []) {
    if (!link.label.trim()) return "Укажите название ссылки";
    try { const url = new URL(link.url); if (!/^https?:$/.test(url.protocol)) return "Ссылка должна использовать http или https"; }
    catch { return "Укажите корректный URL"; }
  }
  return null;
}

const WIDTH = 16; const STEP = BigInt(1024);
export function encodeRank(value: bigint) { return value.toString(36).padStart(WIDTH, "0"); }
export function decodeRank(value: string) { let result = BigInt(0); for (const char of value) result = result * BigInt(36) + BigInt(parseInt(char, 36)); return result; }
export function nextRank(last?: string | null) { return encodeRank(last ? decodeRank(last) + STEP : STEP); }
export function rankBetween(previous: string | null, next: string | null) {
  if (!previous) { const upper = next ? decodeRank(next) : STEP * BigInt(2); return upper > BigInt(1) ? encodeRank(upper / BigInt(2)) : null; }
  if (!next) return nextRank(previous);
  const low = decodeRank(previous); const high = decodeRank(next); return high - low > BigInt(1) ? encodeRank((low + high) / BigInt(2)) : null;
}

export function wouldCreateCycle(items: Pick<WorkItem, "id" | "parentId">[], id: string, parentId: string | null) {
  let cursor = parentId; const parents = new Map(items.map((item) => [item.id, item.parentId]));
  while (cursor) { if (cursor === id) return true; cursor = parents.get(cursor) ?? null; }
  return false;
}
