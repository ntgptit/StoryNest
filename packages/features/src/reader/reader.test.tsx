import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { withAuth } from "../_shared/test-auth.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import type { ChapterListItem } from "../story/index.ts";
import { getChapterContent } from "./api/reader.api.ts";
import {
  adjacentChapters,
  blockAnchor,
  parseMarks,
  splitByMarks,
  toChapterContent,
  type BlockRow,
  type ChapterContentRow,
} from "./model/chapter.ts";
import { ReaderScreen } from "./index.ts";
import { readerText } from "./strings.ts";

afterEach(cleanup);

const STORY_ID = "5eed0000-0000-4000-8000-00000000b003";
const bid = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const block = (n: number, overrides: Partial<BlockRow> = {}): BlockRow => ({
  block_id: bid(n),
  sort_order: n,
  block_type: "paragraph",
  text_content: `Đoạn ${n}`,
  rich_text: null,
  image_storage_key: null,
  ...overrides,
});

const chapterRow = (overrides: Partial<ChapterContentRow> = {}): ChapterContentRow => ({
  id: "c0000000-0000-4000-8000-000000000002",
  slug: "chuong-2",
  sort_order: 2,
  first_published_at: "2026-11-02T00:00:00+00:00",
  version: { title: "Tấm bản đồ", word_count: 45, blocks: [block(1), block(2)] },
  ...overrides,
});

describe("splitByMarks", () => {
  it("returns plain text as one segment and nothing for empty text", () => {
    expect(splitByMarks("abc", [])).toEqual([{ text: "abc", marks: [] }]);
    expect(splitByMarks("", [])).toEqual([]);
  });

  it("cuts at mark boundaries and lets marks overlap", () => {
    const segments = splitByMarks("abcdef", [
      { type: "bold", from: 0, to: 4 },
      { type: "italic", from: 2, to: 6 },
    ]);
    expect(segments).toEqual([
      { text: "ab", marks: ["bold"] },
      { text: "cd", marks: ["bold", "italic"] },
      { text: "ef", marks: ["italic"] },
    ]);
    expect(segments.map((s) => s.text).join("")).toBe("abcdef");
  });

  it("clamps ranges to the text and ignores empty or inverted ranges", () => {
    expect(splitByMarks("abc", [{ type: "bold", from: 1, to: 99 }])).toEqual([
      { text: "a", marks: [] },
      { text: "bc", marks: ["bold"] },
    ]);
    expect(
      splitByMarks("abc", [
        { type: "bold", from: 2, to: 2 },
        { type: "italic", from: 3, to: 1 },
      ]),
    ).toEqual([{ text: "abc", marks: [] }]);
  });
});

describe("parseMarks", () => {
  it("reads the RPC shape and drops anything malformed instead of failing the chapter", () => {
    expect(parseMarks({ marks: [{ type: "bold", from: 0, to: 2 }] })).toEqual([{ type: "bold", from: 0, to: 2 }]);
    expect(parseMarks(null)).toEqual([]);
    expect(parseMarks({ marks: "x" })).toEqual([]);
    expect(
      parseMarks({ marks: [{ type: "blink", from: 0, to: 2 }, { type: "bold", from: "0", to: 2 }, null] }),
    ).toEqual([]);
  });
});

describe("toChapterContent", () => {
  it("orders blocks by sort_order, skips unknown or image-without-key blocks and keeps every block id", () => {
    const content = toChapterContent(
      chapterRow({
        version: {
          title: "T",
          word_count: 3,
          blocks: [
            block(3, { block_type: "divider", text_content: null }),
            block(1),
            block(4, { block_type: "hologram" }),
            block(5, { block_type: "image", text_content: null, image_storage_key: null }),
            block(2, { block_type: "image", text_content: null, image_storage_key: "a/b.png" }),
          ],
        },
      }),
    );
    expect(content.blocks.map((b) => [b.id, b.type])).toEqual([
      [bid(1), "paragraph"],
      [bid(2), "image"],
      [bid(3), "divider"],
    ]);
    expect(content.number).toBe(2);
  });

  it("gives every block a stable anchor derived from its permanent id", () => {
    expect(blockAnchor(bid(7))).toBe(`b-${bid(7)}`);
  });
});

