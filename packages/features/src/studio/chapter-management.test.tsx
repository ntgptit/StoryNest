import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../_shared/errors.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import {
  createChapter,
  listStudioChapters,
  renameChapterSlug,
  reorderChapters,
  setChapterArchived,
  setChapterDeleted,
} from "./api/chapters.api.ts";
import {
  applyOrder,
  isChapterSlugTaken,
  liveChapterIds,
  moveChapter,
  sortChapters,
  toStudioChapter,
  type StudioChapter,
  type StudioChapterRow,
} from "./model/studio-chapter.ts";
import { ChapterManagerScreen } from "./index.ts";
import { studioText } from "./strings.ts";

afterEach(cleanup);

const t = studioText.chapters;
const STORY_ID = "5eed0000-0000-4000-8000-00000000d001";
const cid = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const row = (n: number, overrides: Partial<StudioChapterRow> = {}): StudioChapterRow => ({
  id: cid(n),
  slug: `chuong-${n}`,
  sort_order: n,
  status: "draft",
  scheduled_for: null,
  deleted_at: null,
  updated_at: "2026-11-04T00:00:00+00:00",
  draft: { title: `Chương ${n}` },
  ...overrides,
});
const chapter = (n: number, overrides: Partial<StudioChapter> = {}): StudioChapter => ({
  ...toStudioChapter(row(n)),
  ...overrides,
});

describe("chapter model", () => {
  it("reads the title from the draft embed (object or one-element array) and defaults unknown status to draft", () => {
    expect(toStudioChapter(row(1)).title).toBe("Chương 1");
    expect(toStudioChapter(row(1, { draft: [{ title: "Từ mảng" }] })).title).toBe("Từ mảng");
    expect(toStudioChapter(row(1, { draft: null })).title).toBe("");
    expect(toStudioChapter(row(1, { status: "weird" })).status).toBe("draft");
    expect(toStudioChapter(row(1, { deleted_at: "2026-11-04T00:00:00Z" })).deleted).toBe(true);
  });

  it("orders live chapters by position and puts deleted ones last", () => {
    const sorted = sortChapters([chapter(3), chapter(1, { deleted: true }), chapter(2)]);
    expect(sorted.map((c) => c.id)).toEqual([cid(2), cid(3), cid(1)]);
    expect(liveChapterIds([chapter(3), chapter(1, { deleted: true }), chapter(2)])).toEqual([cid(2), cid(3)]);
  });

  it("moves a chapter one place and refuses to move past the ends or an unknown one", () => {
    const ids = [cid(1), cid(2), cid(3)];
    expect(moveChapter(ids, cid(2), -1)).toEqual([cid(2), cid(1), cid(3)]);
    expect(moveChapter(ids, cid(2), 1)).toEqual([cid(1), cid(3), cid(2)]);
    expect(moveChapter(ids, cid(1), -1)).toBeNull();
    expect(moveChapter(ids, cid(3), 1)).toBeNull();
    expect(moveChapter(ids, cid(9), 1)).toBeNull();
    expect(ids).toEqual([cid(1), cid(2), cid(3)]); // the input is never changed
  });

  it("renumbers the cached list after a move, deleted chapters after the live ones", () => {
    const list = [chapter(1), chapter(2), chapter(3, { deleted: true }), chapter(4)];
    const next = applyOrder(list, [cid(4), cid(2), cid(1)]);
    expect(next.map((c) => [c.id, c.position])).toEqual([
      [cid(4), 1],
      [cid(2), 2],
      [cid(1), 3],
      [cid(3), 4],
    ]);
  });

  it("recognises a taken slug only for a unique violation", () => {
    expect(isChapterSlugTaken(new AppError("conflict", "x", { code: "23505" }))).toBe(true);
    expect(isChapterSlugTaken(new AppError("conflict", "x", { code: "PT409" }))).toBe(false);
    expect(isChapterSlugTaken(new AppError("invalid", "x", { code: "22023" }))).toBe(false);
  });
});

type Call = [string, unknown[]];
type Result = { data: unknown; error: unknown };

