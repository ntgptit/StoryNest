import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { getStory, listStoryChapters } from "./api/story.api.ts";
import {
  chapterHref,
  isIndexable,
  toChapterListItem,
  toStoryDetail,
  type ChapterRow,
  type StoryDetailRow,
} from "./model/story-detail.ts";
import { adultContentText } from "../adult-content/index.ts";
import { NO_ADULT_CONTENT, setStoredAdultContent } from "../adult-content/model/store.ts";
import { progressText } from "../progress/index.ts";
import { StoryScreen } from "./index.ts";
import { recommendationText } from "../recommendations/index.ts";
import { storyText } from "./strings.ts";

afterEach(cleanup);

const STORY_ID = "5eed0000-0000-4000-8000-000000000001";

const storyRow = (overrides: Partial<StoryDetailRow> = {}): StoryDetailRow => ({
  id: STORY_ID,
  slug: "rung-suong-mu",
  title: "Rừng sương mù",
  synopsis: "Một khu rừng.\nMột bí mật.",
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T00:00:01.123456+00:00",
  created_at: "2026-11-01T00:00:00+00:00",
  visibility: "public",
  owner: { username: "demo_an", display_name: "An Nhiên" },
  category: { slug: "gia-tuong", name: "Giả tưởng" },
  stats: { reads: 1500, votes: 56, comments: 3, followers: 7 },
  story_tags: [{ tag: { slug: "phieu-luu", display_name: "Phiêu lưu" } }],
  ...overrides,
});

