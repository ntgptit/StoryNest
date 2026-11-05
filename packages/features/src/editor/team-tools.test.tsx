// Draft sign-off (Lucian 180) and the advisory edit lock (Lucian 196) of the chapter editor (batch 4 authoring4).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import { AppError } from "../_shared/errors.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { EditLockPanel } from "./components/edit-lock-panel.tsx";
import { ReviewPanel } from "./components/review-panel.tsx";
import { lockState, toEditLock, type EditLock } from "./model/edit-lock.ts";
import { reviewActions, reviewErrorMessage, toChapterReview, type ReviewRow } from "./model/review.ts";
import { editorText } from "./strings.ts";

afterEach(cleanup);

const CHAPTER = "c0000000-0000-4000-8000-000000000001";
const STORY = "5eed0000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-0000000000bb";
const later = () => new Date(Date.now() + 60_000).toISOString();

const reviewRow = (overrides: Partial<ReviewRow> = {}): ReviewRow => ({
  status: "pending",
  requested_by: OTHER,
  requested_at: "2026-11-05T00:00:00Z",
  requested_revision: 4,
  request_note: "Xem đoạn cuối",
  decided_by: null,
  decided_at: null,
  decision_note: "",
  requester: { username: "binh", display_name: "Bình" },
  decider: null,
  ...overrides,
});

describe("review model", () => {
  it("lets owners and co-authors decide only someone else's pending request", () => {
    const pending = toChapterReview(reviewRow());
    expect(reviewActions(pending, "owner", TEST_USER_ID, 4)).toMatchObject({ canDecide: true, stale: false });
    expect(reviewActions(pending, "editor", TEST_USER_ID, 4).canDecide).toBe(false);
    expect(reviewActions(pending, "owner", OTHER, 4)).toMatchObject({ canDecide: false, ownRequest: true });
    expect(reviewActions(pending, "co_author", TEST_USER_ID, 6).stale).toBe(true);
    expect(reviewActions(null, "editor", TEST_USER_ID, 1)).toMatchObject({ canRequest: true, canDecide: false });
    expect(reviewActions(null, null, TEST_USER_ID, 1).canRequest).toBe(false);
    expect(toChapterReview(reviewRow({ status: "weird" })).status).toBe("pending");
    expect(reviewErrorMessage(new AppError("conflict", "x"))).toBe(editorText.review.errors.conflict);
  });
});

describe("edit lock model", () => {
  const lock = (overrides: Partial<EditLock> = {}): EditLock => ({
    holderId: OTHER,
    holderName: "Bình",
    expiresAt: later(),
    requestedBy: null,
    requesterName: null,
    ...overrides,
  });

  it("reads mine, someone else's, free and expired", () => {
    const now = Date.now();
    expect(lockState(null, TEST_USER_ID, now)).toEqual({ kind: "free" });
    expect(lockState(lock({ expiresAt: new Date(now - 1).toISOString() }), TEST_USER_ID, now)).toEqual({
      kind: "free",
    });
    expect(lockState(lock(), TEST_USER_ID, now)).toMatchObject({ kind: "other", askedByMe: false });
    expect(lockState(lock({ requestedBy: TEST_USER_ID }), TEST_USER_ID, now)).toMatchObject({ askedByMe: true });
    expect(
      lockState(lock({ holderId: TEST_USER_ID, requestedBy: OTHER, requesterName: "Bình" }), TEST_USER_ID, now),
    ).toEqual({ kind: "mine", askedBy: { id: OTHER, name: "Bình" } });
    expect(toEditLock({ holder_id: undefined } as never)).toBeNull();
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
const toasts = { show: vi.fn() };

function fakeClient(rows: { review?: unknown; lock?: unknown; role?: string }) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "returns"]) builder[method] = () => builder;
    builder.maybeSingle = () =>
      Promise.resolve({
        data:
          table === "chapter_reviews"
            ? (rows.review ?? null)
            : table === "chapter_edit_locks"
              ? (rows.lock ?? null)
              : { story_id: STORY, status: "draft", scheduled_for: null },
        error: null,
      });
    return builder;
  });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "story_role") return { data: rows.role ?? "owner", error: null };
    rpcCalls.push({ name, args });
    return { data: null, error: null };
  });
  const channel = vi.fn(() => {
    const ch = { on: () => ch, subscribe: () => ch };
    return ch;
  });
  const removeChannel = vi.fn(async () => "ok");
  return { from, rpc, channel, removeChannel, rpcCalls };
}

