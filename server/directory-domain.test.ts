import { describe, expect, it } from "vitest";
import { defaultProjectColor, generatePersonAlias, generateProjectSlug, isProjectColor, normalizeHandle, projectColorHex, validateHandle } from "../app/directory-domain";

describe("directory handles", () => {
  it("normalizes mention prefixes and case", () => {
    expect(normalizeHandle("  @Roman_B  ")).toBe("roman_b");
    expect(normalizeHandle("#Approvals")).toBe("approvals");
  });

  it("accepts stable aliases and slugs", () => {
    expect(validateHandle("alex.morgan", "alias")).toBeNull();
    expect(validateHandle("product_2026", "slug")).toBeNull();
  });

  it("generates Slack-style defaults from display names", () => {
    expect(generatePersonAlias("Alex Morgan")).toBe("alex.morgan");
    expect(generatePersonAlias(" José  García ")).toBe("jose.garcia");
    expect(generateProjectSlug("Content Editing Form")).toBe("content_editing_form");
  });

  it("rejects short, non-latin, and whitespace handles", () => {
    expect(validateHandle("a", "alias")).toContain("2–40");
    expect(validateHandle("Алекс", "alias")).toContain("латинских");
    expect(validateHandle("product team", "slug")).toContain("латинских");
    expect(validateHandle("content.editing", "slug")).toContain("_ или -");
  });

  it("keeps project colors inside the dedicated non-blue/green palette", () => {
    const color = defaultProjectColor("project-id");
    expect(isProjectColor(color)).toBe(true);
    expect(projectColorHex(color)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(["blue", "green"]).not.toContain(color);
  });
});