function fakeClient(options: {
  chapters?: unknown[];
  story?: Record<string, unknown> | null;
  role?: string | null;
  /** While `hold.current` is a promise, chapter-list reads wait for it (to look at the screen before the reload lands). */
  hold?: { current: Promise<void> | null };
  rpc?: (name: string, args: Record<string, unknown>) => Result;
  update?: Result;
}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const updates: { values: unknown; calls: Call[] }[] = [];
  let chapters = options.chapters ?? [];
  const storyRow =
    options.story === undefined
      ? {
          id: STORY_ID,
          owner_id: TEST_USER_ID,
          slug: "s",
          title: "Truyện thử",
          synopsis: "",
          category_id: null,
          language_code: "vi",
          status: "draft",
          visibility: "private",
          is_mature: false,
          deleted_at: null,
        }
      : options.story;

  const from = vi.fn((table: string) => {
    const calls: Call[] = [];
    let updateValues: unknown;
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "order", "returns"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, args]);
        return builder;
      };
    }
    builder.update = (values: unknown) => {
      updateValues = values;
      updates.push({ values, calls });
      return builder;
    };
    builder.maybeSingle = () =>
      Promise.resolve(
        table === "stories"
          ? { data: storyRow, error: null }
          : { data: options.role ? { collaborator_role: options.role } : null, error: null },
      );
    builder.then = (resolve: (value: unknown) => unknown) => {
      const result =
        updateValues !== undefined
          ? (options.update ?? { data: [{ id: "x" }], error: null })
          : { data: chapters, error: null };
      const gate = updateValues === undefined ? options.hold?.current : null;
      return gate ? gate.then(() => resolve(result)) : resolve(result);
    };
    return builder;
  });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return options.rpc?.(name, args) ?? { data: null, error: null };
  });
  return { from, rpc, rpcCalls, updates, setChapters: (next: unknown[]) => (chapters = next) };
}

describe("chapter api", () => {
  it("lists every chapter of the story in studio order", async () => {
    const t1 = fakeClient({ chapters: [row(2), row(1, { deleted_at: "2026-11-04T00:00:00Z" }), row(3)] });
    const list = await listStudioChapters(t1 as unknown as DataClient, STORY_ID);
    expect(list.map((c) => c.id)).toEqual([cid(2), cid(3), cid(1)]);
  });

  it("sends the RPCs with the arguments the database expects", async () => {
    const t1 = fakeClient({ rpc: (name) => ({ data: name === "create_chapter" ? cid(7) : null, error: null }) });
    const client = t1 as unknown as DataClient;
    expect(await createChapter(client, STORY_ID, cid(7), { title: "T", slug: "t" })).toBe(cid(7));
    await reorderChapters(client, STORY_ID, [cid(2), cid(1)]);
    await setChapterArchived(client, cid(1), true);
    await setChapterArchived(client, cid(1), false);
    expect(t1.rpcCalls).toEqual([
      { name: "create_chapter", args: { p_story_id: STORY_ID, p_title: "T", p_slug: "t", p_id: cid(7) } },
      { name: "reorder_chapters", args: { p_story_id: STORY_ID, p_chapter_ids: [cid(2), cid(1)] } },
      { name: "archive_chapter", args: { p_chapter_id: cid(1) } },
      { name: "unarchive_chapter", args: { p_chapter_id: cid(1) } },
    ]);
  });

  it("renames only the slug and soft-deletes with a timestamp (never a hard delete)", async () => {
    const t1 = fakeClient({});
    const client = t1 as unknown as DataClient;
    await renameChapterSlug(client, cid(1), "moi");
    await setChapterDeleted(client, cid(1), true);
    await setChapterDeleted(client, cid(1), false);
    expect(t1.updates[0]?.values).toEqual({ slug: "moi" });
    expect(typeof (t1.updates[1]?.values as { deleted_at: unknown }).deleted_at).toBe("string");
    expect((t1.updates[2]?.values as { deleted_at: unknown }).deleted_at).toBeNull();
  });

  it("treats zero matched rows as not found and surfaces RPC errors", async () => {
    const none = fakeClient({ update: { data: [], error: null } });
    await expect(renameChapterSlug(none as unknown as DataClient, cid(1), "x")).rejects.toMatchObject({
      kind: "notFound",
    });
    await expect(setChapterDeleted(none as unknown as DataClient, cid(1), true)).rejects.toMatchObject({
      kind: "notFound",
    });
    const failing = fakeClient({
      rpc: () => ({ data: null, error: { code: "23505", message: "duplicate", status: 409 } }),
    });
    await expect(
      createChapter(failing as unknown as DataClient, STORY_ID, cid(1), { title: "T", slug: "t" }),
    ).rejects.toBeDefined();
  });
});

