import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "../_shared/client.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { withAuth } from "../_shared/test-auth.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { adultContentText } from "../adult-content/index.ts";
import { NO_ADULT_CONTENT, setStoredAdultContent } from "../adult-content/model/store.ts";
import type { ChapterListItem } from "../story/index.ts";
import { getChapterContent } from "./api/reader.api.ts";
import {
  adjacentChapters,
  blockAnchor,
  isStoryFinished,
  parseMarks,
  splitByMarks,
  toChapterContent,
  type BlockRow,
  type ChapterContentRow,
} from "./model/chapter.ts";
import { ReaderScreen } from "./index.ts";
import { setReaderFocus } from "./hooks/use-reader-focus.ts";
import { READER_FOCUS_STORAGE_KEY, blockAtLine, stepFocus } from "./model/focus-mode.ts";
import { READING_WORDS_PER_MINUTE, timeLeft } from "./model/reading-time.ts";
import { readerText } from "./strings.ts";
import { firstUnreadBlock, readAloudProgress, readAloudQueue, speechLang } from "./model/read-aloud.ts";
import { chapterSections, currentSection } from "./model/sections.ts";

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

function screenClient(chapter: () => { data: unknown; error: unknown }, mature = false, status = "ongoing") {
  const stories = builderFor(() => ({ data: { ...storyRow, is_mature: mature, status }, error: null }));
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

function renderReader(client: DataClient, imageUrlFor?: (key: string) => string, chapterSlug = "chuong-2") {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>
              <ReaderScreen storyId={STORY_ID} chapterSlug={chapterSlug} imageUrlFor={imageUrlFor} />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("ReaderScreen: adult stories", () => {
  it("shows no chapter text while the story, which says whether it is adult, is still loading", async () => {
    setStoredAdultContent(NO_ADULT_CONTENT);
    const row = chapterRow({
      version: { title: "Chương người lớn", word_count: 10, blocks: [block(1, { text_content: "Nội dung 18+" })] },
    });
    const client = screenClient(() => ({ data: row, error: null }), true);
    // the chapter is there at once, the story only after a while
    const stories = (client as unknown as { from: (name: string) => Record<string, unknown> }).from("stories");
    const original = stories.maybeSingle as () => Promise<unknown>;
    stories.maybeSingle = () => new Promise((resolve) => setTimeout(() => resolve(original()), 200));
    renderReader(client);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(screen.queryByText("Nội dung 18+")).toBeNull();
    expect(screen.queryByRole("heading", { level: 1, name: "Chương người lớn" })).toBeNull();
    expect(await screen.findByText(adultContentText.gate.title)).toBeTruthy();
    expect(screen.queryByText("Nội dung 18+")).toBeNull();
  });

  it("shows nothing of an adult story's chapter until the reader confirms they are 18 or older", async () => {
    setStoredAdultContent(NO_ADULT_CONTENT);
    const row = chapterRow({
      version: { title: "Chương người lớn", word_count: 10, blocks: [block(1, { text_content: "Nội dung 18+" })] },
    });
    renderReader(screenClient(() => ({ data: row, error: null }), true));

    expect(await screen.findByText(adultContentText.gate.title)).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "Chương người lớn" })).toBeNull();
    expect(screen.queryByText("Nội dung 18+")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: adultContentText.gate.confirm }));
    expect(await screen.findByRole("heading", { level: 1, name: "Chương người lớn" })).toBeTruthy();
    expect(screen.getByText("Nội dung 18+")).toBeTruthy();
    setStoredAdultContent(NO_ADULT_CONTENT);
  });

  it("an ordinary story's chapter needs no confirmation", async () => {
    setStoredAdultContent(NO_ADULT_CONTENT);
    const row = chapterRow({
      version: { title: "Chương thường", word_count: 10, blocks: [block(1, { text_content: "Nội dung thường" })] },
    });
    renderReader(screenClient(() => ({ data: row, error: null }), false));
    expect(await screen.findByRole("heading", { level: 1, name: "Chương thường" })).toBeTruthy();
    expect(screen.queryByText(adultContentText.gate.title)).toBeNull();
  });
});

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
    expect(await screen.findByRole("button", { name: "Báo cáo chương" })).toBeTruthy();
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

