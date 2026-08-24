import { describe, expect, it } from "vitest";
import { normalizeHandle, validateHandle } from "../app/directory-domain";

describe("directory handles", () => {
  it("normalizes mention prefixes and case", () => {
    expect(normalizeHandle("  @Roman_B  ")).toBe("roman_b");
    expect(normalizeHandle("#Approvals")).toBe("approvals");
  });

  it("accepts stable aliases and slugs", () => {
    expect(validateHandle("alex-morgan", "alias")).toBeNull();
    expect(validateHandle("product_2026", "slug")).toBeNull();
  });

  it("rejects short, non-latin, and whitespace handles", () => {
    expect(validateHandle("a", "alias")).toContain("2–40");
    expect(validateHandle("Алекс", "alias")).toContain("латинских");
    expect(validateHandle("product team", "slug")).toContain("латинских");
  });
});
