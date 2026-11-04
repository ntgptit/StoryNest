import { describe, expect, it } from "vitest";

import {
  chapterEntries,
  FIXED_PATHS,
  parseSitemapId,
  SITEMAP_KIND,
  SITEMAP_PAGE_SIZE,
  sitemapId,
  sitemapIds,
  storyEntries,
} from "./sitemap.ts";

const url = (path: string) => `https://site.test${path}`;

describe("sitemap size", () => {
  it("stays well inside the 50,000 URLs a sitemap file may hold, and a story and its chapters never share a file", () => {
    expect(SITEMAP_PAGE_SIZE).toBeGreaterThan(0);
    expect(SITEMAP_PAGE_SIZE).toBeLessThanOrEqual(10_000);
    expect(SITEMAP_PAGE_SIZE + FIXED_PATHS.length).toBeLessThanOrEqual(50_000);
  });
});

describe("sitemap ids", () => {
  it("always has the first stories file, which holds the fixed pages", () => {
    expect(sitemapIds(0, 0)).toEqual(["stories-0"]);
  });

  it("splits stories and chapters into files of the page size", () => {
    expect(sitemapIds(SITEMAP_PAGE_SIZE, 1)).toEqual(["stories-0", "chapters-0"]);
    expect(sitemapIds(SITEMAP_PAGE_SIZE + 1, SITEMAP_PAGE_SIZE * 2)).toEqual([
      "stories-0",
      "stories-1",
      "chapters-0",
      "chapters-1",
    ]);
  });

  it("reads an id back, and refuses anything else", () => {
    expect(parseSitemapId(sitemapId(SITEMAP_KIND.CHAPTERS, 12))).toEqual({ kind: "chapters", page: 12 });
    expect(parseSitemapId("stories-0")).toEqual({ kind: "stories", page: 0 });
    for (const bad of ["", "stories", "stories-", "stories--1", "stories-x", "books-1", "stories-1234567", "../x"]) {
      expect(parseSitemapId(bad), bad).toBeNull();
    }
  });
});

describe("sitemap entries", () => {
  const rows = [
    { id: "1", slug: "a", updated_at: "2026-11-04T10:00:00+00:00" },
    { id: "2", slug: "b", updated_at: "not a date" },
  ];

  it("lists each story with its last change, and without one when the date is unreadable", () => {
    const entries = storyEntries(rows, url, false);
    expect(entries).toEqual([
      { url: "https://site.test/story/1/a", lastModified: new Date("2026-11-04T10:00:00+00:00") },
      { url: "https://site.test/story/2/b" },
    ]);
  });

  it("puts the fixed pages first, in the first file only", () => {
    const first = storyEntries(rows, url, true);
    expect(first.slice(0, FIXED_PATHS.length).map((e) => e.url)).toEqual(FIXED_PATHS.map(url));
    expect(first).toHaveLength(FIXED_PATHS.length + rows.length);
    expect(storyEntries(rows, url, false)).toHaveLength(rows.length);
  });

  it("lists chapters under their story, whether the story arrives as an object or a one-item list", () => {
    const entries = chapterEntries(
      [
        { slug: "chuong-1", updated_at: "2026-11-04T10:00:00+00:00", story: { id: "1", slug: "a" } },
        { slug: "chuong-2", updated_at: "2026-11-05T10:00:00+00:00", story: [{ id: "1", slug: "a" }] },
      ],
      url,
    );
    expect(entries.map((e) => e.url)).toEqual([
      "https://site.test/story/1/a/chuong-1",
      "https://site.test/story/1/a/chuong-2",
    ]);
  });

  it("skips a chapter whose story could not be read", () => {
    expect(chapterEntries([{ slug: "x", updated_at: "2026-11-04T10:00:00+00:00", story: null }], url)).toEqual([]);
    expect(chapterEntries([{ slug: "x", updated_at: "2026-11-04T10:00:00+00:00", story: [] }], url)).toEqual([]);
  });
});
