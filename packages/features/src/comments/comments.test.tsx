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
import { ReaderBlocks } from "../reader/components/reader-blocks.tsx";
import type { ReaderBlock } from "../reader/index.ts";
import {
  canModerateComments,
  deleteComment,
  editComment,
  getBlockCommentCounts,
  listComments,
  listReplies,
  postComment,
  setCommentHidden,
  setCommentLike,
} from "./api/comments.api.ts";
import { CommentThread, useBlockCommentCounts } from "./index.ts";
import {
  AUTHOR_HIDDEN_CARD_STATUS,
  COMMENTS_PAGE_SIZE,
  checkBody,
  commentErrorMessage,
  cursorAfter,
  toComment,
  toPage,
  withLike,
  type CommentCardRow,
} from "./model/comment.ts";
import { commentText } from "./strings.ts";

afterEach(cleanup);

const CHAPTER = "c0000000-0000-4000-8000-0000000000c1";
const BLOCK = "b0000000-0000-4000-8000-0000000000b1";
const cid = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const OTHER_USER = "00000000-0000-4000-8000-0000000000ee";

const row = (n: number, overrides: Partial<CommentCardRow> = {}): CommentCardRow => ({
  id: cid(n),
  chapter_id: CHAPTER,
  block_id: null,
  parent_comment_id: null,
  author_id: OTHER_USER,
  author_username: `user${n}`,
  author_display_name: `Người ${n}`,
  author_avatar_key: null,
  body: `Nội dung ${n}`,
  status: "visible",
  created_at: `2026-11-04T10:00:0${n}.123456+00:00`,
  edited: false,
  like_count: 0,
  liked_by_me: false,
  reply_count: 0,
  ...overrides,
});

