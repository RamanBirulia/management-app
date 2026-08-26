import { describe, expect, it } from "vitest";
import { normalizeSuggestions, parseImportText } from "../app/import-domain";

describe("reviewable import contract", () => {
  it("parses only explicitly typed plain-text lines", () => {
    expect(parseImportText("Decision: Ship v1\ncontext only\nTask: Write docs\nQuestion: Who owns rollout?")).toEqual([
      { type: "decision", content: "Ship v1" },
      { type: "task", content: "Write docs" },
      { type: "question", content: "Who owns rollout?" },
    ]);
  });

  it("rejects invalid structured suggestions without guessing", () => {
    expect(normalizeSuggestions([{ type: "task", content: "Valid" }, { type: "idea", content: "No" }, { type: "decision", content: "" }])).toEqual([
      { type: "task", content: "Valid", description: "", occurredAt: undefined, externalKey: undefined, externalUrl: undefined },
    ]);
  });
});
