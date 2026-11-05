import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "@storynest/utils";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { editorText, formatLocalDateTime, localDateTimeValue } from "../editor/index.ts";
import { scheduledChapters, toStudioChapter, type StudioChapterRow } from "./model/studio-chapter.ts";
import { ChapterManagerScreen } from "./index.ts";
import { studioText } from "./strings.ts";

afterEach(() => {
  cleanup();
  toasts.show.mockClear();
});

const t = studioText.chapters;
const STORY_ID = "5eed0000-0000-4000-8000-00000000d001";
const cid = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HOUR = 3_600_000;
const inHours = (h: number) => new Date(Date.now() + h * HOUR).toISOString();

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
const scheduled = (n: number, hours: number, overrides: Partial<StudioChapterRow> = {}) =>
  row(n, { status: "scheduled", scheduled_for: inHours(hours), ...overrides });

type Result = { data: unknown; error: unknown };

function fakeClient(options: {
  chapters: unknown[];
  role?: "owner" | "co_author" | "editor";
  draftRevision?: number;
  rpc?: (name: string, args: Record<string, unknown>) => Result;
}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const owner = (options.role ?? "owner") === "owner";
  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "order", "returns"]) builder[method] = () => builder;
    builder.maybeSingle = () => {
      if (table === "stories")
        return Promise.resolve({
          data: {
            id: STORY_ID,
            owner_id: owner ? TEST_USER_ID : "someone-else",
            slug: "s",
            title: "Truyện thử",
            synopsis: "",
            category_id: null,
            language_code: "vi",
            status: "draft",
            visibility: "private",
            is_mature: false,
            deleted_at: null,
          },
          error: null,
        });
      if (table === "story_collaborators")
        return Promise.resolve({ data: { collaborator_role: options.role }, error: null });
      if (table === "chapter_drafts")
        return Promise.resolve({
          data: {
            chapter_id: cid(1),
            title: "Chương",
            body: [],
            revision: options.draftRevision ?? 9,
            chapter: { story_id: STORY_ID },
          },
          error: null,
        });
      return Promise.resolve({ data: null, error: null });
    };
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve({ data: table === "chapters" ? options.chapters : [], error: null });
    return builder;
  });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return options.rpc?.(name, args) ?? { data: name === "publish_chapter" ? "v-1" : null, error: null };
  });
  return { from, rpc, rpcCalls };
}

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

