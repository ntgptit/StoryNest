import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../_shared/errors.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { getChapterPublishState, publishChapter, scheduleChapter, unpublishChapter } from "./api/publishing.api.ts";
import {
  canPublish,
  canUnpublish,
  canUnpublishChapter,
  formatLocalDateTime,
  isReady,
  minLocalDateTime,
  publishErrorMessage,
  publishReadiness,
  scheduleInstant,
} from "./model/publishing.ts";
import { checkBody, checkTitle } from "./model/draft-form.ts";
import {
  SPLIT_DEFAULT,
  SPLIT_MAX,
  SPLIT_PREFS_KEY,
  TOUR_DONE_KEY,
  isTourDone,
  markTourDone,
  readSplitPrefs,
  writeSplitPrefs,
} from "./model/workspace-prefs.ts";
import { ChapterEditorScreen } from "./index.ts";
import { editorText } from "./strings.ts";

// jsdom has no layout: ProseMirror measures the selection with these when it scrolls it into view.
const noRects = { length: 0, item: () => null, [Symbol.iterator]: function* () {} };
const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
for (const proto of [Element.prototype, Range.prototype] as {
  getClientRects?: unknown;
  getBoundingClientRect?: unknown;
}[]) {
  proto.getClientRects ??= () => noRects;
  proto.getBoundingClientRect ??= () => zeroRect;
}

// Fixed zone (UTC+7, no daylight saving): a wall-clock time must become the right UTC instant, which a machine
// running in UTC would hide.
process.env.TZ = "Asia/Ho_Chi_Minh";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

const t = editorText.publish;
const STORY_ID = "5eed0000-0000-4000-8000-00000000d001";
const CHAPTER_ID = "c0000000-0000-4000-8000-000000000001";
const bid = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BODY = [{ block_id: bid(1), type: "paragraph", text: "Một hai ba" }];

describe("publishing model", () => {
  it("lets owners and co-authors unpublish, not editors; nobody publishes an archived chapter", () => {
    expect(canUnpublish("owner")).toBe(true);
    expect(canUnpublish("co_author")).toBe(true);
    expect(canUnpublish("editor")).toBe(false);
    expect(canUnpublish(null)).toBe(false);
    expect(canPublish({ status: "draft", scheduledFor: null, role: "editor" })).toBe(true);
    expect(canPublish({ status: "archived", scheduledFor: null, role: "owner" })).toBe(false);
    expect(canPublish({ status: "draft", scheduledFor: null, role: null })).toBe(false);
    expect(canUnpublishChapter({ status: "draft", scheduledFor: null, role: "owner" })).toBe(false);
    expect(canUnpublishChapter({ status: "published", scheduledFor: null, role: "owner" })).toBe(true);
    expect(canUnpublishChapter({ status: "scheduled", scheduledFor: "x", role: "co_author" })).toBe(true);
    expect(canUnpublishChapter({ status: "published", scheduledFor: null, role: "editor" })).toBe(false);
  });

  it("has one message per outcome of the RPC contract", () => {
    const kinds = ["forbidden", "notFound", "conflict", "invalid", "network", "unknown"] as const;
    const messages = kinds.map((kind) => publishErrorMessage(new AppError(kind, "x")));
    expect(messages).toEqual([
      t.errors.forbidden,
      t.errors.notFound,
      t.errors.conflict,
      t.errors.invalid,
      t.errors.network,
      t.errors.generic,
    ]);
    expect(new Set(messages).size).toBe(6);
  });

  it("turns the picker's local wall-clock time into a UTC instant and refuses the past", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    const local = "2026-11-05T20:30"; // no offset: the reader's own timezone
    const parsed = scheduleInstant(local, now);
    expect(parsed).toEqual({ ok: true, iso: "2026-11-05T13:30:00.000Z" }); // 20:30 at UTC+7
    expect(scheduleInstant("", now)).toEqual({ ok: false, message: editorText.publish.scheduleDialog.required });
    expect(scheduleInstant("nonsense", now)).toMatchObject({ ok: false });
    expect(scheduleInstant("2026-11-04T09:00", new Date("2026-11-04T10:00:00"))).toEqual({
      ok: false,
      message: editorText.publish.scheduleDialog.past,
    });
    // less than a minute ahead is already past by the time the request arrives
    expect(scheduleInstant("2026-11-04T10:00:30", new Date("2026-11-04T10:00:00"))).toMatchObject({ ok: false });
    expect(scheduleInstant("2026-11-04T10:01:30", new Date("2026-11-04T10:00:00"))).toMatchObject({ ok: true });
  });

  it("offers a picker minimum one minute ahead, in the picker's format", () => {
    expect(minLocalDateTime(new Date(2026, 10, 4, 10, 0, 0))).toBe("2026-11-04T10:01");
    expect(minLocalDateTime(new Date(2026, 11, 31, 23, 59, 30))).toBe("2027-01-01T00:00");
  });

  it("formats an instant in the reader's locale", () => {
    expect(formatLocalDateTime("2026-11-05T13:30:00Z", "vi")).toMatch(/2026/);
  });
});

