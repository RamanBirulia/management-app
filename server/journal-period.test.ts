import { describe, expect, it } from "vitest";
import { groupEntriesByProject, isoWeekRange } from "../app/journal-period";
import type { LogEntry } from "../app/log-domain";

const entry = (id: string, projects: LogEntry["projects"]): LogEntry => ({ id, type: "decision", content: id, description: "", occurredAt: "2026-08-24T08:00:00Z", status: null, assigneeId: null, dueDate: null, completedAt: null, completedByPersonId: null, resolvedAt: null, resolvedByPersonId: null, createdAt: "", updatedAt: "", people: [], projects, sources: [] });

describe("journal periods", () => {
  it("uses ISO Monday–Sunday weeks across year boundaries", () => { expect(isoWeekRange("2027-01-01")).toEqual({ from: "2026-12-28", to: "2027-01-03" }); });
  it("shows a multi-project entry in both groups without changing the unique source set", () => {
    const projects = [{ id: "a", name: "Alpha", slug: "alpha" }, { id: "b", name: "Beta", slug: "beta" }]; const entries = [entry("one", projects), entry("two", [])]; const groups = groupEntriesByProject(entries);
    expect(groups.map((group) => [group.key, group.entries.length])).toEqual([["a", 1], ["b", 1], ["unassigned", 1]]); expect(new Set(entries.map((item) => item.id)).size).toBe(2);
  });
});