function renderWith(c: ReturnType<typeof fakeClient>, ui: ReactNode) {
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

describe("ReviewPanel", () => {
  it("asks for a review of the saved revision (saving first)", async () => {
    const c = fakeClient({ role: "editor" });
    const ensureSaved = vi.fn(async () => 7);
    renderWith(c, <ReviewPanel chapterId={CHAPTER} ensureSaved={ensureSaved} currentRevision={7} />);
    expect(await screen.findByText(editorText.review.status.none)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(editorText.review.note), { target: { value: "Đoạn cuối" } });
    fireEvent.click(screen.getByRole("button", { name: editorText.review.request }));
    await waitFor(() => expect(c.rpcCalls).toHaveLength(1));
    expect(ensureSaved).toHaveBeenCalled();
    expect(c.rpcCalls[0]).toEqual({
      name: "request_chapter_review",
      args: { p_chapter_id: CHAPTER, p_expected_revision: 7, p_note: "Đoạn cuối" },
    });
    expect(screen.queryByRole("button", { name: editorText.review.approve })).toBeNull();
  });

  it("lets the owner approve someone else's request, and says when the draft moved on", async () => {
    const c = fakeClient({ review: reviewRow(), role: "owner" });
    renderWith(c, <ReviewPanel chapterId={CHAPTER} ensureSaved={async () => 5} currentRevision={5} />);
    expect(await screen.findByText(new RegExp(editorText.review.status.stale))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: editorText.review.approve }));
    await waitFor(() =>
      expect(c.rpcCalls[0]).toEqual({
        name: "decide_chapter_review",
        args: { p_chapter_id: CHAPTER, p_approve: true, p_note: "" },
      }),
    );
  });
});

describe("EditLockPanel", () => {
  it("claims the lock on open, shows who edits and asks the holder", async () => {
    const c = fakeClient({
      lock: {
        chapter_id: CHAPTER,
        holder_id: OTHER,
        acquired_at: "2026-11-05T00:00:00Z",
        expires_at: later(),
        requested_by: null,
        requested_at: null,
        holder: { username: "binh", display_name: "Bình" },
        requester: null,
      },
    });
    renderWith(c, <EditLockPanel chapterId={CHAPTER} />);
    expect(await screen.findByText(`Bình · ${editorText.lock.editing}`)).toBeTruthy();
    expect(screen.getByText(editorText.lock.status.other("Bình"))).toBeTruthy();
    await waitFor(() => expect(c.rpcCalls.map((call) => call.name)).toContain("claim_edit_lock"));
    fireEvent.click(screen.getByRole("button", { name: editorText.lock.request }));
    await waitFor(() => expect(c.rpcCalls.map((call) => call.name)).toContain("request_edit_lock"));
    expect(c.channel).toHaveBeenCalledWith(`edit-lock:${CHAPTER}`);
  });

  it("offers the holder to hand over to whoever asked, and releases on close", async () => {
    const c = fakeClient({
      lock: {
        chapter_id: CHAPTER,
        holder_id: TEST_USER_ID,
        acquired_at: "2026-11-05T00:00:00Z",
        expires_at: later(),
        requested_by: OTHER,
        requested_at: "2026-11-05T00:00:10Z",
        holder: { username: "me", display_name: "" },
        requester: { username: "binh", display_name: "Bình" },
      },
    });
    renderWith(c, <EditLockPanel chapterId={CHAPTER} />);
    fireEvent.click(await screen.findByRole("button", { name: editorText.lock.handOver("Bình") }));
    await waitFor(() => expect(c.rpcCalls.map((call) => call.name)).toContain("hand_over_edit_lock"));
    cleanup();
    await waitFor(() => expect(c.rpcCalls.map((call) => call.name)).toContain("release_edit_lock"));
  });
});