describe("timeLeft", () => {
  it("is the unread words at the reading speed, rounded up, at least a minute until the end", () => {
    expect(timeLeft(READING_WORDS_PER_MINUTE * 10, 0)).toEqual({ minutes: 10, done: false });
    expect(timeLeft(READING_WORDS_PER_MINUTE * 10, 0.5)).toEqual({ minutes: 5, done: false });
    expect(timeLeft(READING_WORDS_PER_MINUTE * 10, 0.95)).toEqual({ minutes: 1, done: false });
    expect(timeLeft(45, 0)).toEqual({ minutes: 1, done: false });
  });

  it("is done at the end of the text, for a chapter without words, and ignores bad ratios", () => {
    expect(timeLeft(5000, 1)).toEqual({ minutes: 0, done: true });
    expect(timeLeft(5000, 0.99)).toEqual({ minutes: 0, done: true });
    expect(timeLeft(0, 0)).toEqual({ minutes: 0, done: true });
    expect(timeLeft(400, Number.NaN)).toEqual({ minutes: 2, done: false });
    expect(timeLeft(400, -3)).toEqual({ minutes: 2, done: false });
  });
});

describe("focus mode model", () => {
  it("picks the block crossing the reading line, or the nearest one across a gap", () => {
    const boxes = [
      { top: 0, bottom: 100 },
      { top: 120, bottom: 300 },
      { top: 320, bottom: 400 },
    ];
    expect(blockAtLine(boxes, 150)).toBe(1);
    expect(blockAtLine(boxes, 105)).toBe(0);
    expect(blockAtLine(boxes, 315)).toBe(2);
    expect(blockAtLine(boxes, 5000)).toBe(2);
    expect(blockAtLine(boxes, -50)).toBe(0);
    expect(blockAtLine([], 10)).toBe(-1);
  });

  it("steps one block at a time and stops at the ends", () => {
    expect(stepFocus(0, 1, 3)).toBe(1);
    expect(stepFocus(2, 1, 3)).toBe(2);
    expect(stepFocus(0, -1, 3)).toBe(0);
    expect(stepFocus(-1, 1, 3)).toBe(1);
    expect(stepFocus(0, 1, 0)).toBe(-1);
  });
});

