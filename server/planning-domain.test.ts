import { describe, expect, it } from "vitest";
import { inspectRanks, isValidRank } from "../app/planning-domain";

describe("planning health", () => {
  it("accepts the canonical fixed-width rank", () => { expect(isValidRank("00000000000000sg")).toBe(true); expect(isValidRank("tmp-rank")).toBe(false); });
  it("reports invalid and duplicate positions", () => {
    const issues = inspectRanks([{ id: "a", rank: "00000000000000sg" }, { id: "b", rank: "00000000000000sg" }, { id: "c", rank: "broken" }]);
    expect(issues.map((issue) => issue.code)).toEqual(["duplicate_rank", "invalid_rank"]);
  });
});
