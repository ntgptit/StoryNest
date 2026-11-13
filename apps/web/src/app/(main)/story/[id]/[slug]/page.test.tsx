import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadStory: vi.fn(), loadChapter: vi.fn(), renamed: vi.fn() }));
vi.mock("@/lib/story/load-story", () => ({ loadStory: mocks.loadStory }));
vi.mock("@/lib/story/load-chapter", () => ({ loadChapter: mocks.loadChapter, loadRenamedChapterSlug: mocks.renamed }));
vi.mock("@/lib/covers", () => ({ getCoverUrlResolver: () => (key: string) => `https://cdn.test/${key}` }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  permanentRedirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));
vi.mock("@tanstack/react-query", () => ({ HydrationBoundary: () => null, dehydrate: () => ({}) }));
vi.mock("./story-view", () => ({ StoryView: () => null }));
vi.mock("./[chapterSlug]/reader-view", () => ({ ReaderView: () => null }));

import ChapterPage, { generateMetadata as chapterMetadata } from "./[chapterSlug]/page";
import StoryPage, { generateMetadata as storyMetadata } from "./page";

const story = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  slug: "rung",
  title: "Rừng sương mù",
  synopsis: "Một chuyến đi vào rừng.",
  coverStorageKey: "c.png",
  isMature: false,
  visibility: "public",
  languageCode: "vi",
  updatedAt: "2026-11-04T10:00:00+00:00",
  author: { username: "demo_an", displayName: "An Nhiên" },
  category: null,
  tags: [],
  ...overrides,
});
const chapter = { id: "c1", slug: "chuong-1", number: 1, title: "Mở đầu", blocks: [] };

const params = Promise.resolve({ id: "s1", slug: "rung", chapterSlug: "chuong-1" });

/** All the elements below a node, depth first. */
function walk(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((child) => walk(child, out));
  else if (isValidElement(node)) {
    out.push(node);
    walk((node.props as { children?: ReactNode }).children, out);
  }
  return out;
}
const jsonLd = (tree: ReactNode) =>
  walk(tree)
    .map((el) => el.props as { data?: Record<string, unknown> })
    .filter((props) => props.data && "@type" in props.data)
    .map((props) => props.data!);

beforeEach(() => {
  mocks.loadStory.mockReset();
  mocks.loadChapter.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.test");
});

describe("story page", () => {
  it("carries the Book markup with absolute links for a public story", async () => {
    mocks.loadStory.mockResolvedValue({ queryClient: {}, story: story() });
    const [book] = jsonLd(await StoryPage({ params }));
    expect(book).toMatchObject({
      "@type": "Book",
      url: "https://site.test/story/s1/rung",
      image: "https://cdn.test/c.png",
      author: { url: "https://site.test/author/demo_an" },
    });
  });

  it.each([
    ["unlisted", { visibility: "unlisted" }],
    ["private", { visibility: "private" }],
    ["adult", { isMature: true }],
  ])("has no structured data for a %s story", async (_name, overrides) => {
    mocks.loadStory.mockResolvedValue({ queryClient: {}, story: story(overrides) });
    expect(jsonLd(await StoryPage({ params }))).toEqual([]);
  });

  it("is a real 404 for a missing story and redirects a stale slug to the canonical address", async () => {
    mocks.loadStory.mockResolvedValue({ queryClient: {}, story: null });
    await expect(StoryPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    mocks.loadStory.mockResolvedValue({ queryClient: {}, story: story({ slug: "new-slug" }) });
    await expect(StoryPage({ params })).rejects.toThrow("NEXT_REDIRECT:/story/s1/new-slug");
  });

  it("asks search engines to index only a public, non-adult story, with a canonical address", async () => {
    mocks.loadStory.mockResolvedValue({ story: story() });
    const open = await storyMetadata({ params });
    expect(open.robots).toBeUndefined();
    expect(open.alternates?.canonical).toBe("/story/s1/rung");
    for (const overrides of [{ visibility: "unlisted" }, { isMature: true }]) {
      mocks.loadStory.mockResolvedValue({ story: story(overrides) });
      expect((await storyMetadata({ params })).robots).toEqual({ index: false, follow: false });
    }
    mocks.loadStory.mockResolvedValue({ story: null });
    expect((await storyMetadata({ params })).robots).toEqual({ index: false });
  });
});

describe("chapter page", () => {
  it("carries the Chapter markup, part of its Book, for a public story", async () => {
    mocks.loadChapter.mockResolvedValue({ queryClient: {}, story: story(), chapter });
    const [data] = jsonLd(await ChapterPage({ params }));
    expect(data).toMatchObject({
      "@type": "Chapter",
      url: "https://site.test/story/s1/rung/chuong-1",
      position: 1,
      isPartOf: { "@type": "Book", url: "https://site.test/story/s1/rung" },
    });
  });

  it.each([
    ["unlisted", { visibility: "unlisted" }],
    ["adult", { isMature: true }],
  ])("has no structured data for a chapter of a %s story", async (_name, overrides) => {
    mocks.loadChapter.mockResolvedValue({ queryClient: {}, story: story(overrides), chapter });
    expect(jsonLd(await ChapterPage({ params }))).toEqual([]);
  });

  it("keeps a chapter of an adult story out of search engines", async () => {
    mocks.loadChapter.mockResolvedValue({ story: story({ isMature: true }), chapter });
    expect((await chapterMetadata({ params })).robots).toEqual({ index: false, follow: false });
    mocks.loadChapter.mockResolvedValue({ story: story(), chapter });
    expect((await chapterMetadata({ params })).robots).toBeUndefined();
  });

  it("is a real 404 for a missing chapter", async () => {
    mocks.loadChapter.mockResolvedValue({ queryClient: {}, story: story(), chapter: null });
    mocks.renamed.mockResolvedValue(null);
    await expect(ChapterPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("redirects a renamed chapter's old address to its current one (308)", async () => {
    mocks.loadChapter.mockResolvedValue({ queryClient: {}, story: story(), chapter: null });
    mocks.renamed.mockResolvedValue("chuong-moi");
    await expect(ChapterPage({ params })).rejects.toThrow("NEXT_REDIRECT:/story/s1/rung/chuong-moi");
  });

  it("does not look the slug up when the story itself is missing", async () => {
    mocks.renamed.mockClear();
    mocks.loadChapter.mockResolvedValue({ queryClient: {}, story: null, chapter: null });
    await expect(ChapterPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.renamed).not.toHaveBeenCalled();
  });
});
