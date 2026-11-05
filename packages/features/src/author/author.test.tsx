import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../_shared/errors.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { discoveryKeys, type StoryListRow } from "../discovery/index.ts";
import { getAuthorProfile, listFollowedStories, setUserFollow } from "./api/author.api.ts";
import { AuthorScreen, FollowingScreen, authorHref, authorKeys } from "./index.ts";
import {
  FOLLOWED_PAGE_SIZE,
  followErrorMessage,
  followedCursorAfter,
  toAuthorProfile,
  withFollowing,
  type AuthorProfileRow,
} from "./model/author.ts";
import { authorText } from "./strings.ts";
import { shareText } from "../share/index.ts";

afterEach(cleanup);

const t = authorText;
const AUTHOR_ID = "00000000-0000-4000-8000-0000000000a1";
const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const storyRow = (n: number): StoryListRow => ({
  id: uuid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: "",
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T00:00:00.123456+00:00",
  owner: { username: "tac_gia_a", display_name: "Tác Giả A" },
  category: null,
  stats: null,
  story_tags: [],
});
const profileRow = (overrides: Partial<AuthorProfileRow> = {}): AuthorProfileRow => ({
  user_id: AUTHOR_ID,
  username: "tac_gia_a",
  display_name: "Tác Giả A",
  bio: "Viết truyện đêm.",
  avatar_storage_key: null,
  followers_count: "5",
  stories_count: 3,
  is_following: false,
  ...overrides,
});

type Result = { data: unknown; error: unknown };
type Call = [string, unknown[]];

function fakeClient(options: {
  profile?: Result | (() => Result);
  follow?: (args: Record<string, unknown>) => Result;
  followed?: (args: Record<string, unknown>) => Result;
  stories?: StoryListRow[];
}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const storyCalls: Call[] = [];
  const rpc = (name: string, args: Record<string, unknown> = {}) => {
    rpcCalls.push({ name, args });
    const result =
      name === "author_profile"
        ? typeof options.profile === "function"
          ? options.profile()
          : (options.profile ?? { data: [], error: null })
        : name === "set_user_follow"
          ? (options.follow?.(args) ?? { data: 1, error: null })
          : (options.followed?.(args) ?? { data: [], error: null });
    const promise = Promise.resolve(result);
    return Object.assign(promise, { returns: () => promise });
  };
  const from = () => {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "neq", "in", "or", "order", "limit", "returns"]) {
      b[method] = (...args: unknown[]) => {
        storyCalls.push([method, args]);
        return b;
      };
    }
    b.then = (resolve: (value: unknown) => unknown) => resolve({ data: options.stories ?? [], error: null });
    return b;
  };
  return { client: { rpc, from } as unknown as DataClient, rpcCalls, storyCalls };
}

describe("author model", () => {
  it("links by username, encoded", () => {
    expect(authorHref("tac_gia_a")).toBe("/author/tac_gia_a");
    expect(authorHref("a/b c")).toBe("/author/a%2Fb%20c");
  });

  it("maps a profile row (counts may arrive as strings, a missing bio is empty)", () => {
    expect(toAuthorProfile(profileRow({ bio: null }))).toEqual({
      userId: AUTHOR_ID,
      username: "tac_gia_a",
      displayName: "Tác Giả A",
      bio: "",
      avatarStorageKey: null,
      followers: 5,
      stories: 3,
      following: false,
    });
  });

  it("applies a follow with the count the database answered", () => {
    const profile = toAuthorProfile(profileRow());
    expect(withFollowing(profile, true, 6)).toMatchObject({ following: true, followers: 6, stories: 3 });
    expect(withFollowing(profile, false, 4)).toMatchObject({ following: false, followers: 4 });
  });

  it("continues the feed after the last story of a page, and not after a short page", () => {
    const rows = [
      { story_id: "a", updated_at: "t1" },
      { story_id: "b", updated_at: "t2" },
    ];
    expect(followedCursorAfter(rows, true)).toEqual({ at: "t2", id: "b" });
    expect(followedCursorAfter(rows, false)).toBeNull();
    expect(followedCursorAfter([], true)).toBeNull();
  });

  it("tells the limit on followed authors from a vanished author", () => {
    expect(followErrorMessage(new AppError("conflict", "x"))).toBe(t.errors.limit);
    expect(followErrorMessage(new AppError("notFound", "x"))).toBe(t.errors.gone);
    expect(followErrorMessage(new AppError("network", "x"))).toBe(t.errors.generic);
  });
});

