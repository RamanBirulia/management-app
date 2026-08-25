import { describe, expect, it } from "vitest";
import { extractMentionHandles, resolveMentionIds } from "../app/api/logs/mention-resolution";

describe("mention extraction", () => {
  it("extracts unique people and projects from natural text", () => {
    expect(extractMentionHandles("Discuss @alex.morgan and @new.person in #quotes, then #content_editing_form."))
      .toEqual({ people: ["alex.morgan", "new.person"], projects: ["quotes", "content_editing_form"] });
  });

  it("does not treat email addresses or invalid project dots as mentions", () => {
    expect(extractMentionHandles("mail alex@example.com and review #not.valid"))
      .toEqual({ people: [], projects: [] });
  });

  it("resolves an existing team without creating a person with the same @alias", async () => {
    const inserts: string[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async all() {
            if (sql.includes("FROM teams")) return { results: [{ id: "team-core", handle: "core" }] };
            return { results: [] };
          },
        };
      },
      async batch(statements: Array<{ sql?: string }>) { inserts.push(...statements.map((statement) => statement.sql ?? "insert")); return []; },
    } as unknown as D1Database;
    const result = await resolveMentionIds(db, "Обсудить с @core");
    expect(result).toEqual({ personIds: [], projectIds: [], teamIds: ["team-core"] });
    expect(inserts).toEqual([]);
  });
});