type Result = { data: unknown; error: unknown };

interface World {
  status: string;
  scheduledFor: string | null;
  role: string | null;
  revision: number;
  /** Every draft save is refused as changed elsewhere (no row matched the revision). */
  saveFails?: boolean;
  /** While set, publish_chapter waits for it (a slow server). */
  gate?: Promise<void>;
  rpc: (name: string, args: Record<string, unknown>, world: World) => Result;
}

function fakeClient(init: Partial<World> = {}) {
  const world: World = {
    status: "draft",
    scheduledFor: null,
    role: "owner",
    revision: 3,
    rpc: (name, _args, w) => {
      if (name === "publish_chapter") w.status = "published";
      if (name === "unpublish_chapter") w.status = "draft";
      if (name === "schedule_chapter") w.status = "scheduled";
      return { data: name === "publish_chapter" ? "version-id" : null, error: null };
    },
    ...init,
  };
  const log: string[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const from = vi.fn((table: string) => {
    let updating = false;
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) builder[method] = () => builder;
    builder.update = () => {
      updating = true;
      return builder;
    };
    builder.maybeSingle = () =>
      Promise.resolve(
        table === "chapter_drafts"
          ? {
              data: {
                chapter_id: CHAPTER_ID,
                title: "Chương một",
                body: BODY,
                revision: world.revision,
                chapter: { story_id: STORY_ID },
              },
              error: null,
            }
          : { data: { story_id: STORY_ID, status: world.status, scheduled_for: world.scheduledFor }, error: null },
      );
    builder.then = (resolve: (value: unknown) => unknown) => {
      if (updating && world.saveFails) return resolve({ data: [], error: null });
      if (updating) {
        log.push("save");
        world.revision += 1;
        return resolve({ data: [{ revision: world.revision }], error: null });
      }
      return resolve({ data: null, error: null });
    };
    return builder;
  });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "story_role") return { data: world.role, error: null };
    log.push(name);
    rpcCalls.push({ name, args });
    if (name === "publish_chapter" && world.gate) await world.gate;
    return world.rpc(name, args, world);
  });
  return { from, rpc, world, log, rpcCalls };
}

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
const toasts = { show: vi.fn() };

function setup(t1: ReturnType<typeof fakeClient>, options: { firstRunTour?: boolean } = {}) {
  const editor: { current: Editor | null } = { current: null };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(t1, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <ChapterEditorScreen
                storyId={STORY_ID}
                chapterId={CHAPTER_ID}
                onEditor={(e) => (editor.current = e)}
                firstRunTour={options.firstRunTour}
              />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
  return editor;
}
const panel = () => screen.findByRole("region", { name: t.title });
const button = (name: string | RegExp) => screen.findByRole("button", { name });
/** Schedule… lives in the split button's menu (its name also carries the description line). */
async function openSchedule() {
  fireEvent.keyDown(await button(t.more), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: (name) => name.startsWith(t.schedule) }));
}