describe("query keys", () => {
  it("the author page's key depends on who is looking, so a guest's answer is never shown to a signed-in reader", () => {
    expect(authorKeys.profile("tac_gia_a", null)).not.toEqual(authorKeys.profile("tac_gia_a", TEST_USER_ID));
    expect(authorKeys.profile("TAC_GIA_A", null)).toEqual(authorKeys.profile("tac_gia_a", null));
    expect(authorKeys.profile("tac_gia_a", null)).not.toEqual(authorKeys.profile("khac", null));
  });

  it("the feed of followed authors' stories belongs to one reader", () => {
    expect(authorKeys.followed("u1", false)).not.toEqual(authorKeys.followed("u2", false));
    expect(authorKeys.followed("u1", false)).not.toEqual(authorKeys.followed("u1", true));
    expect(authorKeys.followed("u1", true)).toEqual(authorKeys.followedAll("u1").concat([true] as never));
  });

  it("the feed of stories differs by author, so one author's stories are never another's", () => {
    expect(discoveryKeys.latest({ authorId: "a" })).not.toEqual(discoveryKeys.latest({ authorId: "b" }));
    expect(discoveryKeys.latest({ authorId: "a" })).not.toEqual(discoveryKeys.latest({}));
  });
});

describe("author api", () => {
  it("asks for the profile by username and returns null when there is none", async () => {
    const f = fakeClient({ profile: { data: [profileRow()], error: null } });
    expect(await getAuthorProfile(f.client, "tac_gia_a")).toMatchObject({ userId: AUTHOR_ID });
    expect(f.rpcCalls).toEqual([{ name: "author_profile", args: { p_username: "tac_gia_a" } }]);
    expect(await getAuthorProfile(fakeClient({}).client, "ai_do")).toBeNull();
  });

  it("follows and unfollows through the RPC and returns the follower count", async () => {
    const f = fakeClient({ follow: () => ({ data: "42", error: null }) });
    expect(await setUserFollow(f.client, AUTHOR_ID, true)).toBe(42);
    expect(await setUserFollow(f.client, AUTHOR_ID, false)).toBe(42);
    expect(f.rpcCalls.map((c) => c.args)).toEqual([
      { p_user_id: AUTHOR_ID, p_followed: true },
      { p_user_id: AUTHOR_ID, p_followed: false },
    ]);
  });

  it("throws what the database refuses with", async () => {
    const f = fakeClient({ follow: () => ({ data: null, error: { code: "PT409", message: "too many" } }) });
    await expect(setUserFollow(f.client, AUTHOR_ID, true)).rejects.toMatchObject({ message: "too many" });
  });

  it("asks the feed for one extra row, sends no cursor on the first page and fetches the cards in order", async () => {
    const f = fakeClient({
      followed: () => ({
        data: [
          { story_id: uuid(3), updated_at: "t3" },
          { story_id: uuid(1), updated_at: "t1" },
          { story_id: uuid(2), updated_at: "t0" },
        ],
        error: null,
      }),
      stories: [storyRow(1), storyRow(2), storyRow(3)],
    });
    const page = await listFollowedStories(f.client, { pageSize: 2 });
    expect(f.rpcCalls[0]).toEqual({ name: "list_followed_stories", args: { p_include_mature: false, p_limit: 3 } });
    expect(page.items.map((s) => s.id)).toEqual([uuid(3), uuid(1)]);
    expect(page.nextCursor).toEqual({ at: "t1", id: uuid(1) });
    expect(f.storyCalls.find(([m]) => m === "in")?.[1]).toEqual(["id", [uuid(3), uuid(1)]]);
  });

  it("sends the cursor on the next page, and has no cursor after the last one", async () => {
    const f = fakeClient({
      followed: () => ({ data: [{ story_id: uuid(1), updated_at: "t1" }], error: null }),
      stories: [storyRow(1)],
    });
    const page = await listFollowedStories(f.client, { pageSize: 2, cursor: { at: "t5", id: uuid(9) } });
    expect(f.rpcCalls[0]?.args).toEqual({
      p_include_mature: false,
      p_cursor_at: "t5",
      p_cursor_id: uuid(9),
      p_limit: 3,
    });
    expect(page.nextCursor).toBeNull();
  });

  it("makes no second request when nothing is followed", async () => {
    const f = fakeClient({});
    expect(await listFollowedStories(f.client)).toEqual({ items: [], nextCursor: null });
    expect(f.storyCalls).toEqual([]);
    expect(FOLLOWED_PAGE_SIZE).toBe(12);
  });
});

