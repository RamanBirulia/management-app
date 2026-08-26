import type { Project } from "./directory-domain";

export type PlanningScope = { id: string; teamId: string; teamName: string; teamAlias: string; projects: Project[] };
export type PlanningIssue = { code: "invalid_rank" | "duplicate_rank" | "empty_scope" | "scope_overlap" | "design_readiness"; message: string; itemId?: string; projectId?: string };

export function isValidRank(value: string) { return /^[0-9a-z]{16}$/.test(value); }

export function inspectRanks(items: Array<{ id: string; rank: string }>): PlanningIssue[] {
  const issues: PlanningIssue[] = []; const seen = new Set<string>();
  for (const item of items) {
    if (!isValidRank(item.rank)) issues.push({ code: "invalid_rank", itemId: item.id, message: "Задача не имеет валидного места в общей очереди." });
    else if (seen.has(item.rank)) issues.push({ code: "duplicate_rank", itemId: item.id, message: "Несколько задач занимают одно место в очереди." });
    seen.add(item.rank);
  }
  return issues;
}
