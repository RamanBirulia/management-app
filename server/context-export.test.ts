import { describe, expect, it } from "vitest";
import { CONTEXT_EXPORT_VERSION, describeExportFilters, formatContextExport } from "../app/context-export";
import type { LogEntry } from "../app/log-domain";

const entry: LogEntry = { id: "1", type: "task", content: "Ship #core with @roman", description: "Decision context", occurredAt: "2026-08-25T06:00:00.000Z", status: "done", assigneeId: "p1", dueDate: "2026-08-29", completedAt: "2026-08-25T13:40:00.000Z", completedByPersonId: "p1", resolvedAt: null, resolvedByPersonId: null, createdAt: "", updatedAt: "", people: [{ id: "p1", alias: "roman", displayName: "Roman" }], projects: [{ id: "pr1", slug: "core", name: "Core" }], teams: [], sources: [{ label: "Brief", url: "https://example.com/brief" }] };

describe("context export", () => {
  it("formats a versioned AI-ready record with completion and sources", () => {
    const text = formatContextExport([entry], { exportedAt: "2026-08-25T14:30:00.000Z", filters: "project=#core" });
    expect(text).toContain(`Format: ${CONTEXT_EXPORT_VERSION}`); expect(text).toContain("Records: 1"); expect(text).toContain("Ship #core with @roman"); expect(text).toContain("Completed:"); expect(text).toContain("https://example.com/brief");
  });
  it("describes multi-value filters with directory labels", () => {
    const params = new URLSearchParams("type=decision&type=task&project=pr1&from=2026-08-01&to=2026-08-25");
    expect(describeExportFilters(params, { projects: new Map([["pr1", "#core (Core)"]]) })).toBe("type=Decision,Task · projects=#core (Core) · period=2026-08-01—2026-08-25");
  });
});
