import { describe, expect, it } from "vitest";

import { toTargetPreview } from "./model/target-preview.ts";

describe("toTargetPreview", () => {
  it("reads a removed story with its chapters", () => {
    const preview = toTargetPreview("story", {
      title: "T",
      synopsis: "S",
      status: "ongoing",
      deleted_at: "2026-11-14T00:00:00Z",
      owner: "an",
      chapters: [{ position: 1, title: "Một", status: "published", deleted: false }],
    });
    expect(preview).toMatchObject({ kind: "story", title: "T", deleted: true, owner: "an" });
    expect(preview?.kind === "story" && preview.chapters[0]?.title).toBe("Một");
  });

  it("reads a hidden comment, a chapter and an account, and ignores what it does not know", () => {
    expect(toTargetPreview("comment", { body: "b", status: "hidden", author: "x", extra: 1 })).toMatchObject({
      body: "b",
    });
    expect(toTargetPreview("chapter", { title: "c", story_title: "s", blocks: ["a", 3, "b"] })).toMatchObject({
      blocks: ["a", "b"],
    });
    expect(
      toTargetPreview("user", { username: "u", display_name: "U", bio: null, account_status: "suspended" }),
    ).toMatchObject({
      bio: "",
      accountStatus: "suspended",
    });
  });

  it("copes with an answer that is not an object", () => {
    expect(toTargetPreview("comment", null)).toMatchObject({ body: "" });
  });
});
