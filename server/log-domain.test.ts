import { describe, expect, it } from "vitest";
import { validateLogPayload } from "../app/log-domain";

const base = { type: "decision", content: "Решили запустить rollout", occurredAt: "2026-08-24T14:30:00.000Z" };

describe("log payload validation", () => {
  it("accepts decisions with valid sources", () => {
    expect(validateLogPayload({ ...base, sources: [{ label: "Slack", url: "https://example.com/thread" }] })).toBeNull();
  });

  it("rejects missing content and unsafe source protocols", () => {
    expect(validateLogPayload({ ...base, content: "" })).toContain("обязателен");
    expect(validateLogPayload({ ...base, sources: [{ label: "File", url: "file:///secret" }] })).toContain("http");
  });

  it("validates type-specific statuses", () => {
    expect(validateLogPayload({ ...base, type: "task", status: "blocked" })).toContain("статус задачи");
    expect(validateLogPayload({ ...base, type: "question", status: "resolved", completionPersonId: "person-1" })).toBeNull();
    expect(validateLogPayload({ ...base, type: "question", status: "resolved" })).toContain("кто решил");
  });

  it("accepts an optional description and limits its size", () => {
    expect(validateLogPayload({ ...base, description: "Подробный контекст для @core и #quotes" })).toBeNull();
    expect(validateLogPayload({ ...base, description: "x".repeat(20_001) })).toContain("20 000");
  });
});