describe("ReaderScreen: reading tools", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    setStoredAdultContent(NO_ADULT_CONTENT);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
    setReaderFocus(false);
  });

  const twoParagraphs = () =>
    chapterRow({
      version: {
        title: "Tấm bản đồ",
        word_count: READING_WORDS_PER_MINUTE * 3,
        blocks: [
          block(1, { text_content: "Sương phủ kín khu rừng." }),
          block(2, { text_content: "Cô mở tấm bản đồ ra." }),
          block(3, { block_type: "image", text_content: null, image_storage_key: "x.png" }),
        ],
      },
    });

  const select = (node: Node, from: number, to: number) => {
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  };

  it("shows the minutes left in the chapter text next to the progress bar, and a back-to-top button", async () => {
    // The text runs far below the first screen.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 5000 } as DOMRect);
    renderReader(screenClient(() => ({ data: twoParagraphs(), error: null })));
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    expect(screen.getByText(readerText.timeLeft.long(3))).toBeTruthy();
    expect(screen.getByText(readerText.timeLeft.short(3))).toBeTruthy();
    expect(document.querySelector("[data-slot=back-to-top]")?.getAttribute("aria-label")).toBe(readerText.backToTop);
  });

  it("opens a chapter image full screen", async () => {
    renderReader(
      screenClient(() => ({ data: twoParagraphs(), error: null })),
      (key) => `https://cdn.test/${key}`,
    );
    fireEvent.click(await screen.findByRole("button", { name: readerText.image.open }));
    const dialog = await screen.findByRole("dialog", { name: readerText.image.title });
    expect(dialog.querySelector("img")?.getAttribute("src")).toBe("https://cdn.test/x.png");
  });

  it("copies a quote selected in one paragraph with the story, chapter and a link to that paragraph", async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Range.prototype.getBoundingClientRect = () => ({ top: 300, bottom: 320, left: 20, width: 100 }) as DOMRect;
    renderReader(screenClient(() => ({ data: twoParagraphs(), error: null })));
    const paragraph = await screen.findByText("Cô mở tấm bản đồ ra.");
    select(paragraph.firstChild!, 0, 5);

    const toolbar = await screen.findByRole("toolbar", { name: readerText.quote.toolbar });
    fireEvent.click(within(toolbar).getByRole("button", { name: readerText.quote.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0]?.[0]).toBe(
      readerText.quote.text(
        "Cô mở",
        readerText.quote.source("Rừng sương mù", readerText.chapterLabel(2)),
        `https://app.test/story/${STORY_ID}/rung-suong-mu/chuong-2#${blockAnchor(bid(2))}`,
      ),
    );
  });

  it("opens the selected paragraph's comments from the quote tools, in a sheet at half height", async () => {
    Range.prototype.getBoundingClientRect = () => ({ top: 300, bottom: 320, left: 20, width: 100 }) as DOMRect;
    renderReader(screenClient(() => ({ data: twoParagraphs(), error: null })));
    const paragraph = await screen.findByText("Sương phủ kín khu rừng.");
    select(paragraph.firstChild!, 0, 6);
    const toolbar = await screen.findByRole("toolbar", { name: readerText.quote.toolbar });
    fireEvent.click(within(toolbar).getByRole("button", { name: readerText.quote.comment }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Sương phủ kín khu rừng.")).toBeTruthy();
    expect(sheet.getAttribute("data-detent")).toBe("half");
  });

  it("shows no quote tools for a selection across two paragraphs", async () => {
    Range.prototype.getBoundingClientRect = () => ({ top: 300, bottom: 320, left: 20, width: 100 }) as DOMRect;
    renderReader(screenClient(() => ({ data: twoParagraphs(), error: null })));
    const first = await screen.findByText("Sương phủ kín khu rừng.");
    const second = screen.getByText("Cô mở tấm bản đồ ra.");
    const range = document.createRange();
    range.setStart(first.firstChild!, 2);
    range.setEnd(second.firstChild!, 3);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("sweeps a highlighter over the paragraph a deep link lands on", async () => {
    window.history.replaceState(null, "", `/#${blockAnchor(bid(2))}`);
    renderReader(screenClient(() => ({ data: twoParagraphs(), error: null })));
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    await waitFor(() =>
      expect(document.querySelector(`#${blockAnchor(bid(2))} .highlight-sweep`)?.textContent).toBe(
        "Cô mở tấm bản đồ ra.",
      ),
    );
    expect(document.querySelector(`#${blockAnchor(bid(1))} .highlight-sweep`)).toBeNull();
  });

  it("focus mode is off by default, is turned on in the settings on this device, and dims all but one block", async () => {
    renderReader(screenClient(() => ({ data: twoParagraphs(), error: null })));
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    expect(document.querySelector("[data-dimmed=true]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: readerText.settings.open }));
    const toggle = await screen.findByRole("switch", { name: readerText.settings.focus });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(READER_FOCUS_STORAGE_KEY)).toBe("1");
    fireEvent.keyDown(toggle, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("switch")).toBeNull());

    // jsdom lays nothing out, so the first block is the nearest to the reading line.
    const first = document.getElementById(blockAnchor(bid(1)))!;
    const second = document.getElementById(blockAnchor(bid(2)))!;
    await waitFor(() => expect(second.getAttribute("data-dimmed")).toBe("true"));
    expect(first.hasAttribute("data-dimmed")).toBe(false);

    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(first.getAttribute("data-dimmed")).toBe("true");
    expect(second.hasAttribute("data-dimmed")).toBe(false);
    expect(window.scrollTo).toHaveBeenCalled();
  });
});

describe("read aloud, sections and the end of the story (model)", () => {
  const blocks = toChapterContent(
    chapterRow({
      version: {
        title: "T",
        word_count: 9,
        blocks: [
          block(1, { block_type: "heading", text_content: "Phần một" }),
          block(2, { text_content: "  Sương phủ.  " }),
          block(3, { block_type: "image", text_content: null, image_storage_key: "x.png" }),
          block(4, { text_content: "   " }),
          block(5, { block_type: "heading", text_content: "Phần hai" }),
          block(6, { block_type: "divider", text_content: null }),
        ],
      },
    }),
  ).blocks;

  it("reads the text blocks with something in them, in order, and starts at the first one below the bar", () => {
    expect(readAloudQueue(blocks)).toEqual([
      { id: bid(1), text: "Phần một" },
      { id: bid(2), text: "Sương phủ." },
      { id: bid(5), text: "Phần hai" },
    ]);
    expect(firstUnreadBlock([10, 40, 900], 64)).toBe(2);
    expect(firstUnreadBlock([10, 20], 64)).toBe(-1);
    expect(readAloudProgress(1, 4)).toBe(0.25);
    expect(readAloudProgress(0, 0)).toBe(0);
    expect(speechLang("vi")).toBe("vi-VN");
    expect(speechLang("en")).toBe("en-US");
  });

  it("lists the headings as sections and finds the one being read", () => {
    expect(chapterSections(blocks)).toEqual([
      { id: bid(1), label: "Phần một" },
      { id: bid(5), label: "Phần hai" },
    ]);
    expect(currentSection([], 100)).toBe(-1);
    expect(currentSection([300, 900], 200)).toBe(0); // still in the lead-in: the first section
    expect(currentSection([-500, 150, 900], 200)).toBe(1);
  });

  it("is the end of the story only on the last chapter of a completed story", () => {
    const list = [item(1), item(2), item(3)];
    expect(isStoryFinished("completed", list, "chuong-3")).toBe(true);
    expect(isStoryFinished("completed", list, "chuong-2")).toBe(false);
    expect(isStoryFinished("ongoing", list, "chuong-3")).toBe(false);
    expect(isStoryFinished("completed", [], "chuong-3")).toBe(false);
  });
});

describe("ReaderScreen: read aloud, outline and finish", () => {
  const spoken: string[] = [];
  let utterances: { text: string; lang: string; onend: (() => void) | null }[] = [];
  const speech = { speak: vi.fn(), cancel: vi.fn() };

  beforeEach(() => {
    setStoredAdultContent(NO_ADULT_CONTENT);
    spoken.length = 0;
    utterances = [];
    speech.speak.mockImplementation((u: { text: string }) => spoken.push(u.text));
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    delete (window as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  const withSpeech = () => {
    Object.defineProperty(window, "speechSynthesis", { value: speech, configurable: true, writable: true });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
        utterances.push(this);
      }
    };
  };

  const sectioned = (overrides: Partial<ChapterContentRow> = {}) =>
    chapterRow({
      version: {
        title: "Tấm bản đồ",
        word_count: 20,
        blocks: [
          block(1, { block_type: "heading", text_content: "Phần một" }),
          block(2, { text_content: "Sương phủ kín khu rừng." }),
          block(3, { block_type: "heading", text_content: "Phần hai" }),
          block(4, { text_content: "Cô mở tấm bản đồ ra." }),
        ],
      },
      ...overrides,
    });

  it("has no read-aloud button where the browser cannot speak", async () => {
    renderReader(screenClient(() => ({ data: sectioned(), error: null })));
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    expect(screen.queryByRole("button", { name: readerText.readAloud.play })).toBeNull();
  });

  it("reads the chapter aloud block by block in the app language, pauses and resumes where it stopped", async () => {
    withSpeech();
    renderReader(screenClient(() => ({ data: sectioned(), error: null })));
    const play = await screen.findByRole("button", { name: readerText.readAloud.play });
    fireEvent.click(play);
    expect(spoken).toEqual(["Phần một"]);
    expect(utterances[0]?.lang).toBe("vi-VN");
    act(() => utterances[0]?.onend?.());
    expect(spoken).toEqual(["Phần một", "Sương phủ kín khu rừng."]);

    fireEvent.click(screen.getByRole("button", { name: readerText.readAloud.pause }));
    expect(speech.cancel).toHaveBeenCalled();
    // The cancelled utterance's end event must not move the reading on.
    act(() => utterances[1]?.onend?.());
    expect(spoken).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: readerText.readAloud.play }));
    expect(spoken.at(-1)).toBe("Sương phủ kín khu rừng.");
  });

  it("outlines a chapter's sections in the contents sheet and goes to one", async () => {
    renderReader(screenClient(() => ({ data: sectioned(), error: null })));
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    fireEvent.click(screen.getByRole("button", { name: readerText.toc.open }));
    const outline = await screen.findByRole("navigation", { name: readerText.toc.inChapter });
    const entries = within(outline).getAllByRole("button");
    expect(entries.map((b) => b.textContent)).toEqual(["Phần một", "Phần hai"]);
    // jsdom lays nothing out: both headings sit at the top, above the reading line, so the later one is current.
    expect(entries.map((b) => b.getAttribute("aria-current"))).toEqual([null, "location"]);

    fireEvent.click(entries[1]!);
    await waitFor(() => expect(document.activeElement?.id).toBe(blockAnchor(bid(3))));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("shows no outline for a chapter with fewer than two headings", async () => {
    renderReader(screenClient(() => ({ data: chapterRow(), error: null })));
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    fireEvent.click(screen.getByRole("button", { name: readerText.toc.open }));
    await screen.findByText(readerText.toc.description);
    expect(screen.queryByRole("navigation", { name: readerText.toc.inChapter })).toBeNull();
    expect(screen.queryByRole("group", { name: readerText.toc.scrub })).toBeNull();
  });

  it("congratulates the reader under the last chapter of a completed story, and only there", async () => {
    const last = () => ({ data: chapterRow({ slug: "chuong-3", sort_order: 3 }), error: null });
    renderReader(screenClient(last, false, "completed"), undefined, "chuong-3");
    expect(await screen.findByRole("heading", { name: readerText.finished.title })).toBeTruthy();
    cleanup();

    renderReader(screenClient(last, false, "ongoing"), undefined, "chuong-3");
    await screen.findByRole("heading", { level: 1, name: "Tấm bản đồ" });
    expect(screen.queryByRole("heading", { name: readerText.finished.title })).toBeNull();
  });
});
