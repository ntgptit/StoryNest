import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  countStories: vi.fn(),
  countChapters: vi.fn(),
  listStories: vi.fn(),
  listChapters: vi.fn(),
  createAnonymousClient: vi.fn(() => ({ anonymous: true })),
}));
vi.mock("@/lib/seo/sitemap-data", () => data);

import robots, { DISALLOWED_PATHS } from "./robots.ts";
import sitemap, { generateSitemaps } from "./sitemap.ts";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  for (const fn of Object.values(data)) fn.mockReset();
  data.createAnonymousClient.mockReturnValue({ anonymous: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("generateSitemaps", () => {
  it("makes one file per page of stories and of chapters", async () => {
    data.countStories.mockResolvedValue(5001);
    data.countChapters.mockResolvedValue(10);
    expect(await generateSitemaps()).toEqual([{ id: "stories-0" }, { id: "stories-1" }, { id: "chapters-0" }]);
  });

  it("still makes the first file when nothing is configured, and asks nothing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await generateSitemaps()).toEqual([{ id: "stories-0" }]);
    expect(data.countStories).not.toHaveBeenCalled();
  });
});

describe("sitemap", () => {
  it("lists a page of stories, with the fixed pages only on the first", async () => {
    data.listStories.mockResolvedValue([{ id: "1", slug: "a", updated_at: "2026-11-04T10:00:00+00:00" }]);
    const first = await sitemap({ id: Promise.resolve("stories-0") });
    expect(first.map((e) => e.url)).toEqual([
      "https://site.test/",
      "https://site.test/ranking",
      "https://site.test/story/1/a",
    ]);
    expect(data.listStories).toHaveBeenCalledWith({ anonymous: true }, 0);
    const second = await sitemap({ id: Promise.resolve("stories-1") });
    expect(second.map((e) => e.url)).toEqual(["https://site.test/story/1/a"]);
    expect(data.listStories).toHaveBeenLastCalledWith({ anonymous: true }, 1);
  });

  it("lists a page of chapters under their stories", async () => {
    data.listChapters.mockResolvedValue([
      { slug: "chuong-1", updated_at: "2026-11-04T10:00:00+00:00", story: { id: "1", slug: "a" } },
    ]);
    const entries = await sitemap({ id: Promise.resolve("chapters-2") });
    expect(entries.map((e) => e.url)).toEqual(["https://site.test/story/1/a/chuong-1"]);
    expect(data.listChapters).toHaveBeenCalledWith({ anonymous: true }, 2);
  });

  it("answers an id it does not know with an empty file, and queries nothing", async () => {
    expect(await sitemap({ id: Promise.resolve("nonsense") })).toEqual([]);
    expect(data.listStories).not.toHaveBeenCalled();
    expect(data.listChapters).not.toHaveBeenCalled();
  });

  it("is only the fixed pages when nothing is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const entries = await sitemap({ id: Promise.resolve("stories-0") });
    expect(entries.map((e) => e.url)).toEqual(["https://site.test/", "https://site.test/ranking"]);
    expect(await sitemap({ id: Promise.resolve("chapters-0") })).toEqual([]);
  });
});

describe("robots", () => {
  it("lets crawlers in, keeps them out of the private and technical areas, and points to every sitemap file", async () => {
    data.countStories.mockResolvedValue(5001);
    data.countChapters.mockResolvedValue(1);
    const result = await robots();
    expect(result.rules).toEqual({ userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] });
    expect(result.sitemap).toEqual([
      "https://site.test/sitemap/stories-0.xml",
      "https://site.test/sitemap/stories-1.xml",
      "https://site.test/sitemap/chapters-0.xml",
    ]);
  });

  it("disallows what only makes sense signed in", () => {
    for (const path of [
      "/studio",
      "/me",
      "/library",
      "/settings",
      "/notifications",
      "/moderation",
      "/search",
      "/login",
      "/auth",
    ]) {
      expect(DISALLOWED_PATHS).toContain(path);
    }
  });

  it("still answers when the counts cannot be read, pointing to the first file", async () => {
    data.countStories.mockRejectedValue(new Error("down"));
    data.countChapters.mockResolvedValue(0);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await robots();
    expect(result.sitemap).toEqual(["https://site.test/sitemap/stories-0.xml"]);
    spy.mockRestore();
  });
});
