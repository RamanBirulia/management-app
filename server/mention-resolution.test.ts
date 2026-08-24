import { describe, expect, it } from "vitest";
import { extractMentionHandles } from "../app/api/logs/mention-resolution";

describe("mention extraction", () => {
  it("extracts unique people and projects from natural text", () => {
    expect(extractMentionHandles("Discuss @alex.morgan and @new.person in #quotes, then #content_editing_form."))
      .toEqual({ people: ["alex.morgan", "new.person"], projects: ["quotes", "content_editing_form"] });
  });

  it("does not treat email addresses or invalid project dots as mentions", () => {
    expect(extractMentionHandles("mail alex@example.com and review #not.valid"))
      .toEqual({ people: [], projects: [] });
  });
});
