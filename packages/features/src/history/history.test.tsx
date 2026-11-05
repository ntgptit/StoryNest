import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { readBackup, writeBackup } from "../editor/model/local-backup.ts";
import { getVersionBlocks, listChapterVersions } from "./api/history.api.ts";
import { HistoryScreen, PreviewScreen } from "./index.ts";
import {
  DIFF_STATUS,
  bodyToReaderBlocks,
  diffBlocks,
  groupDiff,
  hasDifferences,
  historyErrorMessage,
  readerBlocksToBody,
  summarizeDiff,
  toChapterVersions,
} from "./model/history.ts";
import { historyText } from "./strings.ts";
import type { ReaderBlock } from "../reader/index.ts";

afterEach(cleanup);

const t = historyText;
const STORY_ID = "5eed0000-0000-4000-8000-00000000f001";
const CHAPTER_ID = "c0000000-0000-4000-8000-00000000f001";
const bid = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const vid = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const para = (
  n: number,
  text: string,
  marks: ReaderBlock extends never ? never : { type: "bold"; from: number; to: number }[] = [],
): ReaderBlock => ({
  id: bid(n),
  type: "paragraph",
  text,
  marks,
});

describe("history model", () => {
  it("round-trips a body through reader blocks, keeping block ids and marks", () => {
    const body = [
      {
        block_id: bid(1),
        type: "paragraph" as const,
        text: "Xin chào",
        marks: [{ type: "bold" as const, from: 0, to: 3 }],
      },
      { block_id: bid(2), type: "heading" as const, text: "Tiêu đề" },
      { block_id: bid(3), type: "divider" as const },
      { block_id: bid(4), type: "image" as const, image_storage_key: "s/a.jpg" },
    ];
    const blocks = bodyToReaderBlocks(body);
    expect(blocks.map((b) => b.id)).toEqual([bid(1), bid(2), bid(3), bid(4)]);
    expect(readerBlocksToBody(blocks)).toEqual(body);
  });

  it("refuses to turn an empty block list into a draft body", () => {
    expect(readerBlocksToBody([])).toBeNull();
  });

  it("matches blocks by id: same, changed (text or marks), added, removed", () => {
    const before = [para(1, "A"), para(2, "B"), para(3, "C")];
    const after = [para(1, "A"), para(2, "B đã sửa"), para(4, "D mới")];
    const diff = diffBlocks(before, after);
    expect(diff.map((d) => [d.status, d.block.id])).toEqual([
      [DIFF_STATUS.SAME, bid(1)],
      [DIFF_STATUS.CHANGED, bid(2)],
      [DIFF_STATUS.REMOVED, bid(3)],
      [DIFF_STATUS.ADDED, bid(4)],
    ]);
    expect(diff[1]?.previous).toMatchObject({ text: "B" });
    expect(summarizeDiff(diff)).toEqual({ added: 1, removed: 1, changed: 1 });
    expect(diffBlocks([para(1, "A", [{ type: "bold", from: 0, to: 1 }])], [para(1, "A")])[0]?.status).toBe(
      DIFF_STATUS.CHANGED,
    );
  });

  it("lists a removed block where it used to be", () => {
    const diff = diffBlocks([para(1, "A"), para(2, "B"), para(3, "C")], [para(1, "A"), para(3, "C")]);
    expect(diff.map((d) => [d.status, d.block.id])).toEqual([
      [DIFF_STATUS.SAME, bid(1)],
      [DIFF_STATUS.REMOVED, bid(2)],
      [DIFF_STATUS.SAME, bid(3)],
    ]);
    const first = diffBlocks([para(1, "A"), para(2, "B")], [para(2, "B")]);
    expect(first.map((d) => d.status)).toEqual([DIFF_STATUS.REMOVED, DIFF_STATUS.SAME]);
  });

  it("reports no difference for equal lists and a type change as a change", () => {
    expect(hasDifferences(summarizeDiff(diffBlocks([para(1, "A")], [para(1, "A")])))).toBe(false);
    const heading: ReaderBlock = { id: bid(1), type: "heading", text: "A", marks: [] };
    expect(diffBlocks([para(1, "A")], [heading])[0]?.status).toBe(DIFF_STATUS.CHANGED);
  });

  it("orders versions newest first, flags the live one, accepts the author as object or array", () => {
    const row = (n: number, author: unknown) => ({
      id: vid(n),
      version_no: n,
      title: `V${n}`,
      word_count: n * 10,
      created_at: "2026-11-04T00:00:00Z",
      published_at: "2026-11-04T00:00:00Z",
      author,
    });
    const list = toChapterVersions(
      [
        row(1, { username: "an", display_name: "" }),
        row(3, [{ username: "binh", display_name: "Bình" }]),
        row(2, null),
      ] as never,
      vid(3),
    );
    expect(list.map((v) => [v.number, v.live, v.authorName])).toEqual([
      [3, true, "Bình"],
      [2, false, ""],
      [1, false, "an"],
    ]);
  });

  it("explains a failure by kind", () => {
    expect(historyErrorMessage(new AppError("conflict", "x"))).toBe(t.errors.conflict);
    expect(historyErrorMessage(new AppError("forbidden", "x"))).toBe(t.errors.forbidden);
    expect(historyErrorMessage(new AppError("invalid", "x"))).toBe(t.errors.invalid);
    expect(historyErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

interface FakeOptions {
  draftStoryId?: string;
  draftBody?: unknown;
  draftRevision?: number;
  versions?: unknown[];
  liveVersionId?: string | null;
  blocks?: Record<string, unknown[]>;
  updateRows?: unknown[];
}

const blockRow = (n: number, text: string, order = n, extra: Record<string, unknown> = {}) => ({
  block_id: bid(n),
  sort_order: order,
  block_type: "paragraph",
  text_content: text,
  rich_text: null,
  image_storage_key: null,
  ...extra,
});
const versionRow = (n: number, extra: Record<string, unknown> = {}) => ({
  id: vid(n),
  version_no: n,
  title: `Tiêu đề v${n}`,
  word_count: 100 * n,
  created_at: "2026-11-04T00:00:00Z",
  published_at: "2026-11-04T00:00:00Z",
  author: { username: "tac_gia", display_name: "Tác Giả" },
  ...extra,
});

function fakeClient(options: FakeOptions = {}) {
  const updates: { values: Record<string, unknown>; eqs: [string, unknown][] }[] = [];
  const blockQueries: unknown[] = [];
  const draftBody = options.draftBody ?? [{ block_id: bid(1), type: "paragraph", text: "Bản nháp" }];
  const from = vi.fn((table: string) => {
    const eqs: [string, unknown][] = [];
    let updateValues: Record<string, unknown> | undefined;
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "order", "returns"]) builder[method] = () => builder;
    builder.eq = (column: string, value: unknown) => {
      eqs.push([column, value]);
      return builder;
    };
    builder.update = (values: Record<string, unknown>) => {
      updateValues = values;
      updates.push({ values, eqs });
      return builder;
    };
    builder.maybeSingle = () => {
      if (table === "chapters") {
        return Promise.resolve({ data: { published_version_id: options.liveVersionId ?? null }, error: null });
      }
      return Promise.resolve({
        data: {
          chapter_id: CHAPTER_ID,
          title: "Tiêu đề nháp",
          body: draftBody,
          revision: options.draftRevision ?? 4,
          chapter: { story_id: options.draftStoryId ?? STORY_ID },
        },
        error: null,
      });
    };
    builder.then = (resolve: (value: unknown) => unknown) => {
      if (updateValues)
        return resolve({ data: options.updateRows ?? [{ revision: updateValues.revision }], error: null });
      if (table === "chapter_versions") return resolve({ data: options.versions ?? [], error: null });
      const versionId = eqs.find(([column]) => column === "version_id")?.[1];
      blockQueries.push(versionId);
      return resolve({ data: options.blocks?.[versionId as string] ?? [], error: null });
    };
    return builder;
  });
  return { from, updates, blockQueries };
}

describe("history api", () => {
  it("lists versions newest first with the live one marked", async () => {
    const c = fakeClient({ versions: [versionRow(1), versionRow(2)], liveVersionId: vid(1) });
    const list = await listChapterVersions(c as unknown as DataClient, CHAPTER_ID);
    expect(list.map((v) => [v.number, v.live])).toEqual([
      [2, false],
      [1, true],
    ]);
  });

  it("reads one version's blocks in reading order and skips unknown block types", async () => {
    const c = fakeClient({
      blocks: { [vid(1)]: [blockRow(2, "B", 2), blockRow(1, "A", 1), blockRow(3, "?", 3, { block_type: "video" })] },
    });
    const blocks = await getVersionBlocks(c as unknown as DataClient, vid(1));
    expect(blocks.map((b) => b.id)).toEqual([bid(1), bid(2)]);
    expect(c.blockQueries).toEqual([vid(1)]);
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
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/studio" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderWith(c: ReturnType<typeof fakeClient>, ui: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  toasts.show.mockClear();
  localStorage.clear();
  // jsdom lacks what Radix Select calls when it opens.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

const twoVersions = (extra: Partial<FakeOptions> = {}) =>
  fakeClient({
    versions: [versionRow(1), versionRow(2)],
    liveVersionId: vid(2),
    blocks: {
      [vid(1)]: [blockRow(1, "Đoạn một cũ"), blockRow(2, "Đoạn hai")],
      [vid(2)]: [blockRow(1, "Đoạn một mới"), blockRow(2, "Đoạn hai"), blockRow(3, "Đoạn ba")],
    },
    draftBody: [
      { block_id: bid(1), type: "paragraph", text: "Đoạn một cũ" },
      { block_id: bid(4), type: "paragraph", text: "Chỉ có ở nháp" },
    ],
    ...extra,
  });

describe("HistoryScreen", () => {
  it("lists versions, newest first, marks the live one and opens the newest read-only", async () => {
    renderWith(twoVersions(), <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const list = await screen.findByRole("list", { name: t.listLabel });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("span.font-semibold")?.textContent)).toEqual([
      t.versionLabel(2),
      t.versionLabel(1),
    ]);
    expect(within(items[0]!).getByText(t.live)).toBeTruthy();
    expect(within(items[1]!).queryByText(t.live)).toBeNull();
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    expect(await within(viewer).findByText("Đoạn ba")).toBeTruthy();
    expect(within(viewer).queryByRole("textbox")).toBeNull(); // read-only: not an editor
  });

  it("switches to another version", async () => {
    renderWith(twoVersions(), <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(t.versionLabel(1)) }));
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(1) });
    expect(await within(viewer).findByText("Đoạn một cũ")).toBeTruthy();
    expect(within(viewer).queryByText("Đoạn ba")).toBeNull();
  });

  it("compares a version with the current draft", async () => {
    renderWith(twoVersions(), <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    fireEvent.click(within(viewer).getByRole("button", { name: t.view.compare }));
    // draft: [b1 "Đoạn một cũ", b4 "Chỉ có ở nháp"]  ->  v2: [b1 mới, b2, b3]
    expect(await within(viewer).findByText(t.compare.summary(2, 1, 1))).toBeTruthy();
    const diff = within(viewer).getByRole("list", { name: t.view.compare });
    const labels = within(diff)
      .getAllByRole("listitem")
      .map((li) => li.querySelector("span[data-slot=badge]")?.textContent);
    expect(labels).toEqual([t.compare.changed, t.compare.removed, t.compare.added, t.compare.added]);
  });

  it("compares a version with another version", async () => {
    renderWith(twoVersions(), <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    fireEvent.click(within(viewer).getByRole("button", { name: t.view.compare }));
    fireEvent.click(within(viewer).getByRole("combobox", { name: t.compare.against }));
    fireEvent.click(await screen.findByRole("option", { name: t.compare.version(1) }));
    expect(await within(viewer).findByText(t.compare.summary(1, 0, 1))).toBeTruthy();
  });

  it("restores a version into the draft only after confirmation, at the revision just read, keeping block ids", async () => {
    const c = twoVersions({ draftRevision: 7 });
    renderWith(c, <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    await within(viewer).findByText("Đoạn ba");
    fireEvent.click(within(viewer).getByRole("button", { name: t.restore.action }));
    expect(c.updates).toHaveLength(0);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.restore.confirm }));
    await waitFor(() => expect(c.updates).toHaveLength(1));
    const update = c.updates[0]!;
    expect(update.eqs).toEqual([
      ["chapter_id", CHAPTER_ID],
      ["revision", 7],
    ]);
    expect(update.values).toMatchObject({ title: "Tiêu đề v2", revision: 8, updated_by: TEST_USER_ID });
    expect((update.values.body as { block_id: string }[]).map((b) => b.block_id)).toEqual([bid(1), bid(2), bid(3)]);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.restore.done));
    expect(await screen.findByRole("link", { name: t.restore.openEditor })).toBeTruthy();
  });

  it("reports a conflict when the draft changed elsewhere and does not claim success", async () => {
    const c = twoVersions({ updateRows: [] });
    renderWith(c, <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    await within(viewer).findByText("Đoạn ba");
    fireEvent.click(within(viewer).getByRole("button", { name: t.restore.action }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: t.restore.confirm }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.conflict));
    expect(screen.queryByRole("link", { name: t.restore.openEditor })).toBeNull();
  });

  it("drops the stale local backup of the draft once restored", async () => {
    writeBackup(CHAPTER_ID, {
      baseRevision: 1,
      title: "Cũ",
      body: [{ block_id: bid(9), type: "paragraph", text: "Chưa lưu" }],
      savedAt: "2026-11-04T00:00:00Z",
    });
    expect(readBackup(CHAPTER_ID)).not.toBeNull();
    const c = twoVersions();
    renderWith(c, <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    await within(viewer).findByText("Đoạn ba");
    fireEvent.click(within(viewer).getByRole("button", { name: t.restore.action }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: t.restore.confirm }));
    await waitFor(() => expect(c.updates).toHaveLength(1));
    expect(readBackup(CHAPTER_ID)).toBeNull();
  });

  it("shows an empty state for a chapter never published, and not found for another story", async () => {
    renderWith(fakeClient({ versions: [] }), <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    expect(await screen.findByText(t.empty.title)).toBeTruthy();
    cleanup();
    renderWith(
      fakeClient({ draftStoryId: "someone-else" }),
      <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />,
    );
    expect(await screen.findByText(t.notFound.title)).toBeTruthy();
  });
});

describe("compare: differences only and change steps", () => {
  it("cuts the diff into unchanged runs and numbered changes, keeping the order", () => {
    const before = [para(1, "A"), para(2, "B"), para(3, "C"), para(4, "D"), para(5, "E")];
    const after = [para(1, "A sửa"), para(2, "B"), para(3, "C"), para(5, "E"), para(6, "F")];
    const segments = groupDiff(diffBlocks(before, after));
    expect(segments.map((s) => [s.kind, s.entries.length, s.kind === "change" ? s.index : null])).toEqual([
      ["change", 1, 0],
      ["same", 2, null],
      ["change", 1, 1], // D removed
      ["same", 1, null],
      ["change", 1, 2], // F added
    ]);
    expect(segments.flatMap((s) => s.entries)).toEqual(diffBlocks(before, after));
    expect(groupDiff([])).toEqual([]);
  });

  async function openCompareWithVersion1() {
    renderWith(twoVersions(), <HistoryScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    const viewer = await screen.findByRole("region", { name: t.viewerLabel(2) });
    fireEvent.click(within(viewer).getByRole("button", { name: t.view.compare }));
    fireEvent.click(within(viewer).getByRole("combobox", { name: t.compare.against }));
    fireEvent.click(await screen.findByRole("option", { name: t.compare.version(1) }));
    await within(viewer).findByText(t.compare.summary(1, 0, 1));
    return viewer;
  }

  it("folds unchanged paragraphs into one row that opens on its own", async () => {
    // v1 [b1 cũ, b2]  ->  v2 [b1 mới, b2, b3]: change, one unchanged paragraph, change
    const viewer = await openCompareWithVersion1();
    const unchanged = () => within(viewer).getByText("Đoạn hai").closest("li") as HTMLElement;
    expect(unchanged().hasAttribute("inert")).toBe(false);
    expect(within(viewer).queryByRole("button", { name: t.compare.unchanged(1) })).toBeNull();

    fireEvent.click(within(viewer).getByRole("switch", { name: t.compare.onlyChanges }));
    const fold = within(viewer).getByRole("button", { name: t.compare.unchanged(1) });
    expect(fold.getAttribute("aria-expanded")).toBe("false");
    expect(unchanged().hasAttribute("inert")).toBe(true);
    expect(fold.getAttribute("aria-controls")).toBe(unchanged().id);

    fireEvent.click(fold);
    expect(unchanged().hasAttribute("inert")).toBe(false);
    expect(
      within(viewer)
        .getByRole("button", { name: t.compare.hideUnchanged(1) })
        .getAttribute("aria-expanded"),
    ).toBe("true");

    fireEvent.click(within(viewer).getByRole("switch", { name: t.compare.onlyChanges }));
    expect(within(viewer).queryByRole("button", { name: t.compare.hideUnchanged(1) })).toBeNull();
    expect(unchanged().hasAttribute("inert")).toBe(false);
  });

  it("steps through the changes, moving focus to each", async () => {
    const viewer = await openCompareWithVersion1();
    expect(within(viewer).getByText(t.compare.changeCount(2))).toBeTruthy();
    const previous = within(viewer).getByRole("button", { name: t.compare.previousChange }) as HTMLButtonElement;
    const next = within(viewer).getByRole("button", { name: t.compare.nextChange }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    fireEvent.click(next);
    expect(within(viewer).getByText(t.compare.changePosition(1, 2))).toBeTruthy();
    expect(document.activeElement?.textContent).toContain("Đoạn một mới");
    fireEvent.click(next);
    expect(within(viewer).getByText(t.compare.changePosition(2, 2))).toBeTruthy();
    expect(document.activeElement?.textContent).toContain("Đoạn ba");
    expect(document.activeElement?.getAttribute("data-current")).toBe("true");
    expect(next.disabled).toBe(true);
    fireEvent.click(previous);
    expect(document.activeElement?.textContent).toContain("Đoạn một mới");
  });
});

describe("PreviewScreen", () => {
  it("draws the saved draft with the reader's blocks and says it is not published", async () => {
    const c = fakeClient({
      draftBody: [
        { block_id: bid(1), type: "heading", text: "Mở đầu" },
        { block_id: bid(2), type: "paragraph", text: "Nội dung nháp", marks: [{ type: "bold", from: 0, to: 3 }] },
        { block_id: bid(3), type: "divider" },
      ],
    });
    renderWith(c, <PreviewScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Tiêu đề nháp" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Mở đầu" })).toBeTruthy();
    expect(document.getElementById(`b-${bid(2)}`) ?? document.querySelector("p strong")).toBeTruthy();
    expect(screen.getByRole("note").textContent).toBe(t.preview.banner);
    expect(document.querySelector("article.reader-text")).toBeTruthy();
    expect(screen.getByRole("link", { name: t.preview.backToEditor }).getAttribute("href")).toBe(
      `/studio/story/${STORY_ID}/chapter/${CHAPTER_ID}`,
    );
  });

  it("shows an empty note for a draft nobody has written and not found for another story", async () => {
    renderWith(fakeClient({ draftBody: [] }), <PreviewScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    expect(await screen.findByText(t.preview.empty)).toBeTruthy();
    cleanup();
    renderWith(fakeClient({ draftStoryId: "x" }), <PreviewScreen storyId={STORY_ID} chapterId={CHAPTER_ID} />);
    expect(await screen.findByText(t.notFound.title)).toBeTruthy();
  });
});