function renderManager(t1: ReturnType<typeof fakeClient>) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(t1, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <ChapterManagerScreen storyId={STORY_ID} locale="vi" />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

const outbox = () => screen.findByRole("list", { name: t.outbox.title });
const itemFor = async (title: string) =>
  within(await outbox())
    .getAllByRole("listitem")
    .find((li) => li.textContent?.includes(title)) as HTMLElement;

describe("scheduledChapters", () => {
  it("keeps live scheduled chapters only, soonest first", () => {
    const list = [
      scheduled(1, 5),
      scheduled(2, 1),
      row(3),
      scheduled(4, 2, { deleted_at: "2026-11-04T00:00:00Z" }),
      row(5, { status: "scheduled", scheduled_for: null }),
      row(6, { status: "published" }),
    ].map(toStudioChapter);
    expect(scheduledChapters(list).map((c) => c.id)).toEqual([cid(2), cid(1)]);
  });
});

describe("Scheduled outbox in the chapter manager", () => {
  it("is absent when nothing is scheduled", async () => {
    renderManager(fakeClient({ chapters: [row(1), row(2, { status: "published" })] }));
    await screen.findByRole("list", { name: t.listLabel });
    expect(screen.queryByRole("list", { name: t.outbox.title })).toBeNull();
  });

  it("lists scheduled chapters in time order with the relative and the exact local time", async () => {
    // 2.5h, not 2h: relative time truncates, so a whole-hour offset flips to "1 hour" a few ms after render.
    const soon = scheduled(3, 2.5);
    renderManager(fakeClient({ chapters: [row(1), scheduled(2, 30), soon] }));
    const items = within(await outbox()).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector(".truncate.text-base")?.textContent)).toEqual(["Chương 3", "Chương 2"]);
    const first = items[0] as HTMLElement;
    expect(first.textContent).toContain(formatRelativeTime(soon.scheduled_for as string, "vi"));
    expect(first.textContent).toContain(formatLocalDateTime(soon.scheduled_for as string, "vi"));
    expect(first.textContent).toContain("/chuong-3");
  });

  it("publishes now with the draft's saved revision, without a confirmation (as in the publish panel)", async () => {
    const t1 = fakeClient({ chapters: [scheduled(1, 3)], draftRevision: 12 });
    renderManager(t1);
    fireEvent.click(within(await itemFor("Chương 1")).getByRole("button", { name: t.outbox.publishNow }));
    await waitFor(() => expect(t1.rpcCalls.map((c) => c.name)).toContain("publish_chapter"));
    expect(t1.rpcCalls.find((c) => c.name === "publish_chapter")?.args).toEqual({
      p_chapter_id: cid(1),
      p_expected_revision: 12,
    });
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.outbox.published));
  });

  it("reschedules through the inline picker: same validation as the publish panel, then schedule_chapter", async () => {
    const t1 = fakeClient({ chapters: [scheduled(1, 3)], draftRevision: 4 });
    renderManager(t1);
    const item = await itemFor("Chương 1");
    const timeButton = within(item).getByRole("button", { name: new RegExp(t.outbox.changeTime("Chương 1")) });
    expect(timeButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(timeButton);
    const input = within(item).getByLabelText(t.outbox.newTime) as HTMLInputElement;
    expect(input.min).not.toBe("");
    // A past time is refused before any request.
    fireEvent.change(input, { target: { value: localDateTimeValue(new Date(Date.now() - HOUR)) } });
    fireEvent.click(within(item).getByRole("button", { name: t.outbox.save }));
    expect(await within(item).findByText(editorText.publish.scheduleDialog.past)).toBeTruthy();
    expect(t1.rpcCalls).toEqual([]);

    const later = new Date(Date.now() + 48 * HOUR);
    fireEvent.change(input, { target: { value: localDateTimeValue(later) } });
    fireEvent.click(within(item).getByRole("button", { name: t.outbox.save }));
    await waitFor(() => expect(t1.rpcCalls.map((c) => c.name)).toEqual(["schedule_chapter"]));
    const args = t1.rpcCalls[0]?.args as { p_chapter_id: string; p_scheduled_for: string; p_expected_revision: number };
    expect(args.p_chapter_id).toBe(cid(1));
    expect(args.p_expected_revision).toBe(4);
    expect(Math.abs(new Date(args.p_scheduled_for).getTime() - later.getTime())).toBeLessThan(60_000);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.outbox.rescheduled));
    await waitFor(() => expect(within(item).queryByLabelText(t.outbox.newTime)).toBeNull()); // closed after success
  });

  it("cancels a schedule only after confirmation", async () => {
    const t1 = fakeClient({ chapters: [scheduled(1, 3)] });
    renderManager(t1);
    fireEvent.click(within(await itemFor("Chương 1")).getByRole("button", { name: t.outbox.cancelSchedule }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t.outbox.cancelDialog.title)).toBeTruthy();
    expect(t1.rpcCalls).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: t.outbox.cancelDialog.confirm }));
    await waitFor(() => expect(t1.rpcCalls).toEqual([{ name: "unpublish_chapter", args: { p_chapter_id: cid(1) } }]));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.outbox.cancelled));
  });

  it("shows the publishing contract's message when the server refuses (e.g. the draft changed: PT409)", async () => {
    const t1 = fakeClient({
      chapters: [scheduled(1, 3)],
      rpc: () => ({ data: null, error: { code: "PT409", message: "draft revision is 10 but 9 was expected" } }),
    });
    renderManager(t1);
    const item = await itemFor("Chương 1");
    fireEvent.click(within(item).getByRole("button", { name: t.outbox.publishNow }));
    expect(await within(item).findByRole("alert")).toHaveProperty("textContent", editorText.publish.errors.conflict);
  });

  it("an editor may publish now and reschedule but not cancel the schedule", async () => {
    renderManager(fakeClient({ chapters: [scheduled(1, 3)], role: "editor" }));
    const item = await itemFor("Chương 1");
    expect(within(item).getByRole("button", { name: t.outbox.publishNow })).toBeTruthy();
    expect(within(item).getByRole("button", { name: new RegExp(t.outbox.changeTime("Chương 1")) })).toBeTruthy();
    expect(within(item).queryByRole("button", { name: t.outbox.cancelSchedule })).toBeNull();
  });
});
