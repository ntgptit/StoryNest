import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODERATION_ACTION } from "@storynest/validation";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { listReports, moderate, resolveReport, submitReport } from "./api/moderation.api.ts";
import { ModerationScreen, ReportButton } from "./index.ts";
import {
  QUEUE_PAGE_SIZE,
  actionErrorMessage,
  actionTargetId,
  checkReason,
  contentActions,
  isOpen,
  reportCursorAfter,
  reportErrorMessage,
  reportTargetHref,
  toReport,
  toReportPage,
  type ReportRow,
} from "./model/report.ts";
import { moderationText } from "./strings.ts";

afterEach(cleanup);

const t = moderationText;
const id = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const STORY = id(901);
const CHAPTER = id(902);

const row = (n: number, overrides: Partial<ReportRow> = {}): ReportRow => ({
  id: id(n),
  status: "pending",
  reason: "spam",
  description: `Chi tiết ${n}`,
  created_at: `2026-11-04T10:00:0${n}.123456+00:00`,
  reporter_name: `Người báo ${n}`,
  target_kind: "comment",
  target_id: id(100 + n),
  target_title: `Nội dung ${n}`,
  target_state: "visible",
  story_id: STORY,
  story_slug: "ten-truyen",
  chapter_slug: "chuong-1",
  username: "tac_gia",
  open_reports: 1,
  reviewed_at: null,
  ...overrides,
});