const chapterRow = (n: number, overrides: Partial<ChapterRow> = {}): ChapterRow => ({
  id: `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  slug: `chuong-${n}`,
  sort_order: n,
  first_published_at: "2026-11-02T00:00:00+00:00",
  version: { title: `Tựa chương ${n}`, word_count: 1200 * n },
  ...overrides,
});

type Call = [string, unknown[]];

/** Query-builder double: records calls; `maybeSingle` and awaiting both resolve to `respond`'s answer. */
function table(respond: () => { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order", "returns"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.maybeSingle = () => {
    calls.push(["maybeSingle", []]);
    return Promise.resolve(respond());
  };
  builder.then = (resolve: (value: unknown) => unknown) => resolve(respond());
  return { calls, builder };
}

function clientFor(story: () => { data: unknown; error: unknown }, chapters: () => { data: unknown; error: unknown }) {
  const stories = table(story);
  const chapterTable = table(chapters);
  const from = vi.fn((name: string) => (name === "stories" ? stories.builder : chapterTable.builder));
  return { client: withAuth({ from }, null), stories: stories.calls, chapters: chapterTable.calls, from };
}

const args = (calls: Call[], method: string) => calls.filter(([m]) => m === method).map(([, a]) => a);

describe("getStory", () => {
  it("returns null without touching the database for an id that is not a uuid", async () => {
    const { client, from } = clientFor(
      () => ({ data: null, error: null }),
      () => ({ data: [], error: null }),
    );
    expect(await getStory(client, "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns null when the story is hidden or missing (RLS and a missing row look the same)", async () => {
    const { client } = clientFor(
      () => ({ data: null, error: null }),
      () => ({ data: [], error: null }),
    );
    expect(await getStory(client, STORY_ID)).toBeNull();
  });

  it("looks the story up by id, skips soft-deleted ones and loads author, category, counters and tags in one query", async () => {
    const { client, stories } = clientFor(
      () => ({ data: storyRow(), error: null }),
      () => ({ data: [], error: null }),
    );
    const story = await getStory(client, STORY_ID);
    expect(args(stories, "eq")).toContainEqual(["id", STORY_ID]);
    expect(args(stories, "is")).toContainEqual(["deleted_at", null]);
    expect(args(stories, "select")).toHaveLength(1);
    expect(String(args(stories, "select")[0]?.[0])).toContain("owner:app_users!stories_owner_id_fkey(");
    expect(story?.title).toBe("Rừng sương mù");
    expect(story?.author.displayName).toBe("An Nhiên");
    expect(story?.visibility).toBe("public");
  });

  it("surfaces a database error instead of pretending the story does not exist", async () => {
    const { client } = clientFor(
      () => ({ data: null, error: { message: "boom", code: "XX000" } }),
      () => ({ data: [], error: null }),
    );
    await expect(getStory(client, STORY_ID)).rejects.toBeDefined();
  });
});

describe("listStoryChapters", () => {
  it("lists only published, non-deleted chapters of that story in reading order", async () => {
    const { client, chapters } = clientFor(
      () => ({ data: null, error: null }),
      () => ({ data: [chapterRow(1), chapterRow(2)], error: null }),
    );
    const items = await listStoryChapters(client, STORY_ID);
    expect(args(chapters, "eq")).toContainEqual(["story_id", STORY_ID]);
    expect(args(chapters, "eq")).toContainEqual(["status", "published"]);
    expect(args(chapters, "is")).toContainEqual(["deleted_at", null]);
    expect(args(chapters, "order")).toEqual([["sort_order", { ascending: true }]]);
    expect(String(args(chapters, "select")[0]?.[0])).toContain("chapter_versions!fk_chapter_published_version(");
    expect(items.map((c) => c.number)).toEqual([1, 2]);
  });

  it("returns an empty list for an id that is not a uuid", async () => {
    const { client, from } = clientFor(
      () => ({ data: null, error: null }),
      () => ({ data: [], error: null }),
    );
    expect(await listStoryChapters(client, "x")).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("model", () => {
  it("only public stories are indexable (unlisted opens by link but is noindex)", () => {
    expect(isIndexable(toStoryDetail(storyRow({ visibility: "public" })))).toBe(true);
    expect(isIndexable(toStoryDetail(storyRow({ visibility: "unlisted" })))).toBe(false);
    expect(isIndexable(toStoryDetail(storyRow({ visibility: "private" })))).toBe(false);
  });

  it("an adult story is never offered to search engines, even when public", () => {
    expect(isIndexable(toStoryDetail(storyRow({ visibility: "public", is_mature: true })))).toBe(false);
    expect(isIndexable(toStoryDetail(storyRow({ visibility: "public", is_mature: false })))).toBe(true);
  });

  it("treats an unknown visibility as private (never indexable)", () => {
    expect(isIndexable(toStoryDetail(storyRow({ visibility: "weird" })))).toBe(false);
  });

  it("builds the chapter URL under the story URL and maps a chapter without a snapshot to an empty title", () => {
    expect(chapterHref({ id: STORY_ID, slug: "a" }, { slug: "chuong-1" })).toBe(`/story/${STORY_ID}/a/chuong-1`);
    expect(toChapterListItem(chapterRow(2, { version: null }))).toMatchObject({ number: 2, title: "", wordCount: 0 });
  });
});

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderScreen(client: DataClient) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>
              <StoryScreen storyId={STORY_ID} />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("StoryScreen: adult stories", () => {
  it("shows an adult story's page only after the reader confirms they are 18 or older", async () => {
    setStoredAdultContent(NO_ADULT_CONTENT);
    const { client } = clientFor(
      () => ({ data: storyRow({ is_mature: true }), error: null }),
      () => ({ data: [chapterRow(1)], error: null }),
    );
    renderScreen(client);
    expect(await screen.findByText(adultContentText.gate.title)).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "Rừng sương mù" })).toBeNull();
    expect(screen.queryByRole("link", { name: storyText.startReading })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: adultContentText.gate.confirm }));
    expect(await screen.findByRole("heading", { level: 1, name: "Rừng sương mù" })).toBeTruthy();
    setStoredAdultContent(NO_ADULT_CONTENT);
  });

  it("an ordinary story's page needs no confirmation", async () => {
    setStoredAdultContent(NO_ADULT_CONTENT);
    const { client } = clientFor(
      () => ({ data: storyRow(), error: null }),
      () => ({ data: [chapterRow(1)], error: null }),
    );
    renderScreen(client);
    expect(await screen.findByRole("heading", { level: 1, name: "Rừng sương mù" })).toBeTruthy();
    expect(screen.queryByText(adultContentText.gate.title)).toBeNull();
  });
});

describe("StoryScreen: suggestions", () => {
  it("ends with 'you may also like', each story with the reason", async () => {
    const stories = table(() => ({ data: storyRow(), error: null }));
    const chapterTable = table(() => ({ data: [chapterRow(1)], error: null }));
    // the suggested stories come from the same table through an `in` query: answer that one with a list
    const listed = {
      data: [{ ...storyRow(), id: "5eed0000-0000-4000-8000-000000000099", title: "Truyện gợi ý", slug: "goi-y" }],
      error: null,
    };
    (stories.builder as Record<string, unknown>).in = () => ({ returns: () => Promise.resolve(listed) });
    const from = vi.fn((name: string) => (name === "stories" ? stories.builder : chapterTable.builder));
    const rpc = vi.fn(() => {
      const promise = Promise.resolve({
        data: [
          { story_id: "5eed0000-0000-4000-8000-000000000099", reason: "shared_tags", detail: "Phiêu lưu", score: 3 },
        ],
        error: null,
      });
      return Object.assign(promise, { returns: () => promise });
    });
    renderScreen(withAuth({ from, rpc }, null));
    expect(await screen.findByRole("heading", { name: recommendationText.similarTitle })).toBeTruthy();
    expect(await screen.findByText("Truyện gợi ý")).toBeTruthy();
    expect(screen.getByText(recommendationText.reasons.sharedTags("Phiêu lưu"))).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith("similar_stories", expect.objectContaining({ p_story_id: STORY_ID }));
  });
});

describe("StoryScreen", () => {
  it("shows the facts, tags, the chapter list and a start button that opens the first chapter", async () => {
    const { client } = clientFor(
      () => ({ data: storyRow(), error: null }),
      () => ({ data: [chapterRow(1), chapterRow(2)], error: null }),
    );
    renderScreen(client);

    expect(await screen.findByRole("heading", { level: 1, name: "Rừng sương mù" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "An Nhiên" }).getAttribute("href")).toBe("/author/demo_an");
    expect(screen.getByText("Giả tưởng")).toBeTruthy();
    expect(screen.getByText("#Phiêu lưu")).toBeTruthy();
    expect(screen.getByRole("link", { name: storyText.tagLink("Phiêu lưu") }).getAttribute("href")).toBe(
      "/?tag=phieu-luu",
    );

    const start = await screen.findByRole("link", { name: storyText.startReading });
    expect(start.getAttribute("href")).toBe(`/story/${STORY_ID}/rung-suong-mu/chuong-1`);

    const chapterLinks = await screen.findAllByRole("link", { name: /Tựa chương/ });
    expect(chapterLinks.map((a) => a.getAttribute("href"))).toEqual([
      `/story/${STORY_ID}/rung-suong-mu/chuong-1`,
      `/story/${STORY_ID}/rung-suong-mu/chuong-2`,
    ]);
    expect(screen.getByText(storyText.chapterCount(2))).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Báo cáo truyện" })).toBeTruthy();
  });

  it("without published chapters there is no start button and a clear message", async () => {
    const { client } = clientFor(
      () => ({ data: storyRow(), error: null }),
      () => ({ data: [], error: null }),
    );
    renderScreen(client);
    expect(await screen.findByText(storyText.noChaptersYet)).toBeTruthy();
    expect(screen.queryByRole("link", { name: storyText.startReading })).toBeNull();
  });

  it("shows the not-found state when the story is hidden or missing", async () => {
    const { client } = clientFor(
      () => ({ data: null, error: null }),
      () => ({ data: [], error: null }),
    );
    renderScreen(client);
    expect(await screen.findByText(storyText.notFound.title)).toBeTruthy();
  });

  it("shows an error state with retry when loading fails, and a chapters error without hiding the story", async () => {
    const failing = clientFor(
      () => ({ data: null, error: { message: "x", code: "XX000" } }),
      () => ({ data: [], error: null }),
    );
    renderScreen(failing.client);
    expect(await screen.findByText(storyText.error.title)).toBeTruthy();
    cleanup();

    const chaptersFail = clientFor(
      () => ({ data: storyRow(), error: null }),
      () => ({ data: null, error: { message: "x", code: "XX000" } }),
    );
    renderScreen(chaptersFail.client);
    expect(await screen.findByRole("heading", { level: 1, name: "Rừng sương mù" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(storyText.chaptersError.title)).toBeTruthy());
  });
});

describe("StoryScreen continue reading", () => {
  /** Signed-in client: stories/chapters as usual, plus the two private progress tables. */
  function signedIn(storyProgress: unknown, chapterProgress: unknown) {
    const { client: base } = clientFor(
      () => ({ data: storyRow(), error: null }),
      () => ({ data: [chapterRow(1), chapterRow(2), chapterRow(3)], error: null }),
    );
    const one = (data: unknown) => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.maybeSingle = async () => ({ data, error: null });
      return b;
    };
    const from = (table: string) =>
      table === "user_story_progress"
        ? one(storyProgress)
        : table === "user_chapter_progress"
          ? one(chapterProgress)
          : (base as unknown as { from: (t: string) => unknown }).from(table);
    return withAuth({ from }, testSession());
  }

  it("offers to continue in the chapter the reader was in", async () => {
    renderScreen(signedIn({ current_chapter_id: chapterRow(2).id }, { completed_at: null }));
    const link = await screen.findByRole("link", { name: progressText.continueReading(2) });
    expect(link.getAttribute("href")).toBe(`/story/${STORY_ID}/rung-suong-mu/chuong-2`);
    expect(screen.queryByRole("link", { name: storyText.startReading })).toBeNull();
  });

  it("offers the next chapter when the current one was finished", async () => {
    renderScreen(signedIn({ current_chapter_id: chapterRow(2).id }, { completed_at: "2026-11-04T00:00:00Z" }));
    const link = await screen.findByRole("link", { name: progressText.continueReading(3) });
    expect(link.getAttribute("href")).toBe(`/story/${STORY_ID}/rung-suong-mu/chuong-3`);
  });

  it("keeps 'start reading' for a reader who has never opened the story", async () => {
    renderScreen(signedIn(null, null));
    expect(await screen.findByRole("link", { name: storyText.startReading })).toBeTruthy();
  });
});

describe("server/client boundary", () => {
  it('queries.ts (called from a Server Component) must not be a "use client" module', () => {
    const source = readFileSync("src/story/queries.ts", "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(readFileSync("src/story/hooks/use-story.ts", "utf8")).toMatch(/^"use client"/);
  });
});
