import { describe, expect, it } from "vitest";
import { decodeRank, nextRank, rankBetween, wouldCreateCycle } from "../app/work-item-domain";

describe("work item ranks", () => {
  it("creates a stable rank between neighbours", () => {
    const first = nextRank(); const third = nextRank(nextRank(first)); const middle = rankBetween(first, third);
    expect(middle).not.toBeNull(); expect(decodeRank(first) < decodeRank(middle!)).toBe(true); expect(decodeRank(middle!) < decodeRank(third)).toBe(true);
  });

  it("keeps appending ranks strictly ordered", () => { const first = nextRank(); expect(decodeRank(nextRank(first)) > decodeRank(first)).toBe(true); });
});

describe("work item tree", () => {
  const items = [{ id: "root", parentId: null }, { id: "child", parentId: "root" }, { id: "leaf", parentId: "child" }];
  it("rejects moving a node under its descendant", () => { expect(wouldCreateCycle(items, "root", "leaf")).toBe(true); });
  it("allows a valid subtree move", () => { expect(wouldCreateCycle(items, "leaf", "root")).toBe(false); });
});