describe("report model", () => {
  it("maps a row and keeps the server's timestamp text (it is the paging cursor)", () => {
    const r = toReport(row(1, { open_reports: 3 }));
    expect(r).toMatchObject({ target: "comment", status: "pending", openReports: 3, reporterName: "Người báo 1" });
    expect(r?.createdAt).toBe("2026-11-04T10:00:01.123456+00:00");
  });

  it("drops rows that cannot be drawn", () => {
    expect(toReport(row(1, { id: null }))).toBeNull();
    expect(toReport(row(1, { target_id: null }))).toBeNull();
    expect(toReport(row(1, { target_state: null }))).toBeNull();
    expect(toReport(row(1, { target_kind: "planet" }))).toBeNull();
    expect(toReport(row(1, { status: "weird" }))).toBeNull();
  });

  it("cuts the extra row off a page and uses it only to say that more exist", () => {
    const rows = Array.from({ length: QUEUE_PAGE_SIZE + 1 }, (_, i) => row((i % 9) + 1, { id: id(i + 1) }));
    const page = toReportPage(rows);
    expect(page.items).toHaveLength(QUEUE_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(reportCursorAfter(page)).toEqual({ createdAt: page.items.at(-1)?.createdAt, id: id(QUEUE_PAGE_SIZE) });
    const last = toReportPage(rows.slice(0, 2));
    expect(last.hasMore).toBe(false);
    expect(reportCursorAfter(last)).toBeUndefined();
  });

  it("knows which statuses are still open", () => {
    expect(isOpen(toReport(row(1, { status: "pending" }))!)).toBe(true);
    expect(isOpen(toReport(row(1, { status: "reviewing" }))!)).toBe(true);
    expect(isOpen(toReport(row(1, { status: "resolved" }))!)).toBe(false);
    expect(isOpen(toReport(row(1, { status: "dismissed" }))!)).toBe(false);
  });

  it("links to where the thing is", () => {
    expect(reportTargetHref(toReport(row(1, { target_kind: "story", chapter_slug: null }))!)).toBe(
      `/story/${STORY}/ten-truyen`,
    );
    expect(reportTargetHref(toReport(row(1, { target_kind: "chapter" }))!)).toBe(`/story/${STORY}/ten-truyen/chuong-1`);
    expect(reportTargetHref(toReport(row(1, { target_kind: "comment" }))!)).toBe(`/story/${STORY}/ten-truyen/chuong-1`);
    expect(reportTargetHref(toReport(row(1, { target_kind: "user", story_id: null, story_slug: null }))!)).toBe(
      "/author/tac_gia",
    );
    expect(reportTargetHref(toReport(row(1, { target_kind: "user", username: null }))!)).toBeNull();
    expect(reportTargetHref(toReport(row(1, { target_kind: "story", story_id: null }))!)).toBeNull();
  });

  it("offers the action that fits the thing's state, and none when nothing applies", () => {
    const of = (kind: string, state: string) =>
      contentActions(toReport(row(1, { target_kind: kind, target_state: state }))!);
    expect(of("comment", "visible")).toEqual([MODERATION_ACTION.HIDE_COMMENT]);
    expect(of("comment", "hidden")).toEqual([MODERATION_ACTION.RESTORE_COMMENT]);
    expect(of("comment", "deleted")).toEqual([]);
    expect(of("story", "visible")).toEqual([MODERATION_ACTION.REMOVE_STORY]);
    expect(of("story", "removed")).toEqual([MODERATION_ACTION.RESTORE_STORY]);
    expect(of("chapter", "visible")).toEqual([MODERATION_ACTION.REMOVE_STORY]);
    expect(of("chapter", "removed")).toEqual([MODERATION_ACTION.RESTORE_STORY]);
    expect(of("user", "active")).toEqual([MODERATION_ACTION.SUSPEND_USER]);
    expect(of("user", "suspended")).toEqual([MODERATION_ACTION.REINSTATE_USER]);
    expect(of("user", "deactivated")).toEqual([]);
  });

  it("acts on a chapter through its story, and on everything else by its own id", () => {
    const chapter = toReport(row(1, { target_kind: "chapter", target_id: CHAPTER }))!;
    expect(actionTargetId(chapter)).toBe(STORY);
    const comment = toReport(row(2, { target_kind: "comment" }))!;
    expect(actionTargetId(comment)).toBe(comment.targetId);
    expect(actionTargetId(toReport(row(3, { target_kind: "chapter", target_id: CHAPTER, story_id: null }))!)).toBe(
      CHAPTER,
    );
  });

  it("checks the reason and explains failures by kind", () => {
    expect(checkReason("  ab ")).toBe("tooShort");
    expect(checkReason("abc")).toBeNull();
    expect(checkReason("x".repeat(1000))).toBeNull();
    expect(checkReason("x".repeat(1001))).toBe("tooLong");
    expect(reportErrorMessage(new AppError("rateLimited", "x"))).toBe(t.report.errors.rateLimited);
    expect(reportErrorMessage(new AppError("invalid", "x"))).toBe(t.report.errors.invalid);
    expect(reportErrorMessage(new AppError("notFound", "x"))).toBe(t.report.errors.notFound);
    expect(reportErrorMessage(new AppError("unknown", "x"))).toBe(t.report.errors.generic);
    expect(actionErrorMessage(new AppError("forbidden", "x"))).toBe(t.console.errors.forbidden);
    expect(actionErrorMessage(new AppError("conflict", "x"))).toBe(t.console.errors.conflict);
    expect(actionErrorMessage(new AppError("unknown", "x"))).toBe(t.console.errors.generic);
  });
});

type RpcResult = { data: unknown; error: unknown };
type RpcHandler = (args: Record<string, unknown>) => RpcResult | Promise<RpcResult>;

function fakeClient(handlers: Record<string, RpcHandler> = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    const handler = handlers[name];
    if (handler) return handler(args);
    return { data: name === "list_reports" ? [] : null, error: null };
  });
  // The console also lists announcements (its own tests are in announcements/): an empty list here.
  const limit = vi.fn(async () => ({ data: [], error: null }));
  const order = vi.fn(() => ({ order, limit }));
  const from = vi.fn(() => ({ select: () => ({ order }) }));
  return { rpc, from, calls, of: (name: string) => calls.filter((c) => c.name === name) };
}

