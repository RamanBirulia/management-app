import { describe, expect, it } from "vitest";
import { parseImportContract, parseImportText } from "../app/import-domain";

describe("reviewable import contract", () => {
  it("parses only explicitly typed plain-text lines", () => {
    expect(parseImportText("Decision: Ship v1\ncontext only\nTask: Write docs\nQuestion: Who owns rollout?")).toEqual([
      { type: "decision", content: "Ship v1", description: "" },
      { type: "task", content: "Write docs", description: "" },
      { type: "question", content: "Who owns rollout?", description: "" },
    ]);
  });

  it("rejects invalid structured suggestions without guessing", () => {
    expect(() => parseImportContract({ formatVersion: "1", title: "Test", sourceSystem: "jira", suggestions: [{ type: "idea", content: "No" }] })).toThrow();
    expect(() => parseImportContract({ formatVersion: "1", title: "Test", sourceSystem: "jira", suggestions: [{ type: "task", content: "Valid", externalUrl: "javascript:alert(1)" }] })).toThrow();
    expect(parseImportContract({ formatVersion: "1", title: "Test", sourceSystem: "jira", suggestions: [{ type: "task", content: "Valid", externalKey: "ML-1" }] }).suggestions[0]).toMatchObject({ type: "task", content: "Valid", description: "", externalKey: "ML-1" });
  });
});
