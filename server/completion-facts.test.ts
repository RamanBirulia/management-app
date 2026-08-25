import { describe, expect, it } from "vitest";
import { resolveCompletionFacts } from "../app/completion-facts";

describe("completion facts", () => {
  it("sets, preserves, clears, and replaces the last task completion", () => {
    const first = resolveCompletionFacts(null, { type: "task", status: "done", assigneeId: "p1" }, "2026-08-25T10:00:00Z");
    expect(first).toMatchObject({ completedAt: "2026-08-25T10:00:00Z", completedByPersonId: "p1" });
    const current = { type: "task" as const, status: "done", ...first };
    expect(resolveCompletionFacts(current, { type: "task", status: "done", completionPersonId: "p2" }, "2026-08-25T11:00:00Z")).toMatchObject({ completedAt: first.completedAt, completedByPersonId: "p2" });
    expect(resolveCompletionFacts(current, { type: "task", status: "open" })).toMatchObject({ completedAt: null, completedByPersonId: null });
    const reopened = { ...current, status: "open", completedAt: null, completedByPersonId: null };
    expect(resolveCompletionFacts(reopened, { type: "task", status: "done", completionPersonId: "p3" }, "2026-08-26T09:00:00Z")).toMatchObject({ completedAt: "2026-08-26T09:00:00Z", completedByPersonId: "p3" });
  });

  it("uses separate resolved facts for questions", () => {
    expect(resolveCompletionFacts(null, { type: "question", status: "resolved", completionPersonId: "p1" }, "2026-08-25T12:00:00Z")).toEqual({ completedAt: null, completedByPersonId: null, resolvedAt: "2026-08-25T12:00:00Z", resolvedByPersonId: "p1" });
  });
});