const item = (n: number): ChapterListItem => ({
  id: `c${n}`,
  slug: `chuong-${n}`,
  number: n,
  title: `Tựa ${n}`,
  wordCount: 10,
  publishedAt: null,
});

describe("adjacentChapters", () => {
  it("finds neighbours by position, none at the ends or for an unknown slug", () => {
    const list = [item(1), item(2), item(5)];
    expect(adjacentChapters(list, "chuong-2")).toEqual({ previous: list[0], next: list[2] });
    expect(adjacentChapters(list, "chuong-1")).toEqual({ previous: null, next: list[1] });
    expect(adjacentChapters(list, "chuong-5")).toEqual({ previous: list[1], next: null });
    expect(adjacentChapters(list, "nope")).toEqual({ previous: null, next: null });
  });
});

type Call = [string, unknown[]];
function builderFor(respond: () => { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order", "returns"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.maybeSingle = () => Promise.resolve(respond());
  builder.then = (resolve: (value: unknown) => unknown) => resolve(respond());
  return { calls, builder };
}
const args = (calls: Call[], method: string) => calls.filter(([m]) => m === method).map(([, a]) => a);

describe("getChapterContent", () => {
  it("asks for the published, non-deleted chapter of that story by slug, with its blocks, in one query", async () => {
    const chapters = builderFor(() => ({ data: chapterRow(), error: null }));
    const client = { from: () => chapters.builder } as unknown as DataClient;
    const content = await getChapterContent(client, STORY_ID, "chuong-2");
    expect(args(chapters.calls, "eq")).toEqual([
      ["story_id", STORY_ID],
      ["slug", "chuong-2"],
      ["status", "published"],
    ]);
    expect(args(chapters.calls, "is")).toContainEqual(["deleted_at", null]);
    expect(args(chapters.calls, "select")).toHaveLength(1);
    const select = String(args(chapters.calls, "select")[0]?.[0]);
    // A real bug once glued two columns together ("first_published_atversion"): every top-level item must be
    // separated by a comma, and the parentheses must balance.
    expect(select).toContain("first_published_at, version:chapter_versions!fk_chapter_published_version(");
    expect(select).toContain("blocks:chapter_version_blocks(");
    expect(select.split("(").length).toBe(select.split(")").length);
    expect(content?.blocks).toHaveLength(2);
  });

  it("is null for a missing chapter, a chapter without a published version, and bad input (no query at all)", async () => {
    const missing = builderFor(() => ({ data: null, error: null }));
    expect(await getChapterContent({ from: () => missing.builder } as unknown as DataClient, STORY_ID, "x")).toBeNull();

    const noVersion = builderFor(() => ({ data: chapterRow({ version: null }), error: null }));
    expect(
      await getChapterContent({ from: () => noVersion.builder } as unknown as DataClient, STORY_ID, "x"),
    ).toBeNull();

    const from = vi.fn();
    const client = { from } as unknown as DataClient;
    expect(await getChapterContent(client, "nope", "x")).toBeNull();
    expect(await getChapterContent(client, STORY_ID, "")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("surfaces a database error instead of reporting the chapter as missing", async () => {
    const failing = builderFor(() => ({ data: null, error: { message: "x", code: "XX000" } }));
    await expect(
      getChapterContent({ from: () => failing.builder } as unknown as DataClient, STORY_ID, "x"),
    ).rejects.toBeDefined();
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

const storyRow = {
  id: STORY_ID,
  slug: "rung-suong-mu",
  title: "Rừng sương mù",
  synopsis: "",
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T00:00:01+00:00",
  created_at: "2026-11-01T00:00:00+00:00",
  visibility: "public",
  owner: { username: "a", display_name: "An" },
  category: null,
  stats: null,
  story_tags: [],
};
const listRows = [1, 2, 3].map((n) => ({
  id: `c${n}`,
  slug: `chuong-${n}`,
  sort_order: n,
  first_published_at: null,
  version: { title: `Tựa ${n}`, word_count: 10 },
}));

function screenClient(chapter: () => { data: unknown; error: unknown }) {
  const stories = builderFor(() => ({ data: storyRow, error: null }));
  const chapters = builderFor(chapter);
  // The list query has no maybeSingle and is awaited; the reader's single-chapter query calls maybeSingle.
  const originalThen = chapters.builder.then;
  let selected = "";
  chapters.builder.select = (cols: string) => {
    selected = cols;
    return chapters.builder;
  };
  chapters.builder.then = (resolve: (value: unknown) => unknown) =>
    selected.includes("chapter_version_blocks")
      ? (originalThen as typeof resolve)(resolve)
      : resolve({ data: listRows, error: null });
  const stats = builderFor(() => ({ data: { votes: 3 }, error: null }));
  const from = (name: string) =>
    name === "stories" ? stories.builder : name === "chapter_stats" ? stats.builder : chapters.builder;
  return withAuth({ from }, null);
}

function renderReader(client: DataClient, imageUrlFor?: (key: string) => string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>
              <ReaderScreen storyId={STORY_ID} chapterSlug="chuong-2" imageUrlFor={imageUrlFor} />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("ReaderScreen", () => {
  it("renders the title, blocks with stable anchors, marks, images and prev/next links", async () => {
    const row = chapterRow({
      version: {
        title: "Tấm bản đồ",
        word_count: 10,
        blocks: [
          block(1, { text_content: "Chữ đậm thường", rich_text: { marks: [{ type: "bold", from: 0, to: 7 }] } }),
          block(2, { block_type: "heading", text_content: "Tiểu đề" }),
          block(3, { block_type: "image", text_content: null, image_storage_key: "x.png" }),
          block(4, { block_type: "divider", text_content: null }),
        ],
      },
    });
    renderReader(
      screenClient(() => ({ data: row, error: null })),
      (key) => `https://cdn.test/${key}`,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" })).toBeTruthy();
    const bold = document.querySelector(`#${blockAnchor(bid(1))} strong`);
    expect(bold?.textContent).toBe("Chữ đậm");
    expect(document.querySelector(`#${blockAnchor(bid(2))}`)?.tagName).toBe("H2");
    expect(document.querySelector(`#${blockAnchor(bid(3))} img`)?.getAttribute("src")).toBe("https://cdn.test/x.png");
    expect(document.querySelector(`#${blockAnchor(bid(4))}`)?.tagName).toBe("HR");

    const prev = await screen.findByRole("link", { name: readerText.nav.previous });
    const next = await screen.findByRole("link", { name: readerText.nav.next });
    expect(prev.getAttribute("href")).toBe(`/story/${STORY_ID}/rung-suong-mu/chuong-1`);
    expect(next.getAttribute("href")).toBe(`/story/${STORY_ID}/rung-suong-mu/chuong-3`);
    expect(screen.getByRole("progressbar", { name: readerText.progress })).toBeTruthy();
  });

  it("does not turn database text into HTML", async () => {
    const row = chapterRow({
      version: { title: "T", word_count: 1, blocks: [block(1, { text_content: "<img src=x onerror=alert(1)>" })] },
    });
    renderReader(screenClient(() => ({ data: row, error: null })));
    await screen.findByRole("heading", { level: 1, name: "T" });
    expect(document.querySelector(`#${blockAnchor(bid(1))} img`)).toBeNull();
    expect(document.querySelector(`#${blockAnchor(bid(1))}`)?.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("shows not-found for a hidden chapter and a retryable error when loading fails", async () => {
    renderReader(screenClient(() => ({ data: null, error: null })));
    expect(await screen.findByText(readerText.notFound.title)).toBeTruthy();
    cleanup();

    renderReader(screenClient(() => ({ data: null, error: { message: "x", code: "XX000" } })));
    await waitFor(() => expect(screen.getByText(readerText.error.title)).toBeTruthy());
  });
});

describe("server/client boundary", () => {
  it('queries.ts (called from a Server Component) must not be a "use client" module', () => {
    expect(readFileSync("src/reader/queries.ts", "utf8")).not.toMatch(/^\s*["']use client["']/m);
    expect(readFileSync("src/reader/hooks/use-chapter.ts", "utf8")).toMatch(/^"use client"/);
  });
});