describe("publishing api", () => {
  it("reads the state and the caller's role from the database's own story_role", async () => {
    const t1 = fakeClient({ status: "scheduled", scheduledFor: "2026-12-01T00:00:00Z", role: "co_author" });
    expect(await getChapterPublishState(t1 as unknown as DataClient, CHAPTER_ID)).toEqual({
      status: "scheduled",
      scheduledFor: "2026-12-01T00:00:00Z",
      role: "co_author",
    });
    const stranger = fakeClient({ role: "admin" });
    expect((await getChapterPublishState(stranger as unknown as DataClient, CHAPTER_ID))?.role).toBeNull();
  });

  it("sends the RPC arguments the database expects, validated by the shared schemas", async () => {
    const t1 = fakeClient();
    const client = t1 as unknown as DataClient;
    await publishChapter(client, CHAPTER_ID, 5);
    await scheduleChapter(client, CHAPTER_ID, "2026-12-01T00:00:00.000Z", 5);
    await unpublishChapter(client, CHAPTER_ID);
    expect(t1.rpcCalls).toEqual([
      { name: "publish_chapter", args: { p_chapter_id: CHAPTER_ID, p_expected_revision: 5 } },
      {
        name: "schedule_chapter",
        args: { p_chapter_id: CHAPTER_ID, p_scheduled_for: "2026-12-01T00:00:00.000Z", p_expected_revision: 5 },
      },
      { name: "unpublish_chapter", args: { p_chapter_id: CHAPTER_ID } },
    ]);
    await expect(scheduleChapter(client, CHAPTER_ID, "tomorrow", 5)).rejects.toBeDefined(); // not an instant: never sent
    await expect(publishChapter(client, CHAPTER_ID, 0)).rejects.toBeDefined();
    expect(t1.rpcCalls).toHaveLength(3);
  });
});