describe("comment model", () => {
  it("maps a row, falls back to the username for a blank display name, and keeps the server's timestamp text", () => {
    const c = toComment(
      row(1, { author_display_name: "  ", like_count: 3, liked_by_me: true, reply_count: 2, edited: true }),
    );
    expect(c).toMatchObject({ authorName: "user1", likes: 3, likedByMe: true, replyCount: 2, edited: true });
    expect(c?.createdAt).toBe("2026-11-04T10:00:01.123456+00:00");
  });

  it("drops rows that cannot be drawn", () => {
    expect(toComment(row(1, { id: null }))).toBeNull();
    expect(toComment(row(1, { created_at: null }))).toBeNull();
    expect(toComment(row(1, { status: "weird" }))).toBeNull();
  });

  it("cuts the extra row off a page and uses it only to say that more exist", () => {
    const rows = Array.from({ length: COMMENTS_PAGE_SIZE + 1 }, (_, i) => row((i % 9) + 1, { id: cid(i + 1) }));
    const page = toPage(rows);
    expect(page.items).toHaveLength(COMMENTS_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(cursorAfter(page)).toEqual({ createdAt: page.items.at(-1)?.createdAt, id: cid(COMMENTS_PAGE_SIZE) });
    const last = toPage(rows.slice(0, 3));
    expect(last.hasMore).toBe(false);
    expect(cursorAfter(last)).toBeUndefined();
  });

  it("shows a like at once, never below zero, and leaves an unchanged state alone", () => {
    const base = toComment(row(1, { like_count: 2 }))!;
    expect(withLike(base, true)).toMatchObject({ likedByMe: true, likes: 3 });
    expect(withLike({ ...base, likedByMe: true, likes: 0 }, false)).toMatchObject({ likedByMe: false, likes: 0 });
    expect(withLike(base, false)).toBe(base);
  });

  it("checks the text and explains failures by kind", () => {
    expect(checkBody("   ")).toBe("empty");
    expect(checkBody("x".repeat(10001))).toBe("tooLong");
    expect(checkBody(" ok ")).toBeNull();
    expect(commentErrorMessage(new AppError("forbidden", "x"))).toBe(commentText.errors.forbidden);
    expect(commentErrorMessage(new AppError("conflict", "x"))).toBe(commentText.errors.conflict);
    expect(commentErrorMessage(new AppError("unknown", "x"))).toBe(commentText.errors.generic);
    expect(commentErrorMessage(new AppError("rateLimited", "x"))).toBe(commentText.errors.rateLimited);
    expect(commentErrorMessage(new AppError("invalid", "x", { details: "spam" }))).toBe(commentText.errors.spam);
    expect(commentErrorMessage(new AppError("invalid", "x", { details: "something else" }))).toBe(
      commentText.errors.invalid,
    );
    expect(commentErrorMessage(new AppError("invalid", "x"))).toBe(commentText.errors.invalid);
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
    return {
      data: name === "list_comments" || name === "list_replies" || name === "comment_counts_by_block" ? [] : null,
      error: null,
    };
  });
  return { rpc, calls, of: (name: string) => calls.filter((c) => c.name === name) };
}

describe("comments api", () => {
  it("asks for one row more than a page, omits the paragraph for chapter scope, and passes the cursor", async () => {
    const c = fakeClient({ list_comments: () => ({ data: [row(1)], error: null }) });
    const client = c as unknown as DataClient;
    const page = await listComments(client, { chapterId: CHAPTER, blockId: null, newestFirst: true });
    expect(page.items).toHaveLength(1);
    await listComments(client, {
      chapterId: CHAPTER,
      blockId: BLOCK,
      newestFirst: false,
      cursor: { createdAt: "2026-11-04T10:00:01.123456+00:00", id: cid(1) },
    });
    expect(c.of("list_comments").map((x) => x.args)).toEqual([
      { p_chapter_id: CHAPTER, p_newest_first: true, p_limit: COMMENTS_PAGE_SIZE + 1 },
      {
        p_chapter_id: CHAPTER,
        p_block_id: BLOCK,
        p_newest_first: false,
        p_cursor_at: "2026-11-04T10:00:01.123456+00:00",
        p_cursor_id: cid(1),
        p_limit: COMMENTS_PAGE_SIZE + 1,
      },
    ]);
  });

  it("lists replies, counts per paragraph, posts, edits, deletes and likes with the arguments the database expects", async () => {
    const c = fakeClient({
      comment_counts_by_block: () => ({
        data: [
          { block_id: BLOCK, comment_count: 3 },
          { block_id: null, comment_count: 9 },
        ],
        error: null,
      }),
      post_comment: () => ({ data: cid(7), error: null }),
      set_comment_like: () => ({ data: 5, error: null }),
    });
    const client = c as unknown as DataClient;
    await listReplies(client, { parentId: cid(1) });
    expect(await getBlockCommentCounts(client, CHAPTER)).toEqual({ [BLOCK]: 3 });
    expect(
      await postComment(client, { id: cid(7), chapterId: CHAPTER, blockId: null, parentId: cid(1), body: "hi" }),
    ).toBe(cid(7));
    await editComment(client, cid(7), "sửa");
    await deleteComment(client, cid(7));
    expect(await setCommentLike(client, cid(7), true)).toBe(5);
    expect(c.calls.map((x) => [x.name, x.args])).toEqual([
      ["list_replies", { p_parent_id: cid(1), p_limit: COMMENTS_PAGE_SIZE + 1 }],
      ["comment_counts_by_block", { p_chapter_id: CHAPTER }],
      ["post_comment", { p_id: cid(7), p_chapter_id: CHAPTER, p_block_id: null, p_parent_id: cid(1), p_body: "hi" }],
      ["edit_comment", { p_comment_id: cid(7), p_body: "sửa" }],
      ["delete_comment", { p_comment_id: cid(7) }],
      ["set_comment_like", { p_comment_id: cid(7), p_liked: true }],
    ]);
  });

  it("throws the error with its kind", async () => {
    const c = fakeClient({ post_comment: () => ({ data: null, error: { code: "PT409", message: "x" } }) });
    await expect(
      postComment(c as unknown as DataClient, {
        id: cid(1),
        chapterId: CHAPTER,
        blockId: null,
        parentId: null,
        body: "x",
      }),
    ).rejects.toMatchObject({ kind: "conflict" });
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
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/story/s/t/c" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderUi(c: ReturnType<typeof fakeClient>, ui: React.ReactNode, signedIn = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, signedIn ? testSession() : null)}>
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
  push.mockClear();
  toasts.show.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

const thread = () => <CommentThread chapterId={CHAPTER} />;
const listOf = async () => within(await screen.findByRole("list", { name: commentText.threadLabel }));

describe("CommentThread", () => {
  it("lists comments with author, text and like count; a guest sees them and a sign-in link, not the box", async () => {
    const c = fakeClient({ list_comments: () => ({ data: [row(1, { like_count: 4 }), row(2)], error: null }) });
    renderUi(c, thread(), false);
    const list = await listOf();
    expect(list.getByText("Người 1")).toBeTruthy();
    expect(list.getByText("Nội dung 2")).toBeTruthy();
    expect(list.getByText(commentText.item.likes("4"))).toBeTruthy();
    expect(screen.queryByLabelText(commentText.composer.label)).toBeNull();
    expect(screen.getByRole("link", { name: commentText.composer.guest }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent("/story/s/t/c")}`,
    );
  });

  it("shows an empty note, and a retry when the list cannot load", async () => {
    renderUi(fakeClient(), thread());
    expect(await screen.findByText(commentText.empty)).toBeTruthy();
    cleanup();
    let fail = true;
    const c = fakeClient({
      list_comments: () =>
        fail ? { data: null, error: { code: "XX000", message: "boom" } } : { data: [row(1)], error: null },
    });
    renderUi(c, thread());
    const retry = await screen.findByRole("button", { name: commentText.error.retry });
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText("Nội dung 1")).toBeTruthy();
  });

  it("loads the next page after the last comment shown, and hides the button when there is no more", async () => {
    const first = Array.from({ length: COMMENTS_PAGE_SIZE + 1 }, (_, i) =>
      row(1, { id: cid(i + 1), body: `n${i + 1}`, created_at: `2026-11-04T10:00:00.${String(100 + i)}000+00:00` }),
    );
    const c = fakeClient({
      list_comments: (args) =>
        args.p_cursor_id
          ? { data: [row(1, { id: cid(99), body: "cuối" })], error: null }
          : { data: first, error: null },
    });
    renderUi(c, thread());
    const list = await listOf();
    expect(list.getAllByRole("article")).toHaveLength(COMMENTS_PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: commentText.loadMore }));
    expect(await list.findByText("cuối")).toBeTruthy();
    const second = c.of("list_comments")[1]!.args;
    expect(second.p_cursor_id).toBe(cid(COMMENTS_PAGE_SIZE));
    expect(second.p_cursor_at).toBe(`2026-11-04T10:00:00.${100 + COMMENTS_PAGE_SIZE - 1}000+00:00`);
    expect(screen.queryByRole("button", { name: commentText.loadMore })).toBeNull();
  });

  it("posts a comment with a fresh id, clears the box and reloads", async () => {
    const c = fakeClient({ post_comment: () => ({ data: cid(1), error: null }) });
    renderUi(c, thread());
    const box = await screen.findByLabelText(commentText.composer.label);
    fireEvent.change(box, { target: { value: "  Hay quá  " } });
    fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
    await waitFor(() => expect(c.of("post_comment")).toHaveLength(1));
    expect(c.of("post_comment")[0]!.args).toMatchObject({
      p_chapter_id: CHAPTER,
      p_block_id: null,
      p_parent_id: null,
      p_body: "Hay quá",
    });
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(""));
    expect(toasts.show).toHaveBeenCalledWith("success", commentText.composer.posted);
    await waitFor(() => expect(c.of("list_comments").length).toBeGreaterThan(1));
  });

  it("gives the next comment a new id once the previous one was sent", async () => {
    const c = fakeClient({ post_comment: (args) => ({ data: args.p_id, error: null }) });
    renderUi(c, thread());
    const box = await screen.findByLabelText(commentText.composer.label);
    for (const text of ["Một", "Hai"]) {
      fireEvent.change(box, { target: { value: text } });
      fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
      await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(""));
    }
    const [one, two] = c.of("post_comment");
    expect(two!.args.p_id).not.toBe(one!.args.p_id);
  });

  it.each([
    [
      "a posting limit",
      { code: "PT429", message: "too many requests", hint: "comment_rate_burst" },
      commentText.errors.rateLimited,
    ],
    ["spam", { code: "22023", message: "this looks like spam", hint: "spam" }, commentText.errors.spam],
  ])("tells the author why a comment was turned away for %s, and keeps the text", async (_name, error, message) => {
    const c = fakeClient({ post_comment: () => ({ data: null, error }) });
    renderUi(c, thread());
    const box = await screen.findByLabelText(commentText.composer.label);
    fireEvent.change(box, { target: { value: "Nội dung" } });
    fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect((box as HTMLTextAreaElement).value).toBe("Nội dung");
  });

  it("keeps the text and reuses the same id when sending failed, so a retry cannot post twice", async () => {
    let attempt = 0;
    const c = fakeClient({
      post_comment: () =>
        ++attempt === 1 ? { data: null, error: { code: "XX000", message: "down" } } : { data: cid(1), error: null },
    });
    renderUi(c, thread());
    const box = await screen.findByLabelText(commentText.composer.label);
    fireEvent.change(box, { target: { value: "Thử" } });
    fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
    expect(await screen.findByText(commentText.errors.generic)).toBeTruthy();
    expect((box as HTMLTextAreaElement).value).toBe("Thử");
    fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
    await waitFor(() => expect(c.of("post_comment")).toHaveLength(2));
    const [one, two] = c.of("post_comment");
    expect(two!.args.p_id).toBe(one!.args.p_id);
  });

  it("refuses an empty comment without calling the server", async () => {
    const c = fakeClient();
    renderUi(c, thread());
    await screen.findByLabelText(commentText.composer.label);
    fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
    expect(await screen.findByText(commentText.validation.empty)).toBeTruthy();
    expect(c.of("post_comment")).toHaveLength(0);
  });

  it("scopes a paragraph's thread to its block and posts into it", async () => {
    const c = fakeClient({ post_comment: () => ({ data: cid(1), error: null }) });
    renderUi(c, <CommentThread chapterId={CHAPTER} blockId={BLOCK} />);
    const box = await screen.findByLabelText(commentText.composer.label);
    // the composer is on screen before the list query has been issued: wait for the call instead of assuming it
    await waitFor(() =>
      expect(c.of("list_comments")[0]?.args).toMatchObject({ p_block_id: BLOCK, p_newest_first: false }),
    );
    fireEvent.change(box, { target: { value: "đoạn này" } });
    fireEvent.click(screen.getByRole("button", { name: commentText.composer.submit }));
    await waitFor(() => expect(c.of("post_comment")[0]?.args).toMatchObject({ p_block_id: BLOCK }));
  });
});

function CountsProbe() {
  const counts = useBlockCommentCounts(CHAPTER);
  return <p data-testid="counts">{JSON.stringify(counts.data ?? {})}</p>;
}

describe("CommentItem actions", () => {
  it("a like updates the comment lists without touching the margin counts that share the cache prefix", async () => {
    const c = fakeClient({
      list_comments: () => ({ data: [row(1, { like_count: 4 })], error: null }),
      comment_counts_by_block: () => ({ data: [{ block_id: BLOCK, comment_count: 2 }], error: null }),
      set_comment_like: () => ({ data: 5, error: null }),
    });
    renderUi(
      c,
      <>
        <CountsProbe />
        {thread()}
      </>,
    );
    await waitFor(() => expect(screen.getByTestId("counts").textContent).toBe(JSON.stringify({ [BLOCK]: 2 })));
    const list = await listOf();
    fireEvent.click(list.getByRole("button", { name: commentText.item.like }));
    expect(await list.findByText(commentText.item.likes("5"))).toBeTruthy();
    expect(screen.getByTestId("counts").textContent).toBe(JSON.stringify({ [BLOCK]: 2 }));
  });

  it("likes at once, then takes the server's count; a refusal puts the old state back and says why", async () => {
    let answer: (value: RpcResult) => void = () => undefined;
    const c = fakeClient({
      list_comments: () => ({ data: [row(1, { like_count: 4 })], error: null }),
      set_comment_like: () => new Promise((resolve) => (answer = resolve)),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.click(list.getByRole("button", { name: commentText.item.like }));
    expect(await list.findByText(commentText.item.likes("5"))).toBeTruthy(); // before the server answered
    expect(list.getByRole("button", { name: commentText.item.unlike }).getAttribute("aria-pressed")).toBe("true");
    answer({ data: 9, error: null });
    expect(await list.findByText(commentText.item.likes("9"))).toBeTruthy();
    cleanup();

    const refused = fakeClient({
      list_comments: () => ({ data: [row(1, { like_count: 4 })], error: null }),
      set_comment_like: () => ({ data: null, error: { code: "PT404", message: "gone" } }),
    });
    renderUi(refused, thread());
    const list2 = await listOf();
    fireEvent.click(list2.getByRole("button", { name: commentText.item.like }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", commentText.errors.notFound));
    expect(await list2.findByText(commentText.item.likes("4"))).toBeTruthy();
  });

  it("sends a guest who tries to like to sign in instead of calling the server", async () => {
    const c = fakeClient({ list_comments: () => ({ data: [row(1)], error: null }) });
    renderUi(c, thread(), false);
    const list = await listOf();
    fireEvent.click(list.getByRole("button", { name: commentText.item.guestLike }));
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/story/s/t/c")}`);
    expect(c.of("set_comment_like")).toHaveLength(0);
  });

  it("replies under the comment (same paragraph as the parent) and shows the replies", async () => {
    const c = fakeClient({
      list_comments: () => ({ data: [row(1, { block_id: BLOCK, reply_count: 1 })], error: null }),
      list_replies: () => ({
        data: [row(2, { parent_comment_id: cid(1), block_id: BLOCK, body: "Trả lời cũ" })],
        error: null,
      }),
      post_comment: () => ({ data: cid(3), error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.click(list.getByRole("button", { name: commentText.item.showReplies(1) }));
    expect(await list.findByText("Trả lời cũ")).toBeTruthy();
    expect(c.of("list_replies")[0]!.args.p_parent_id).toBe(cid(1));
    fireEvent.click(list.getByRole("button", { name: commentText.item.reply }));
    const box = await screen.findByLabelText(commentText.composer.replyLabel);
    fireEvent.change(box, { target: { value: "Đồng ý" } });
    const buttons = screen.getAllByRole("button", { name: commentText.composer.submit });
    fireEvent.click(buttons[buttons.length - 1]!);
    await waitFor(() => expect(c.of("post_comment")).toHaveLength(1));
    expect(c.of("post_comment")[0]!.args).toMatchObject({ p_parent_id: cid(1), p_block_id: BLOCK, p_body: "Đồng ý" });
  });

  it("offers no reply on a reply, and no menu on someone else's comment", async () => {
    const c = fakeClient({
      list_comments: () => ({ data: [row(1, { reply_count: 1 })], error: null }),
      list_replies: () => ({ data: [row(2, { parent_comment_id: cid(1) })], error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.click(list.getByRole("button", { name: commentText.item.showReplies(1) }));
    await list.findByText("Nội dung 2");
    expect(list.getAllByRole("button", { name: commentText.item.reply })).toHaveLength(1);
    expect(list.queryByRole("button", { name: commentText.item.menu })).toBeNull();
  });

  it("lets the author edit through the menu and saves the new text", async () => {
    const c = fakeClient({
      list_comments: () => ({ data: [row(1, { author_id: TEST_USER_ID, body: "Cũ" })], error: null }),
      edit_comment: () => ({ data: null, error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.keyDown(list.getByRole("button", { name: commentText.item.menu }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: commentText.item.edit }));
    const box = (await screen.findAllByLabelText(commentText.composer.label)).find(
      (el) => (el as HTMLTextAreaElement).value === "Cũ",
    )!;
    fireEvent.change(box, { target: { value: "Mới" } });
    fireEvent.click(screen.getByRole("button", { name: commentText.item.saveEdit }));
    await waitFor(() => expect(c.of("edit_comment")[0]?.args).toEqual({ p_comment_id: cid(1), p_body: "Mới" }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", commentText.item.saved));
  });

  it("deletes only after confirmation", async () => {
    const c = fakeClient({
      list_comments: () => ({ data: [row(1, { author_id: TEST_USER_ID })], error: null }),
      delete_comment: () => ({ data: null, error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.keyDown(list.getByRole("button", { name: commentText.item.menu }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: commentText.item.delete }));
    expect(c.of("delete_comment")).toHaveLength(0);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: commentText.item.delete }));
    await waitFor(() => expect(c.of("delete_comment")[0]?.args).toEqual({ p_comment_id: cid(1) }));
  });

  it("draws a deleted thread as a placeholder, and tells the author when a moderator hid their comment", async () => {
    const c = fakeClient({
      list_comments: () => ({
        data: [
          row(1, {
            status: "deleted",
            body: null,
            author_id: null,
            author_username: null,
            author_display_name: null,
            reply_count: 2,
          }),
          row(2, { status: "hidden", author_id: TEST_USER_ID, body: "Bị ẩn" }),
        ],
        error: null,
      }),
    });
    renderUi(c, thread());
    const list = await listOf();
    expect(list.getByText(commentText.item.deletedPlaceholder)).toBeTruthy();
    expect(list.getByRole("button", { name: commentText.item.showReplies(2) })).toBeTruthy();
    expect(list.getByRole("note").textContent).toBe(commentText.item.hiddenNotice);
    expect(list.getByText("Bị ẩn")).toBeTruthy();
    expect(list.queryByRole("button", { name: commentText.item.menu })).toBeNull(); // a hidden comment cannot be edited
  });

  it("offers a report button on other people's comments only, never on your own or a hidden one", async () => {
    const c = fakeClient({
      list_comments: () => ({
        data: [
          row(1, { author_id: OTHER_USER }),
          row(2, { author_id: TEST_USER_ID, body: "Của tôi" }),
          row(3, { author_id: OTHER_USER, status: "hidden", body: "Bị ẩn" }),
        ],
        error: null,
      }),
    });
    renderUi(c, thread());
    const list = await listOf();
    await list.findByText("Nội dung 1");
    expect(list.getAllByRole("button", { name: "Báo cáo bình luận" })).toHaveLength(1);
  });

  it("shows an edited mark", async () => {
    renderUi(fakeClient({ list_comments: () => ({ data: [row(1, { edited: true })], error: null }) }), thread());
    expect((await listOf()).getByText(`(${commentText.item.edited})`)).toBeTruthy();
  });
});

describe("ReaderBlocks", () => {
  const blocks: ReaderBlock[] = [
    { id: BLOCK, type: "paragraph", text: "Đoạn một có bình luận", marks: [] },
    { id: "b0000000-0000-4000-8000-0000000000b2", type: "paragraph", text: "Đoạn hai", marks: [] },
    { id: "b0000000-0000-4000-8000-0000000000b3", type: "divider" },
  ];

  it("puts a comment button with its count on each text block and none on a divider", async () => {
    const c = fakeClient({
      comment_counts_by_block: () => ({ data: [{ block_id: BLOCK, comment_count: 3 }], error: null }),
    });
    renderUi(c, <ReaderBlocks chapterId={CHAPTER} blocks={blocks} />);
    expect(await screen.findByRole("button", { name: commentText.inline.open(3) })).toBeTruthy();
    expect(screen.getByRole("button", { name: commentText.inline.open(0) })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("opens that paragraph's thread in a sheet, scoped to its block", async () => {
    const c = fakeClient({
      list_comments: (args) => ({
        data: args.p_block_id ? [row(1, { block_id: BLOCK, body: "Bình luận đoạn" })] : [],
        error: null,
      }),
    });
    renderUi(c, <ReaderBlocks chapterId={CHAPTER} blocks={blocks} />);
    const [first] = await screen.findAllByRole("button", { name: commentText.inline.open(0) });
    fireEvent.click(first!);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Bình luận đoạn")).toBeTruthy();
    expect(within(dialog).getByText("Đoạn một có bình luận")).toBeTruthy();
    expect(c.of("list_comments")[0]!.args.p_block_id).toBe(BLOCK);
  });
});

describe("moderation by the story's author", () => {
  const AUTHOR_HIDDEN = AUTHOR_HIDDEN_CARD_STATUS;
  const asManager = { can_moderate_comments: () => ({ data: true, error: null }) };

  it("reads who hid a comment from the card status", () => {
    expect(toComment(row(1, { status: "hidden" }))).toMatchObject({ status: "hidden", hiddenBy: "moderator" });
    expect(toComment(row(1, { status: AUTHOR_HIDDEN }))).toMatchObject({ status: "hidden", hiddenBy: "author" });
    expect(toComment(row(1, { status: "visible" }))?.hiddenBy).toBeNull();
    expect(toComment(row(1, { status: "deleted" }))?.hiddenBy).toBeNull();
  });

  it("calls the two RPCs with their arguments and reads the answers", async () => {
    const c = fakeClient({
      set_comment_hidden: () => ({ data: AUTHOR_HIDDEN, error: null }),
      can_moderate_comments: () => ({ data: true, error: null }),
    });
    const client = c as unknown as DataClient;
    expect(await setCommentHidden(client, cid(1), true)).toBe(AUTHOR_HIDDEN);
    expect(c.of("set_comment_hidden")[0]?.args).toEqual({ p_comment_id: cid(1), p_hidden: true });
    expect(await canModerateComments(client, CHAPTER)).toBe(true);
    expect(c.of("can_moderate_comments")[0]?.args).toEqual({ p_chapter_id: CHAPTER });
    const no = fakeClient({ can_moderate_comments: () => ({ data: false, error: null }) });
    expect(await canModerateComments(no as unknown as DataClient, CHAPTER)).toBe(false);
  });

  it("offers a manager 'hide' on a visible comment of someone else and sends the hide", async () => {
    const c = fakeClient({
      ...asManager,
      list_comments: () => ({ data: [row(1)], error: null }),
      set_comment_hidden: () => ({ data: AUTHOR_HIDDEN, error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.keyDown(await list.findByRole("button", { name: commentText.item.menu }), { key: "Enter" });
    expect(screen.queryByRole("menuitem", { name: commentText.item.edit })).toBeNull(); // someone else's text
    expect(screen.queryByRole("menuitem", { name: commentText.item.show })).toBeNull();
    fireEvent.click(await screen.findByRole("menuitem", { name: commentText.item.hide }));
    await waitFor(() => expect(c.of("set_comment_hidden")[0]?.args).toEqual({ p_comment_id: cid(1), p_hidden: true }));
    await waitFor(() => expect(c.of("list_comments").length).toBeGreaterThan(1)); // the list reloads
  });

  it("offers 'show again' only for a comment the author hid, and says so", async () => {
    const c = fakeClient({
      ...asManager,
      list_comments: () => ({ data: [row(1, { status: AUTHOR_HIDDEN })], error: null }),
      set_comment_hidden: () => ({ data: "visible", error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    expect((await list.findByRole("note")).textContent).toBe(commentText.item.hiddenByAuthorForAuthor);
    fireEvent.keyDown(list.getByRole("button", { name: commentText.item.menu }), { key: "Enter" });
    expect(screen.queryByRole("menuitem", { name: commentText.item.hide })).toBeNull();
    fireEvent.click(await screen.findByRole("menuitem", { name: commentText.item.show }));
    await waitFor(() => expect(c.of("set_comment_hidden")[0]?.args).toEqual({ p_comment_id: cid(1), p_hidden: false }));
  });

  it("gives no way back for a comment a moderator hid, and says it was a moderator", async () => {
    const c = fakeClient({
      ...asManager,
      list_comments: () => ({ data: [row(1, { status: "hidden" })], error: null }),
    });
    renderUi(c, thread());
    const list = await listOf();
    expect((await list.findByRole("note")).textContent).toBe(commentText.item.hiddenByModeratorForAuthor);
    expect(list.queryByRole("button", { name: commentText.item.menu })).toBeNull();
  });

  it("tells the commenter who hid their comment", async () => {
    const c = fakeClient({
      list_comments: () => ({
        data: [row(1, { status: AUTHOR_HIDDEN, author_id: TEST_USER_ID, body: "Của tôi" })],
        error: null,
      }),
    });
    renderUi(c, thread());
    const list = await listOf();
    expect((await list.findByRole("note")).textContent).toBe(commentText.item.hiddenByAuthorNotice);
    expect(list.getByText("Của tôi")).toBeTruthy();
    expect(list.queryByRole("button", { name: commentText.item.menu })).toBeNull();
  });

  it("shows an error when the server refuses", async () => {
    const c = fakeClient({
      ...asManager,
      list_comments: () => ({ data: [row(1)], error: null }),
      set_comment_hidden: () => ({ data: null, error: { code: "PT409", message: "x" } }),
    });
    renderUi(c, thread());
    const list = await listOf();
    fireEvent.keyDown(await list.findByRole("button", { name: commentText.item.menu }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: commentText.item.hide }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", commentText.errors.conflict));
  });

  it("asks nothing for a guest and gives no menu to a plain reader", async () => {
    const guest = fakeClient({ list_comments: () => ({ data: [row(1)], error: null }) });
    renderUi(guest, thread(), false);
    await listOf();
    expect(guest.of("can_moderate_comments")).toHaveLength(0);
    cleanup();
    const reader = fakeClient({
      list_comments: () => ({ data: [row(1)], error: null }),
      can_moderate_comments: () => ({ data: false, error: null }),
    });
    renderUi(reader, thread());
    const list = await listOf();
    await waitFor(() => expect(reader.of("can_moderate_comments")).toHaveLength(1));
    expect(list.queryByRole("button", { name: commentText.item.menu })).toBeNull();
  });
});
