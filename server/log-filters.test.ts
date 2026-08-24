import { describe, expect, it } from "vitest";
import { parseLogFilters } from "../app/api/logs/log-filters";

describe("log filters", () => {
  it("deduplicates valid multi-select values and preserves entity ids", () => {
    const filters = parseLogFilters(new URLSearchParams("type=decision&type=task&type=nope&person=p1&person=p2&project=x"));
    expect(filters.types).toEqual(["decision", "task"]); expect(filters.personIds).toEqual(["p1", "p2"]); expect(filters.projectIds).toEqual(["x"]);
  });

  it("creates Tallinn date boundaries including daylight saving time", () => {
    const summer = parseLogFilters(new URLSearchParams("from=2026-08-24&to=2026-08-24"));
    expect(summer.fromIso).toBe("2026-08-23T21:00:00.000Z"); expect(summer.toIsoExclusive).toBe("2026-08-24T21:00:00.000Z");
    const winter = parseLogFilters(new URLSearchParams("from=2026-01-10"));
    expect(winter.fromIso).toBe("2026-01-09T22:00:00.000Z");
  });
});