describe("moderation api", () => {
  it("sends a report with the optional details only when there are some", async () => {
    const c = fakeClient({ submit_report: () => ({ data: id(7), error: null }) });
    const client = c as unknown as DataClient;
    expect(await submitReport(client, { kind: "story", targetId: STORY, reason: "spam", description: "  hi  " })).toBe(
      id(7),
    );
    expect(c.of("submit_report")[0]?.args).toEqual({
      p_kind: "story",
      p_target_id: STORY,
      p_reason: "spam",
      p_description: "hi",
    });
    await submitReport(client, { kind: "user", targetId: id(5), reason: "other", description: "   " });
    expect(c.of("submit_report")[1]?.args).toEqual({ p_kind: "user", p_target_id: id(5), p_reason: "other" });
  });

  it("asks for one row more than a page; open oldest first, closed newest first; passes the cursor", async () => {
    const c = fakeClient({ list_reports: () => ({ data: [row(1)], error: null }) });
    const client = c as unknown as DataClient;
    expect((await listReports(client, { filter: "open" })).items).toHaveLength(1);
    expect(c.of("list_reports")[0]?.args).toEqual({
      p_status: "open",
      p_newest_first: false,
      p_limit: QUEUE_PAGE_SIZE + 1,
    });
    await listReports(client, { filter: "closed", cursor: { createdAt: "2026-11-04T10:00:00+00:00", id: id(3) } });
    expect(c.of("list_reports")[1]?.args).toEqual({
      p_status: "closed",
      p_newest_first: true,
      p_cursor_at: "2026-11-04T10:00:00+00:00",
      p_cursor_id: id(3),
      p_limit: QUEUE_PAGE_SIZE + 1,
    });
  });

  it("moderates and resolves with a trimmed reason", async () => {
    const c = fakeClient({ moderate: () => ({ data: "hidden", error: null }) });
    const client = c as unknown as DataClient;
    expect(
      await moderate(client, { action: "hide_comment", targetId: id(4), reason: "  lý do rõ  ", reportId: id(1) }),
    ).toBe("hidden");
    expect(c.of("moderate")[0]?.args).toEqual({
      p_action: "hide_comment",
      p_target_id: id(4),
      p_reason: "lý do rõ",
      p_report_id: id(1),
    });
    await resolveReport(client, { reportId: id(1), status: "dismissed", reason: " không vi phạm " });
    expect(c.of("resolve_report")[0]?.args).toEqual({
      p_report_id: id(1),
      p_status: "dismissed",
      p_reason: "không vi phạm",
    });
  });
});

const toasts = { show: vi.fn() };
const navigation = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/story/a/b" };
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _replace, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => navigation,
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

const moderatorSession = {
  access_token: "t",
  user: { id: "00000000-0000-4000-8000-0000000000dd", email: "m@test.dev", app_metadata: { role: "moderator" } },
} as unknown as Session;

function renderUi(client: ReturnType<typeof fakeClient>, ui: React.ReactNode, session: Session | null = testSession()) {
  toasts.show.mockClear();
  navigation.push.mockClear();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, session)}>
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
  // jsdom lacks these; Radix Select calls them when it opens.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

async function pickReason(label: string) {
  const group = await screen.findByRole("radiogroup", { name: t.report.reasonLabel });
  fireEvent.click(within(group).getByRole("radio", { name: label }));
}

