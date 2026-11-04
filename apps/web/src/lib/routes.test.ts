import { describe, expect, it } from "vitest";
import { CHAPTER_PATH_PATTERN } from "./routes.ts";

describe("CHAPTER_PATH_PATTERN", () => {
  it("matches a chapter URL, with or without a trailing slash", () => {
    expect(CHAPTER_PATH_PATTERN.test("/story/5eed0000-0000-4000-8000-00000000b003/rung-suong-mu/chuong-2")).toBe(true);
    expect(CHAPTER_PATH_PATTERN.test("/story/abc/slug/chuong-1/")).toBe(true);
  });

  it("does not match the home page, the story page, other pages or deeper paths", () => {
    for (const path of [
      "/",
      "/story/abc/slug",
      "/story/abc",
      "/me",
      "/login",
      "/story/abc/slug/chuong-1/extra",
      "/other/story/a/b/c",
    ]) {
      expect(CHAPTER_PATH_PATTERN.test(path), path).toBe(false);
    }
  });
});