const push = vi.fn();
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/studio" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

const toasts = { show: vi.fn() };

function renderManager(t1: ReturnType<typeof fakeClient>) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(t1, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <ChapterManagerScreen storyId={STORY_ID} />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

const itemTitles = () =>
  within(screen.getByRole("list", { name: t.listLabel }))
    .getAllByRole("listitem")
    .map((li) => li.querySelector("p.text-sm")?.textContent);
const itemFor = (title: string) =>
  within(screen.getByRole("list", { name: t.listLabel }))
    .getAllByRole("listitem")
    .find((li) => li.textContent?.includes(title)) as HTMLElement;

describe("ChapterManagerScreen", () => {
  it("lists the chapters with status, slug and position, deleted ones last", async () => {
    renderManager(
      fakeClient({
        chapters: [row(1, { status: "published" }), row(2), row(3, { deleted_at: "2026-11-04T00:00:00Z" })],
      }),
    );
    expect(await screen.findByRole("list", { name: t.listLabel })).toBeTruthy();
    expect(itemTitles()).toEqual(["Chương 1", "Chương 2", "Chương 3"]);
    expect(within(itemFor("Chương 1")).getByText(t.status.published)).toBeTruthy();
    expect(within(itemFor("Chương 2")).getByText("/chuong-2")).toBeTruthy();
    expect(within(itemFor("Chương 3")).getByText(t.deletedBadge)).toBeTruthy();
  });

  it("shows an empty state, and the add form is always there", async () => {
    renderManager(fakeClient({ chapters: [] }));
    expect(await screen.findByText(t.empty.title)).toBeTruthy();
    expect(screen.getByLabelText(t.add.chapterTitle)).toBeTruthy();
  });

  it("shows not found for a story the user does not work on", async () => {
    renderManager(
      fakeClient({
        chapters: [],
        story: {
          id: STORY_ID,
          owner_id: "someone",
          slug: "s",
          title: "x",
          synopsis: "",
          category_id: null,
          language_code: "vi",
          status: "draft",
          visibility: "private",
          is_mature: false,
          deleted_at: null,
        },
        role: null,
      }),
    );
    expect(await screen.findByText(studioText.form.notFound.title)).toBeTruthy();
  });

  it("moves a chapter up: sends the complete new order of live chapters, shows it at once", async () => {
    const initial = [row(1), row(2), row(3), row(4, { deleted_at: "2026-11-04T00:00:00Z" })];
    // The fake server applies the reorder, so the reload that follows shows the new order like the real one would.
    const t1 = fakeClient({
      chapters: initial,
      rpc: (_name, args) => {
        const ids = args.p_chapter_ids as string[];
        t1.setChapters(initial.map((r) => ({ ...r, sort_order: ids.includes(r.id) ? ids.indexOf(r.id) + 1 : 10 })));
        return { data: null, error: null };
      },
    });
    renderManager(t1);
    await screen.findByRole("list", { name: t.listLabel });
    fireEvent.click(within(itemFor("Chương 3")).getByRole("button", { name: new RegExp(t.moveUp) }));
    await waitFor(() => expect(t1.rpcCalls).toHaveLength(1));
    expect(t1.rpcCalls[0]).toEqual({
      name: "reorder_chapters",
      args: { p_story_id: STORY_ID, p_chapter_ids: [cid(1), cid(3), cid(2)] },
    });
    await waitFor(() => expect(itemTitles().slice(0, 3)).toEqual(["Chương 1", "Chương 3", "Chương 2"]));
  });

  it("shows the new order before the server answers, and puts the old one back if it refuses", async () => {
    const hold: { current: Promise<void> | null } = { current: null };
    let release: () => void = () => undefined;
    const failing = fakeClient({
      chapters: [row(1), row(2), row(3)],
      hold,
      rpc: () => ({ data: null, error: { code: "22023", message: "stale", status: 400 } }),
    });
    renderManager(failing);
    await screen.findByRole("list", { name: t.listLabel });

    toasts.show.mockClear();
    hold.current = new Promise<void>((resolve) => (release = resolve)); // the reload after the action is slow
    fireEvent.click(within(itemFor("Chương 3")).getByRole("button", { name: new RegExp(t.moveUp) }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.stale));
    // the reload is still pending: what is on screen is the rolled-back order, not the optimistic one
    expect(itemTitles()).toEqual(["Chương 1", "Chương 2", "Chương 3"]);
    release();
    hold.current = null;

    cleanup();
    const ok = fakeClient({ chapters: [row(1), row(2), row(3)], hold });
    renderManager(ok);
    await screen.findByRole("list", { name: t.listLabel });
    hold.current = new Promise<void>((resolve) => (release = resolve));
    fireEvent.click(within(itemFor("Chương 3")).getByRole("button", { name: new RegExp(t.moveUp) }));
    await waitFor(() => expect(ok.rpcCalls).toHaveLength(1));
    // the server has not been reloaded yet, but the list already shows the move
    await waitFor(() => expect(itemTitles()).toEqual(["Chương 1", "Chương 3", "Chương 2"]));
    release();
    hold.current = null;
  });

  it("disables moving at the ends of the live list", async () => {
    renderManager(fakeClient({ chapters: [row(1), row(2), row(3, { deleted_at: "2026-11-04T00:00:00Z" })] }));
    await screen.findByRole("list", { name: t.listLabel });
    expect(
      (within(itemFor("Chương 1")).getByRole("button", { name: new RegExp(t.moveUp) }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (within(itemFor("Chương 2")).getByRole("button", { name: new RegExp(t.moveDown) }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(within(itemFor("Chương 3")).queryByRole("button", { name: new RegExp(t.moveUp) })).toBeNull(); // deleted: not part of the order
  });

  it("tells the author when the list was stale (the server refused the order) and reloads", async () => {
    const t1 = fakeClient({
      chapters: [row(1), row(2)],
      rpc: () => ({ data: null, error: { code: "22023", message: "chapter_ids must list each chapter", status: 400 } }),
    });
    renderManager(t1);
    await screen.findByRole("list", { name: t.listLabel });
    toasts.show.mockClear();
    fireEvent.click(within(itemFor("Chương 2")).getByRole("button", { name: new RegExp(t.moveUp) }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.stale));
    await waitFor(() => expect(itemTitles()).toEqual(["Chương 1", "Chương 2"])); // rolled back to the real order
  });

  it("adds a chapter with a client id and an auto slug, and clears the form", async () => {
    const t1 = fakeClient({ chapters: [row(1)], rpc: () => ({ data: cid(9), error: null }) });
    renderManager(t1);
    const title = await screen.findByLabelText(t.add.chapterTitle);
    fireEvent.change(title, { target: { value: "Đêm đầu tiên" } });
    expect((screen.getByLabelText(t.add.slug) as HTMLInputElement).value).toBe("dem-dau-tien");
    fireEvent.click(screen.getByRole("button", { name: t.add.submit }));
    await waitFor(() => expect(t1.rpcCalls).toHaveLength(1));
    expect(t1.rpcCalls[0]?.name).toBe("create_chapter");
    expect(t1.rpcCalls[0]?.args).toMatchObject({
      p_story_id: STORY_ID,
      p_title: "Đêm đầu tiên",
      p_slug: "dem-dau-tien",
    });
    expect(String(t1.rpcCalls[0]?.args.p_id)).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect((screen.getByLabelText(t.add.chapterTitle) as HTMLInputElement).value).toBe(""));
  });

  it("validates before sending and shows a taken slug on the slug field", async () => {
    const t1 = fakeClient({
      chapters: [],
      rpc: () => ({ data: null, error: { code: "23505", message: "duplicate key", status: 409 } }),
    });
    renderManager(t1);
    fireEvent.click(await screen.findByRole("button", { name: t.add.submit }));
    expect(await screen.findByText(t.validation.titleRequired)).toBeTruthy();
    expect(t1.rpcCalls).toEqual([]);

    fireEvent.change(screen.getByLabelText(t.add.chapterTitle), { target: { value: "Trùng" } });
    fireEvent.click(screen.getByRole("button", { name: t.add.submit }));
    expect(await screen.findByText(t.errors.slugTaken)).toBeTruthy();
  });

  it("reuses the same id when the author retries after a failed add", async () => {
    const t1 = fakeClient({
      chapters: [],
      rpc: () => ({ data: null, error: { code: "23505", message: "duplicate key", status: 409 } }),
    });
    renderManager(t1);
    fireEvent.change(await screen.findByLabelText(t.add.chapterTitle), { target: { value: "Thử lại" } });
    fireEvent.click(screen.getByRole("button", { name: t.add.submit }));
    await screen.findByText(t.errors.slugTaken);
    fireEvent.click(screen.getByRole("button", { name: t.add.submit }));
    await waitFor(() => expect(t1.rpcCalls).toHaveLength(2));
    expect(t1.rpcCalls[0]?.args.p_id).toBe(t1.rpcCalls[1]?.args.p_id);
  });

  it("renames a slug through a dialog and reports a duplicate on the field", async () => {
    const t1 = fakeClient({
      chapters: [row(1), row(2)],
      update: { data: null, error: { code: "23505", message: "duplicate", status: 409 } },
    });
    renderManager(t1);
    await screen.findByRole("list", { name: t.listLabel });
    fireEvent.click(within(itemFor("Chương 1")).getByRole("button", { name: t.rename }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(t.add.slug), { target: { value: "chuong-2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.renameSubmit }));
    expect(await within(dialog).findByText(t.errors.slugTaken)).toBeTruthy();
    expect(t1.updates[0]?.values).toEqual({ slug: "chuong-2" });
  });

  it("archives only after confirmation, and offers to unarchive an archived chapter", async () => {
    const t1 = fakeClient({ chapters: [row(1, { status: "published" }), row(2, { status: "archived" })] });
    renderManager(t1);
    await screen.findByRole("list", { name: t.listLabel });
    fireEvent.click(within(itemFor("Chương 1")).getByRole("button", { name: t.archive }));
    const dialog = await screen.findByRole("dialog");
    expect(t1.rpcCalls).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: t.archive }));
    await waitFor(() => expect(t1.rpcCalls).toEqual([{ name: "archive_chapter", args: { p_chapter_id: cid(1) } }]));

    fireEvent.click(within(itemFor("Chương 2")).getByRole("button", { name: t.unarchive }));
    await waitFor(() => expect(t1.rpcCalls[1]).toEqual({ name: "unarchive_chapter", args: { p_chapter_id: cid(2) } }));
  });

  it("deletes after confirmation and restores a deleted chapter directly", async () => {
    const t1 = fakeClient({ chapters: [row(1), row(2, { deleted_at: "2026-11-04T00:00:00Z" })] });
    renderManager(t1);
    await screen.findByRole("list", { name: t.listLabel });
    fireEvent.click(within(itemFor("Chương 1")).getByRole("button", { name: t.delete }));
    const dialog = await screen.findByRole("dialog");
    expect(t1.updates).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: t.delete }));
    await waitFor(() => expect(t1.updates).toHaveLength(1));
    expect(typeof (t1.updates[0]?.values as { deleted_at: unknown }).deleted_at).toBe("string");

    fireEvent.click(within(itemFor("Chương 2")).getByRole("button", { name: t.restore }));
    await waitFor(() => expect(t1.updates).toHaveLength(2));
    expect((t1.updates[1]?.values as { deleted_at: unknown }).deleted_at).toBeNull();
  });

  it("an editor can add, move and rename but not archive or delete", async () => {
    renderManager(
      fakeClient({
        chapters: [row(1), row(2)],
        story: {
          id: STORY_ID,
          owner_id: "someone",
          slug: "s",
          title: "Truyện",
          synopsis: "",
          category_id: null,
          language_code: "vi",
          status: "draft",
          visibility: "private",
          is_mature: false,
          deleted_at: null,
        },
        role: "editor",
      }),
    );
    await screen.findByRole("list", { name: t.listLabel });
    const first = itemFor("Chương 1");
    expect(within(first).getByRole("button", { name: t.rename })).toBeTruthy();
    expect(within(first).getByRole("button", { name: new RegExp(t.moveDown) })).toBeTruthy();
    expect(within(first).queryByRole("button", { name: t.archive })).toBeNull();
    expect(within(first).queryByRole("button", { name: t.delete })).toBeNull();
  });
});