describe("PublishPanel", () => {
  it("shows where the chapter stands: draft, scheduled (in the reader's timezone), published, archived", async () => {
    setup(fakeClient({ status: "draft" }));
    expect(within(await panel()).getByText(t.state.draft)).toBeTruthy();
    cleanup();

    setup(fakeClient({ status: "scheduled", scheduledFor: "2026-12-01T13:00:00Z" }));
    expect(within(await panel()).getByText(new RegExp(t.state.scheduled("", "").split("(")[0]!.trim()))).toBeTruthy();
    cleanup();

    setup(fakeClient({ status: "published" }));
    expect(within(await panel()).getByText(t.state.published)).toBeTruthy();
    expect(screen.getByRole("button", { name: t.republish })).toBeTruthy();
    cleanup();

    setup(fakeClient({ status: "archived" }));
    const archived = await panel();
    expect(within(archived).getByText(t.archivedHint)).toBeTruthy();
    expect(within(archived).queryByRole("button", { name: t.publish })).toBeNull();
    expect(within(archived).queryByRole("button", { name: t.schedule })).toBeNull();
  });

  it("publishes the saved draft with its revision and shows the new state", async () => {
    const t1 = fakeClient();
    setup(t1);
    fireEvent.click(await button(t.publish));
    await waitFor(() => expect(t1.rpcCalls.map((c) => c.name)).toEqual(["publish_chapter"]));
    expect(t1.rpcCalls[0]?.args).toEqual({ p_chapter_id: CHAPTER_ID, p_expected_revision: 3 });
    expect(t1.log).not.toContain("save"); // nothing was unsaved
    expect(toasts.show).toHaveBeenCalledWith("success", t.published);
    expect(await screen.findByText(t.state.published)).toBeTruthy(); // the panel refreshed
  });

  it("saves unsaved text first and publishes THAT revision, in that order", async () => {
    const t1 = fakeClient();
    const editor = setup(t1);
    await waitFor(() => expect(editor.current).not.toBeNull());
    act(() => void editor.current?.commands.insertContent(" thêm"));
    fireEvent.click(await button(t.publish));
    await waitFor(() => expect(t1.rpcCalls.some((c) => c.name === "publish_chapter")).toBe(true));
    expect(t1.log.indexOf("save")).toBeGreaterThanOrEqual(0);
    expect(t1.log.indexOf("save")).toBeLessThan(t1.log.indexOf("publish_chapter"));
    expect(t1.rpcCalls.find((c) => c.name === "publish_chapter")?.args.p_expected_revision).toBe(4);
  });

  it("a double click publishes once", async () => {
    let release: () => void = () => undefined;
    const t1 = fakeClient({ gate: new Promise<void>((resolve) => (release = resolve)) });
    setup(t1);
    const publish = await button(t.publish);
    // three clicks inside one act: React does not re-render (and disable the button) in between, like a fast double click
    act(() => {
      fireEvent.click(publish);
      fireEvent.click(publish);
      fireEvent.click(publish);
    });
    await waitFor(() => expect(t1.rpcCalls.filter((c) => c.name === "publish_chapter")).toHaveLength(1));
    release();
    await waitFor(() => expect(screen.getByText(t.state.published)).toBeTruthy());
    expect(t1.rpcCalls.filter((c) => c.name === "publish_chapter")).toHaveLength(1);
  });

  it.each([
    ["42501", 403, t.errors.forbidden],
    ["PT404", 404, t.errors.notFound],
    ["PT409", 409, t.errors.conflict],
    ["22023", 400, t.errors.invalid],
  ])("explains a refusal with SQLSTATE %s in words, not as a generic failure", async (code, status, message) => {
    const t1 = fakeClient({ rpc: () => ({ data: null, error: { code, message: "raw server text", status } }) });
    setup(t1);
    fireEvent.click(await button(t.publish));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText("raw server text")).toBeNull();
    // the buttons come back, so the author can fix the cause and try again
    await waitFor(() =>
      expect((screen.getByRole("button", { name: t.publish }) as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it("a blank title locks publishing and the checklist says why, until it is fixed", async () => {
    const t1 = fakeClient();
    const editor = setup(t1);
    await waitFor(() => expect(editor.current).not.toBeNull());
    const region = await panel();
    expect(within(region).getByText(t.readiness.ready)).toBeTruthy();
    fireEvent.change(await screen.findByLabelText(editorText.chapterTitle), { target: { value: "  " } });
    const publish = (await button(t.publish)) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    expect((screen.getByRole("button", { name: t.more }) as HTMLButtonElement).disabled).toBe(true);
    const titleItem = region.querySelector('[data-item="title"]')!;
    expect(titleItem.hasAttribute("data-done")).toBe(false);
    expect(within(titleItem as HTMLElement).getByText(editorText.validation.titleRequired)).toBeTruthy();
    expect(within(region).getByText(t.readiness.summary(2, 3))).toBeTruthy();
    // the button points at the checklist that explains it
    expect(document.getElementById(publish.getAttribute("aria-describedby")!)?.textContent).toContain(
      t.readiness.items.title,
    );
    fireEvent.click(publish);
    expect(t1.rpcCalls.filter((c) => c.name === "publish_chapter")).toEqual([]);

    fireEvent.change(screen.getByLabelText(editorText.chapterTitle), { target: { value: "Chương 1" } });
    await waitFor(() =>
      expect((screen.getByRole("button", { name: t.publish }) as HTMLButtonElement).disabled).toBe(false),
    );
    expect(region.querySelector('[data-item="title"]')!.hasAttribute("data-done")).toBe(true);
  });

  it("does not publish when the draft could not be saved first, and says why", async () => {
    const t1 = fakeClient({ saveFails: true });
    const editor = setup(t1);
    await waitFor(() => expect(editor.current).not.toBeNull());
    fireEvent.change(await screen.findByLabelText(editorText.chapterTitle), { target: { value: "Tên mới" } });
    fireEvent.click(await button(t.publish));
    expect(await screen.findByText(t.saveFirst)).toBeTruthy();
    expect(t1.rpcCalls.filter((c) => c.name === "publish_chapter")).toEqual([]);
  });

  it("an editor can publish but not take a chapter back", async () => {
    setup(fakeClient({ status: "published", role: "editor" }));
    const region = await panel();
    expect(within(region).getByRole("button", { name: t.republish })).toBeTruthy();
    expect(within(region).queryByRole("button", { name: t.unpublish })).toBeNull();
  });

  it("unpublishes only after confirmation", async () => {
    const t1 = fakeClient({ status: "published" });
    setup(t1);
    fireEvent.click(await button(t.unpublish));
    const dialog = await screen.findByRole("dialog");
    expect(t1.rpcCalls).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: t.unpublishDialog.confirm }));
    await waitFor(() =>
      expect(t1.rpcCalls).toEqual([{ name: "unpublish_chapter", args: { p_chapter_id: CHAPTER_ID } }]),
    );
    expect(await screen.findByText(t.state.draft)).toBeTruthy();
  });

  it("a scheduled chapter offers to cancel the schedule (unpublish) to owners", async () => {
    setup(fakeClient({ status: "scheduled", scheduledFor: "2026-12-01T13:00:00Z" }));
    expect(await button(t.cancelSchedule)).toBeTruthy();
    expect(screen.queryByRole("button", { name: t.unpublish })).toBeNull();
  });

  it("schedules at the picked local time as a UTC instant, with the saved revision", async () => {
    const t1 = fakeClient();
    setup(t1);
    await openSchedule();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(new RegExp(t.scheduleDialog.zone("").trim()))).toBeTruthy();
    const future = new Date(Date.now() + 2 * 24 * 3600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
    fireEvent.change(within(dialog).getByLabelText(t.scheduleDialog.label), { target: { value: local } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.scheduleDialog.submit }));
    await waitFor(() => expect(t1.rpcCalls.some((c) => c.name === "schedule_chapter")).toBe(true));
    const call = t1.rpcCalls.find((c) => c.name === "schedule_chapter")!;
    expect(call.args).toEqual({
      p_chapter_id: CHAPTER_ID,
      p_scheduled_for: new Date(local).toISOString(),
      p_expected_revision: 3,
    });
    expect(toasts.show).toHaveBeenCalledWith("success", t.scheduled);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("refuses a time in the past or no time at all, before asking the server", async () => {
    const t1 = fakeClient();
    setup(t1);
    await openSchedule();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.scheduleDialog.submit }));
    expect(await within(dialog).findByText(t.scheduleDialog.required)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(t.scheduleDialog.label), { target: { value: "2020-01-01T10:00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.scheduleDialog.submit }));
    expect(await within(dialog).findByText(t.scheduleDialog.past)).toBeTruthy();
    expect(t1.rpcCalls.filter((c) => c.name === "schedule_chapter")).toEqual([]);
  });
});

describe("publish readiness (the existing draft rules as a checklist)", () => {
  const doc = (content: unknown[]) => ({ type: "doc", content }) as Parameters<typeof checkBody>[0];
  const paragraph = { type: "paragraph", attrs: { blockId: bid(1) }, content: [{ type: "text", text: "Một" }] };

  it("splits the draft rules: a title of 1 to 200 characters, a body the schema accepts", () => {
    expect(checkTitle("  Chương  ")).toEqual({ ok: true, title: "Chương" });
    expect(checkTitle("   ")).toEqual({ ok: false, message: editorText.validation.titleRequired });
    expect(checkTitle("x".repeat(201))).toEqual({ ok: false, message: editorText.validation.titleTooLong });
    expect(checkBody(doc([paragraph])).ok).toBe(true);
    expect(checkBody(doc([]))).toEqual({ ok: false, message: editorText.validation.unsupported }); // no block at all
    expect(checkBody(doc([{ type: "codeBlock" }]))).toEqual({ ok: false, message: editorText.validation.unsupported });
  });

  it("lists title, body and not archived, with the existing messages as hints", () => {
    const draft = { title: checkTitle(""), body: checkBody(doc([paragraph])) };
    const checks = publishReadiness(draft, { status: "draft", scheduledFor: null, role: "owner" });
    expect(checks).toEqual([
      { id: "title", done: false, hint: editorText.validation.titleRequired },
      { id: "body", done: true, hint: undefined },
      { id: "notArchived", done: true, hint: undefined },
    ]);
    expect(isReady(checks)).toBe(false);
    const archived = publishReadiness(
      { title: checkTitle("A"), body: checkBody(doc([paragraph])) },
      { status: "archived", scheduledFor: null, role: "owner" },
    );
    expect(archived[2]).toEqual({ id: "notArchived", done: false, hint: t.archivedHint });
    expect(
      isReady(
        publishReadiness(
          { title: checkTitle("A"), body: checkBody(doc([paragraph])) },
          { status: "published", scheduledFor: null, role: "editor" },
        ),
      ),
    ).toBe(true);
  });
});

describe("editor workspace preferences", () => {
  it("remembers the side-by-side preview and its width, and survives bad or missing storage", () => {
    expect(readSplitPrefs()).toEqual({ on: false, split: SPLIT_DEFAULT });
    writeSplitPrefs({ on: true, split: 99 });
    expect(readSplitPrefs()).toEqual({ on: true, split: SPLIT_MAX });
    window.localStorage.setItem(SPLIT_PREFS_KEY, "{not json");
    expect(readSplitPrefs()).toEqual({ on: false, split: SPLIT_DEFAULT });
    window.localStorage.setItem(SPLIT_PREFS_KEY, JSON.stringify({ on: "yes", split: "wide" }));
    expect(readSplitPrefs()).toEqual({ on: false, split: SPLIT_DEFAULT });
  });

  it("remembers that the tour was seen; unreadable storage counts as seen", () => {
    expect(isTourDone()).toBe(false);
    markTourDone();
    expect(window.localStorage.getItem(TOUR_DONE_KEY)).toBe("1");
    expect(isTourDone()).toBe(true);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    window.localStorage.removeItem(TOUR_DONE_KEY);
    expect(isTourDone()).toBe(true);
    spy.mockRestore();
  });
});

describe("chapter editor: first-run tour and toolbar tooltips", () => {
  const tour = editorText.tour;

  it("offers the tour once when the host asks for it, and never again after Skip", async () => {
    setup(fakeClient(), { firstRunTour: true });
    const dialog = await screen.findByRole("dialog", { name: tour.dialog });
    expect(within(dialog).getByText(tour.toolbar.title)).toBeTruthy();
    expect(within(dialog).getByText(tour.progress(1, 4))).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: tour.next }));
    expect(within(dialog).getByText(tour.autosave.title)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: tour.skip }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: tour.dialog })).toBeNull());
    expect(isTourDone()).toBe(true);
    cleanup();

    setup(fakeClient(), { firstRunTour: true });
    await screen.findByRole("toolbar");
    await screen.findByRole("region", { name: t.title });
    expect(screen.queryByRole("dialog", { name: tour.dialog })).toBeNull();
  });

  it("walks through toolbar, autosave, publish and find, and Done ends it for good", async () => {
    setup(fakeClient(), { firstRunTour: true });
    const dialog = await screen.findByRole("dialog", { name: tour.dialog });
    for (const step of [tour.autosave, tour.publish, tour.find]) {
      fireEvent.keyDown(dialog, { key: "ArrowRight" });
      expect(within(dialog).getByText(step.title)).toBeTruthy();
    }
    fireEvent.click(within(dialog).getByRole("button", { name: tour.done }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: tour.dialog })).toBeNull());
    expect(isTourDone()).toBe(true);
  });

  it("is off unless the host turns it on", async () => {
    setup(fakeClient());
    await screen.findByRole("toolbar");
    expect(screen.queryByRole("dialog", { name: tour.dialog })).toBeNull();
  });

  it("gives every toolbar button a tooltip trigger and keeps its own name", async () => {
    setup(fakeClient());
    const toolbar = await screen.findByRole("toolbar", { name: editorText.toolbar.label });
    const bold = within(toolbar).getByRole("button", { name: editorText.toolbar.bold });
    expect(bold.getAttribute("data-slot")).toBe("tooltip-trigger");
    expect(bold.getAttribute("data-tool")).toBe("bold");
    expect(within(toolbar).getByRole("button", { name: editorText.toolbar.find }).getAttribute("data-tool")).toBe(
      "find",
    );
  });
});