const push = vi.fn();
const toasts = { show: vi.fn() };
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/author/tac_gia_a" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderUi(client: DataClient, ui: ReactNode, signedInAs: string | null = null) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedInAs ? testSession(signedInAs) : null)}>
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
});

describe("AuthorScreen", () => {
  it("shows who the author is: name, username, followers, stories and bio", async () => {
    const f = fakeClient({ profile: { data: [profileRow()], error: null }, stories: [storyRow(1)] });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />);
    expect(await screen.findByRole("heading", { name: "Tác Giả A", level: 1 })).toBeTruthy();
    expect(screen.getByText(/@tac_gia_a/).textContent).toBe("@tac_gia_a · 5 người theo dõi · 3 truyện");
    expect(screen.getByText("Viết truyện đêm.")).toBeTruthy();
    expect(f.rpcCalls[0]).toEqual({ name: "author_profile", args: { p_username: "tac_gia_a" } });
  });

  it("waits until the session is known before asking, so a guest answer is never cached for a signed-in reader", async () => {
    const f = fakeClient({ profile: { data: [profileRow()], error: null } });
    const slow = {
      ...f.client,
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        getSession: () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 150)),
      },
    } as unknown as DataClient;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={slow}>
          <AuthProvider>
            <PlatformProvider adapter={adapter}>
              <ToastProvider port={toasts}>
                <AuthorScreen username="tac_gia_a" />
              </ToastProvider>
            </PlatformProvider>
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(f.rpcCalls.filter((c) => c.name === "author_profile")).toEqual([]);
    expect(await screen.findByRole("heading", { name: "Tác Giả A" })).toBeTruthy();
    expect(f.rpcCalls.filter((c) => c.name === "author_profile")).toHaveLength(1);
  });

  it("says so when the author wrote no bio", async () => {
    renderUi(
      fakeClient({ profile: { data: [profileRow({ bio: "  " })], error: null } }).client,
      <AuthorScreen username="tac_gia_a" />,
    );
    expect(await screen.findByText(t.noBio)).toBeTruthy();
  });

  it("lists the author's stories as cards linking to the story, filtered by the author's id", async () => {
    const f = fakeClient({ profile: { data: [profileRow()], error: null }, stories: [storyRow(1), storyRow(2)] });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />);
    const link = (await screen.findByText("Truyện 1")).closest("a");
    expect(link?.getAttribute("href")).toBe(`/story/${uuid(1)}/truyen-1`);
    expect(f.storyCalls.filter(([m]) => m === "eq").map(([, a]) => a)).toContainEqual(["owner_id", AUTHOR_ID]);
  });

  it("shows an empty state when the author has no public story", async () => {
    renderUi(
      fakeClient({ profile: { data: [profileRow({ stories_count: 0 })], error: null } }).client,
      <AuthorScreen username="tac_gia_a" />,
    );
    expect(await screen.findByText(t.emptyStories.title)).toBeTruthy();
  });

  it("shows not found for an author with no page, and an error with a retry that recovers", async () => {
    renderUi(fakeClient({}).client, <AuthorScreen username="khong_ai" />);
    expect(await screen.findByText(t.notFound.title)).toBeTruthy();
    cleanup();

    let fail = true;
    const f = fakeClient({
      profile: () =>
        fail ? { data: null, error: { code: "500", message: "boom" } } : { data: [profileRow()], error: null },
    });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />);
    expect(await screen.findByText(t.error.title)).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: t.error.retry }));
    expect(await screen.findByRole("heading", { name: "Tác Giả A" })).toBeTruthy();
  });

  it("sends a guest who presses Follow to sign in, and brings them back here", async () => {
    const f = fakeClient({ profile: { data: [profileRow()], error: null } });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    expect(push).toHaveBeenCalledWith("/login?next=%2Fauthor%2Ftac_gia_a");
    expect(f.rpcCalls.filter((c) => c.name === "set_user_follow")).toEqual([]);
  });

  it("follows for a signed-in reader and shows the count the database answered", async () => {
    const f = fakeClient({
      profile: { data: [profileRow()], error: null },
      follow: () => ({ data: 6, error: null }),
    });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />, TEST_USER_ID);
    const button = await screen.findByRole("button", { name: t.follow });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: t.following })).toBeTruthy();
    expect(screen.getByRole("button", { name: t.following }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/6 người theo dõi/)).toBeTruthy();
    expect(f.rpcCalls.find((c) => c.name === "set_user_follow")?.args).toEqual({
      p_user_id: AUTHOR_ID,
      p_followed: true,
    });
    expect(toasts.show).toHaveBeenCalledWith("success", t.followedToast);
  });

  it("unfollows a followed author", async () => {
    const f = fakeClient({
      profile: { data: [profileRow({ is_following: true })], error: null },
      follow: () => ({ data: 4, error: null }),
    });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />, TEST_USER_ID);
    fireEvent.click(await screen.findByRole("button", { name: t.following }));
    expect(await screen.findByRole("button", { name: t.follow })).toBeTruthy();
    expect(f.rpcCalls.find((c) => c.name === "set_user_follow")?.args).toEqual({
      p_user_id: AUTHOR_ID,
      p_followed: false,
    });
    expect(screen.getByText(/4 người theo dõi/)).toBeTruthy();
    expect(toasts.show).toHaveBeenCalledWith("success", t.unfollowedToast);
  });

  it("keeps the state and says why when the follow is refused", async () => {
    const f = fakeClient({
      profile: { data: [profileRow()], error: null },
      follow: () => ({ data: null, error: { code: "PT409", message: "too many" } }),
    });
    renderUi(f.client, <AuthorScreen username="tac_gia_a" />, TEST_USER_ID);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.limit));
    expect(screen.getByRole("button", { name: t.follow })).toBeTruthy();
    expect(screen.getByText(/5 người theo dõi/)).toBeTruthy();
  });

  it("has no follow button on your own page", async () => {
    renderUi(
      fakeClient({ profile: { data: [profileRow()], error: null } }).client,
      <AuthorScreen username="tac_gia_a" />,
      AUTHOR_ID,
    );
    await screen.findByRole("heading", { name: "Tác Giả A" });
    expect(screen.queryByRole("button", { name: t.follow })).toBeNull();
    expect(screen.queryByRole("button", { name: t.following })).toBeNull();
    expect(screen.queryByRole("button", { name: "Báo cáo người dùng" })).toBeNull(); // nobody reports themselves
  });

  it("offers a visitor the report button for this person", async () => {
    renderUi(
      fakeClient({ profile: { data: [profileRow()], error: null } }).client,
      <AuthorScreen username="tac_gia_a" />,
    );
    await screen.findByRole("heading", { name: "Tác Giả A" });
    expect(await screen.findByRole("button", { name: "Báo cáo người dùng" })).toBeTruthy();
  });

  it("shares the author page by its absolute link", async () => {
    renderUi(
      fakeClient({ profile: { data: [profileRow()], error: null } }).client,
      <AuthorScreen username="tac_gia_a" />,
    );
    fireEvent.click(await screen.findByRole("button", { name: shareText.open }));
    const dialog = await screen.findByRole("dialog", { name: shareText.title("Tác Giả A") });
    expect(within(dialog).getByText(shareText.author.description)).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: shareText.linkLabel }) as HTMLInputElement).value).toBe(
      "https://app.test/author/tac_gia_a",
    );
  });

  it("clamps a long bio with 'show more' (only when it overflows) and keeps all of it in the page", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(80);
    try {
      renderUi(
        fakeClient({ profile: { data: [profileRow({ bio: "Dòng một.\nDòng hai.\nDòng ba." })], error: null } }).client,
        <AuthorScreen username="tac_gia_a" />,
      );
      const toggle = await screen.findByRole("button", { name: t.readMore });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")?.textContent).toContain("Dòng ba.");
      fireEvent.click(toggle);
      expect(screen.getByRole("button", { name: t.readLess }).getAttribute("aria-expanded")).toBe("true");
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("shows a short bio without a toggle", async () => {
    renderUi(
      fakeClient({ profile: { data: [profileRow()], error: null } }).client,
      <AuthorScreen username="tac_gia_a" />,
    );
    expect(await screen.findByText("Viết truyện đêm.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: t.readMore })).toBeNull();
  });
});

describe("FollowingScreen", () => {
  it("lists the stories of followed authors, newest first as the database ordered them", async () => {
    const f = fakeClient({
      followed: () => ({
        data: [
          { story_id: uuid(2), updated_at: "t2" },
          { story_id: uuid(1), updated_at: "t1" },
        ],
        error: null,
      }),
      stories: [storyRow(1), storyRow(2)],
    });
    renderUi(f.client, <FollowingScreen />, TEST_USER_ID);
    await screen.findByText("Truyện 2");
    expect(screen.getAllByText(/^Truyện \d$/).map((e) => e.textContent)).toEqual(["Truyện 2", "Truyện 1"]);
  });

  it("shows an empty state that tells the reader what to do", async () => {
    renderUi(fakeClient({}).client, <FollowingScreen />, TEST_USER_ID);
    expect(await screen.findByText(t.feed.empty.title)).toBeTruthy();
  });

  it("does not ask for a feed before it knows the reader", async () => {
    const f = fakeClient({});
    renderUi(f.client, <FollowingScreen />, null);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(f.rpcCalls).toEqual([]);
  });

  it("shows an error with a retry that recovers", async () => {
    let fail = true;
    const f = fakeClient({
      followed: () =>
        fail
          ? { data: null, error: { code: "500", message: "boom" } }
          : { data: [{ story_id: uuid(1), updated_at: "t" }], error: null },
      stories: [storyRow(1)],
    });
    renderUi(f.client, <FollowingScreen />, TEST_USER_ID);
    expect(await screen.findByText(t.feed.error.title)).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: t.feed.error.retry }));
    expect(await screen.findByText("Truyện 1")).toBeTruthy();
  });

  it("loads the next page from the cursor of the last story", async () => {
    const many = Array.from({ length: FOLLOWED_PAGE_SIZE + 1 }, (_, i) => ({
      story_id: uuid(i + 1),
      updated_at: `t${i + 1}`,
    }));
    const f = fakeClient({
      followed: (args) => ({ data: args.p_cursor_id ? [{ story_id: uuid(40), updated_at: "t0" }] : many, error: null }),
      stories: [...many.map((_, i) => storyRow(i + 1)), storyRow(40)],
    });
    renderUi(f.client, <FollowingScreen />, TEST_USER_ID);
    fireEvent.click(await screen.findByRole("button", { name: t.loadMore }));
    await waitFor(() => expect(f.rpcCalls.filter((c) => c.name === "list_followed_stories")).toHaveLength(2));
    expect(f.rpcCalls[1]?.args).toMatchObject({
      p_cursor_at: `t${FOLLOWED_PAGE_SIZE}`,
      p_cursor_id: uuid(FOLLOWED_PAGE_SIZE),
    });
    expect(await screen.findByText("Truyện 40")).toBeTruthy();
  });
});