describe("ReportButton", () => {
  it("sends a guest to sign in and brings them back", async () => {
    const c = fakeClient();
    renderUi(c, <ReportButton kind="story" targetId={STORY} />, null);
    fireEvent.click(await screen.findByRole("button", { name: `${t.report.button} ${t.report.kinds.story}` }));
    expect(navigation.push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/story/a/b")}`);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(c.calls).toHaveLength(0);
  });

  it("is not shown to the owner of the thing", async () => {
    renderUi(fakeClient(), <ReportButton kind="user" targetId={TEST_USER_ID} ownerId={TEST_USER_ID} />);
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });

  it("needs a reason, then sends the report and says so", async () => {
    const c = fakeClient({ submit_report: () => ({ data: id(7), error: null }) });
    renderUi(c, <ReportButton kind="comment" targetId={id(55)} />);
    fireEvent.click(await screen.findByRole("button", { name: `${t.report.button} ${t.report.kinds.comment}` }));
    const dialog = await screen.findByRole("dialog");
    const send = within(dialog).getByRole("button", { name: t.report.submit }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await pickReason(t.report.reasons.harassment);
    fireEvent.change(within(dialog).getByLabelText(t.report.detailsLabel), { target: { value: "  lăng mạ  " } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() =>
      expect(c.of("submit_report")[0]?.args).toEqual({
        p_kind: "comment",
        p_target_id: id(55),
        p_reason: "harassment",
        p_description: "lăng mạ",
      }),
    );
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.report.sent));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("explains a refusal in the dialog and keeps it open", async () => {
    const c = fakeClient({ submit_report: () => ({ data: null, error: { code: "PT429", message: "too many" } }) });
    renderUi(c, <ReportButton kind="story" targetId={STORY} />);
    fireEvent.click(await screen.findByRole("button", { name: `${t.report.button} ${t.report.kinds.story}` }));
    await pickReason(t.report.reasons.spam);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: t.report.submit }));
    expect((await screen.findByRole("alert")).textContent).toBe(t.report.errors.rateLimited);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("adapts the details hint and example to the reason, and counts the characters", async () => {
    renderUi(fakeClient(), <ReportButton kind="chapter" targetId={CHAPTER} />);
    fireEvent.click(await screen.findByRole("button", { name: `${t.report.button} ${t.report.kinds.chapter}` }));
    const details = (await screen.findByLabelText(t.report.detailsLabel)) as HTMLTextAreaElement;
    expect(details.placeholder).toBe(t.report.detailsPlaceholder);
    expect(screen.queryByText(t.report.reasonHelp.copyright.hint)).toBeNull();
    await pickReason(t.report.reasons.copyright);
    expect(screen.getByText(t.report.reasonHelp.copyright.hint)).toBeTruthy();
    expect(details.placeholder).toBe(t.report.reasonHelp.copyright.placeholder);
    await pickReason(t.report.reasons.spam);
    expect(screen.queryByText(t.report.reasonHelp.copyright.hint)).toBeNull();
    expect(details.getAttribute("aria-describedby")).toBe("report-details-hint report-details-count");
    expect(document.getElementById("report-details-hint")?.textContent).toBe(t.report.reasonHelp.spam.hint);
    fireEvent.change(details, { target: { value: "abc" } });
    expect(document.getElementById("report-details-count")?.textContent).toBe(t.report.detailsCount(3, 2000));
    expect(screen.getByRole("radio", { name: t.report.reasons.spam }).getAttribute("aria-checked")).toBe("true");
  });

  it("starts from a clean form after cancelling", async () => {
    renderUi(fakeClient(), <ReportButton kind="story" targetId={STORY} />);
    const open = async () =>
      fireEvent.click(await screen.findByRole("button", { name: `${t.report.button} ${t.report.kinds.story}` }));
    await open();
    await pickReason(t.report.reasons.hate);
    fireEvent.change(screen.getByLabelText(t.report.detailsLabel), { target: { value: "dở dang" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: t.report.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await open();
    expect((screen.getByLabelText(t.report.detailsLabel) as HTMLTextAreaElement).value).toBe("");
    expect(
      (within(screen.getByRole("dialog")).getByRole("button", { name: t.report.submit }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe("ModerationScreen", () => {
  it("asks a guest to sign in and requests nothing", async () => {
    const c = fakeClient();
    renderUi(c, <ModerationScreen />, null);
    expect(await screen.findByRole("link", { name: t.console.signInLink })).toBeTruthy();
    expect(c.calls).toHaveLength(0);
  });

  it("tells a signed-in reader the page is not for them and asks nothing", async () => {
    const c = fakeClient();
    renderUi(c, <ModerationScreen />);
    expect(await screen.findByText(t.console.noAccess.title)).toBeTruthy();
    expect(c.calls).toHaveLength(0);
  });

  it("lists the open reports with their context", async () => {
    const c = fakeClient({
      list_reports: () => ({
        data: [
          row(1, { open_reports: 3, target_title: "Lời lẽ xúc phạm" }),
          row(2, { target_kind: "story", target_title: "Truyện lạ", chapter_slug: null, target_state: "removed" }),
        ],
        error: null,
      }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    const first = await screen.findByRole("article", { name: "Lời lẽ xúc phạm" });
    expect(within(first).getByText(t.console.kinds.comment)).toBeTruthy();
    expect(within(first).getByText(t.console.openReports(3))).toBeTruthy();
    expect(within(first).getByText(t.console.reportedBy("Người báo 1"))).toBeTruthy();
    expect(within(first).getByText(t.report.reasons.spam)).toBeTruthy();
    expect(within(first).getByRole("link", { name: t.console.openTarget }).getAttribute("href")).toBe(
      `/story/${STORY}/ten-truyen/chuong-1`,
    );
    const second = screen.getByRole("article", { name: "Truyện lạ" });
    expect(within(second).getByRole("button", { name: t.console.actions.restore_story })).toBeTruthy();
    expect(within(second).queryByRole("button", { name: t.console.actions.remove_story })).toBeNull();
    expect(c.of("list_reports")[0]?.args.p_status).toBe("open");
  });

  it("switches to the handled reports, which have no actions on the report itself", async () => {
    const c = fakeClient({
      list_reports: (args) => ({
        data:
          args.p_status === "closed"
            ? [row(3, { status: "resolved", target_state: "hidden", target_title: "Đã xử lý" })]
            : [],
        error: null,
      }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    expect(await screen.findByText(t.console.empty.open)).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("tab", { name: t.console.tabs.closed }), { button: 0 });
    fireEvent.click(screen.getByRole("tab", { name: t.console.tabs.closed }));
    const card = await screen.findByRole("article", { name: "Đã xử lý" });
    expect(within(card).getByRole("button", { name: t.console.actions.restore_comment })).toBeTruthy(); // undo stays possible
    expect(within(card).queryByRole("button", { name: t.console.actions.dismiss_report })).toBeNull();
    expect(within(card).queryByRole("button", { name: t.console.actions.resolve_report })).toBeNull();
    expect(c.of("list_reports").at(-1)?.args).toMatchObject({ p_status: "closed", p_newest_first: true });
  });

  it("explains a load failure and retries", async () => {
    const c = fakeClient({ list_reports: () => ({ data: null, error: { code: "XX000", message: "x" } }) });
    renderUi(c, <ModerationScreen />, moderatorSession);
    fireEvent.click(await screen.findByRole("button", { name: t.console.error.retry }));
    await waitFor(() => expect(c.of("list_reports").length).toBeGreaterThan(1));
  });

  it("loads the next page on request", async () => {
    const full = Array.from({ length: QUEUE_PAGE_SIZE + 1 }, (_, i) =>
      row((i % 9) + 1, { id: id(i + 1), target_title: `Mục ${i + 1}` }),
    );
    const c = fakeClient({
      list_reports: (args) => ({
        data: args.p_cursor_id ? [row(8, { id: id(500), target_title: "Mục cuối" })] : full,
        error: null,
      }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    fireEvent.click(await screen.findByRole("button", { name: t.console.loadMore }));
    expect(await screen.findByRole("article", { name: "Mục cuối" })).toBeTruthy();
    expect(c.of("list_reports").at(-1)?.args.p_cursor_id).toBe(id(QUEUE_PAGE_SIZE));
  });

  async function openAction(label: string, title = "Nội dung 1") {
    const card = await screen.findByRole("article", { name: title });
    fireEvent.click(within(card).getByRole("button", { name: label }));
    return await screen.findByRole("dialog");
  }

  it("asks for a written reason before any action, then sends it with the report", async () => {
    const c = fakeClient({
      list_reports: () => ({ data: [row(1)], error: null }),
      moderate: () => ({ data: "hidden", error: null }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    const dialog = await openAction(t.console.actions.hide_comment);
    const confirm = within(dialog).getByRole("button", { name: t.console.dialog.confirm }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(t.console.dialog.reasonLabel), { target: { value: "ab" } });
    expect(within(dialog).getByText(t.console.dialog.tooShort)).toBeTruthy();
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(t.console.dialog.reasonLabel), {
      target: { value: "  quấy rối rõ ràng " },
    });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(c.of("moderate")[0]?.args).toEqual({
        p_action: "hide_comment",
        p_target_id: id(101),
        p_reason: "quấy rối rõ ràng",
        p_report_id: id(1),
      }),
    );
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.console.done));
    await waitFor(() => expect(c.of("list_reports").length).toBeGreaterThan(1)); // the queue reloads
  });

  it("removes a reported chapter's story, not the chapter", async () => {
    const c = fakeClient({
      list_reports: () => ({
        data: [row(1, { target_kind: "chapter", target_id: CHAPTER, target_title: "Chương lạ" })],
        error: null,
      }),
      moderate: () => ({ data: "removed", error: null }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    const dialog = await openAction(t.console.actions.remove_story, "Chương lạ");
    fireEvent.change(within(dialog).getByLabelText(t.console.dialog.reasonLabel), {
      target: { value: "vi phạm bản quyền" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: t.console.dialog.confirm }));
    await waitFor(() =>
      expect(c.of("moderate")[0]?.args).toMatchObject({ p_action: "remove_story", p_target_id: STORY }),
    );
  });

  it("dismisses, resolves and marks a report as being reviewed through resolve_report", async () => {
    const c = fakeClient({
      list_reports: () => ({ data: [row(1)], error: null }),
      resolve_report: () => ({ data: null, error: null }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    for (const [label, status] of [
      [t.console.actions.dismiss_report, "dismissed"],
      [t.console.actions.resolve_report, "resolved"],
      [t.console.actions.review_report, "reviewing"],
    ] as const) {
      const dialog = await openAction(label);
      fireEvent.change(within(dialog).getByLabelText(t.console.dialog.reasonLabel), {
        target: { value: `lý do ${status}` },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: t.console.dialog.confirm }));
      await waitFor(() =>
        expect(c.of("resolve_report").at(-1)?.args).toEqual({
          p_report_id: id(1),
          p_status: status,
          p_reason: `lý do ${status}`,
        }),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
    expect(c.of("moderate")).toHaveLength(0);
  });

  it("offers no 'reviewing' step for a report already being reviewed", async () => {
    renderUi(
      fakeClient({ list_reports: () => ({ data: [row(1, { status: "reviewing" })], error: null }) }),
      <ModerationScreen />,
      moderatorSession,
    );
    const card = await screen.findByRole("article", { name: "Nội dung 1" });
    expect(within(card).queryByRole("button", { name: t.console.actions.review_report })).toBeNull();
    expect(within(card).getByRole("button", { name: t.console.actions.resolve_report })).toBeTruthy();
  });

  it("shows a refusal inside the dialog and keeps it open for another try", async () => {
    const c = fakeClient({
      list_reports: () => ({
        data: [row(1, { target_kind: "user", target_state: "active", target_title: "Một người" })],
        error: null,
      }),
      moderate: () => ({ data: null, error: { code: "22023", message: "moderator" } }),
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    const dialog = await openAction(t.console.actions.suspend_user, "Một người");
    fireEvent.change(within(dialog).getByLabelText(t.console.dialog.reasonLabel), {
      target: { value: "lý do đủ dài" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: t.console.dialog.confirm }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe(t.console.errors.invalid);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("forgets the reason when the dialog is cancelled", async () => {
    renderUi(
      fakeClient({ list_reports: () => ({ data: [row(1)], error: null }) }),
      <ModerationScreen />,
      moderatorSession,
    );
    let dialog = await openAction(t.console.actions.hide_comment);
    fireEvent.change(within(dialog).getByLabelText(t.console.dialog.reasonLabel), { target: { value: "dở dang" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.console.dialog.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    dialog = await openAction(t.console.actions.hide_comment);
    expect((within(dialog).getByLabelText(t.console.dialog.reasonLabel) as HTMLTextAreaElement).value).toBe("");
  });
});

describe("ModerationScreen detail panel", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("opens a report in the side panel with its actions, steps with J / K and closes with Escape", async () => {
    const c = fakeClient({ list_reports: () => ({ data: [row(1), row(2), row(3)], error: null }) });
    renderUi(c, <ModerationScreen />, moderatorSession);
    const card = await screen.findByRole("article", { name: "Nội dung 2" });
    fireEvent.click(within(card).getByRole("button", { name: "Nội dung 2" }));

    let panel = await screen.findByRole("dialog", { name: "Nội dung 2" });
    expect(within(panel).getByText(t.console.panel.position(2, 3))).toBeTruthy();
    expect(within(panel).getByText("Chi tiết 2")).toBeTruthy();
    expect(within(panel).getByRole("button", { name: t.console.actions.hide_comment })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: t.console.actions.dismiss_report })).toBeTruthy();
    expect(document.querySelector('article[aria-current="true"]')?.getAttribute("aria-label")).toBe("Nội dung 2");

    fireEvent.keyDown(within(panel).getByRole("button", { name: t.console.panel.close }), { key: "j" });
    panel = await screen.findByRole("dialog", { name: "Nội dung 3" });
    expect(within(panel).getByText(t.console.panel.position(3, 3))).toBeTruthy();
    expect((within(panel).getByRole("button", { name: t.console.panel.next }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.keyDown(within(panel).getByRole("button", { name: t.console.panel.close }), { key: "k" });
    fireEvent.keyDown(within(panel).getByRole("button", { name: t.console.panel.close }), { key: "k" });
    panel = await screen.findByRole("dialog", { name: "Nội dung 1" });
    expect(document.querySelector('article[aria-current="true"]')?.getAttribute("aria-label")).toBe("Nội dung 1");

    fireEvent.keyDown(panel, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.querySelector('article[aria-current="true"]')).toBeNull();
  });

  it("does not switch reports while the reason is being typed, and moves on to the next one once handled", async () => {
    let handled = false;
    const c = fakeClient({
      list_reports: () => ({ data: handled ? [row(2), row(3)] : [row(1), row(2), row(3)], error: null }),
      resolve_report: () => {
        handled = true;
        return { data: null, error: null };
      },
    });
    renderUi(c, <ModerationScreen />, moderatorSession);
    const card = await screen.findByRole("article", { name: "Nội dung 1" });
    fireEvent.click(within(card).getByText(t.console.reportedBy("Người báo 1"))); // a click on the card itself
    const panel = await screen.findByRole("dialog", { name: "Nội dung 1" });
    fireEvent.click(within(panel).getByRole("button", { name: t.console.actions.resolve_report }));
    const reason = await screen.findByLabelText(t.console.dialog.reasonLabel);
    fireEvent.keyDown(reason, { key: "j" });
    expect(screen.getByRole("dialog", { name: "Nội dung 1" })).toBeTruthy();
    fireEvent.change(reason, { target: { value: "đã xử lý xong" } });
    fireEvent.click(screen.getByRole("button", { name: t.console.dialog.confirm }));
    await waitFor(() => expect(c.of("resolve_report")).toHaveLength(1));
    expect(await screen.findByRole("dialog", { name: "Nội dung 2" })).toBeTruthy();
  });
});
