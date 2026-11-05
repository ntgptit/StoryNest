import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { getLibraryState, setStoryFollow, setStorySave } from "./api/library.api.ts";
import { storyKeys } from "./keys.ts";
import type { StoryDetail } from "./model/story-detail.ts";
import { StoryActions } from "./components/story-actions.tsx";
import { StoryPeekProvider } from "./components/story-peek.tsx";
import { StoryTile, toStorySummary } from "../discovery/index.ts";
import { followersAfter, libraryErrorMessage, withFollowing, withSaved } from "./model/library.ts";
import { storyText } from "./strings.ts";

afterEach(cleanup);

const t = storyText.library;
const STORY_ID = "5eed0000-0000-4000-8000-00000000a001";

describe("library model", () => {
  it("changes follow and save independently and leaves an unchanged state alone", () => {
    const base = { following: false, saved: false };
    expect(withFollowing(base, true)).toEqual({ following: true, saved: false });
    expect(withSaved(base, true)).toEqual({ following: false, saved: true });
    expect(withFollowing(base, false)).toBe(base);
    expect(withSaved(base, false)).toBe(base);
  });

  it("moves the follower count by one, never below zero, and not at all when nothing changes", () => {
    expect(followersAfter(4, false, true)).toBe(5);
    expect(followersAfter(4, true, false)).toBe(3);
    expect(followersAfter(0, true, false)).toBe(0);
    expect(followersAfter(4, true, true)).toBe(4);
  });

  it("explains a failure by kind", () => {
    expect(libraryErrorMessage(new AppError("forbidden", "x"))).toBe(t.errors.forbidden);
    expect(libraryErrorMessage(new AppError("network", "x"))).toBe(t.errors.network);
    expect(libraryErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

type RpcResult = { data: unknown; error: unknown };

function fakeClient(options: {
  following?: boolean;
  saved?: boolean;
  rpc?: (name: string, args: Record<string, unknown>) => RpcResult | Promise<RpcResult>;
}) {
  const tables: string[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const from = vi.fn((table: string) => {
    tables.push(table);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) builder[method] = () => builder;
    builder.maybeSingle = () =>
      Promise.resolve({
        data: (table === "story_follows" ? options.following : options.saved) ? { story_id: STORY_ID } : null,
        error: null,
      });
    return builder;
  });
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return options.rpc ? options.rpc(name, args) : { data: 1, error: null };
  });
  return { from, rpc, tables, rpcCalls };
}

describe("library api", () => {
  it("reads nothing for a guest and both of my own rows when signed in", async () => {
    const guest = fakeClient({ following: true, saved: true });
    expect(await getLibraryState(guest as unknown as DataClient, STORY_ID, null)).toEqual({
      following: false,
      saved: false,
    });
    expect(guest.tables).toEqual([]);
    const user = fakeClient({ following: true, saved: false });
    expect(await getLibraryState(user as unknown as DataClient, STORY_ID, TEST_USER_ID)).toEqual({
      following: true,
      saved: false,
    });
    expect(user.tables.sort()).toEqual(["story_follows", "story_saves"]);
  });

  it("sends follow and save through their own RPCs and returns the count", async () => {
    const c = fakeClient({ rpc: (name) => ({ data: name === "set_story_follow" ? 12 : 3, error: null }) });
    const client = c as unknown as DataClient;
    expect(await setStoryFollow(client, STORY_ID, true)).toBe(12);
    expect(await setStorySave(client, STORY_ID, false)).toBe(3);
    expect(c.rpcCalls).toEqual([
      { name: "set_story_follow", args: { p_story_id: STORY_ID, p_followed: true } },
      { name: "set_story_save", args: { p_story_id: STORY_ID, p_saved: false } },
    ]);
  });

  it("throws the error with its kind", async () => {
    const c = fakeClient({ rpc: () => ({ data: null, error: { code: "42501", message: "denied" } }) });
    await expect(setStoryFollow(c as unknown as DataClient, STORY_ID, true)).rejects.toMatchObject({
      kind: "forbidden",
    });
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
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/story/s/t" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderActions(c: ReturnType<typeof fakeClient>, signedIn = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <StoryActions storyId={STORY_ID} />
            </ToastProvider>
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

describe("StoryActions", () => {
  it("sends a guest to sign in, coming back here, instead of following or saving", async () => {
    const c = fakeClient({});
    renderActions(c, false);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/story/s/t")}`);
    fireEvent.click(screen.getByRole("button", { name: t.save }));
    expect(push).toHaveBeenCalledTimes(2);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it("follows and saves independently: each button changes only its own state", async () => {
    const c = fakeClient({ rpc: () => ({ data: 5, error: null }) });
    renderActions(c);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    expect(await screen.findByRole("button", { name: t.following })).toBeTruthy();
    expect(screen.getByRole("button", { name: t.save }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: t.save }));
    expect(await screen.findByRole("button", { name: t.saved })).toBeTruthy();
    expect(screen.getByRole("button", { name: t.following }).getAttribute("aria-pressed")).toBe("true");
    expect(c.rpcCalls.map((x) => x.name)).toEqual(["set_story_follow", "set_story_save"]);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.savedToast));
  });

  it("shows the new state at once and locks the button until the server answers", async () => {
    let answer: (value: RpcResult) => void = () => undefined;
    const c = fakeClient({ rpc: () => new Promise((resolve) => (answer = resolve)) });
    renderActions(c);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    const pressed = await screen.findByRole("button", { name: t.following });
    expect((pressed as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(pressed);
    expect(c.rpcCalls).toHaveLength(1);
    answer({ data: 3, error: null });
    await waitFor(() =>
      expect((screen.getByRole("button", { name: t.following }) as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it("unfollows and removes from the library when already so", async () => {
    const c = fakeClient({ following: true, saved: true, rpc: () => ({ data: 0, error: null }) });
    renderActions(c);
    fireEvent.click(await screen.findByRole("button", { name: t.following }));
    fireEvent.click(screen.getByRole("button", { name: t.saved }));
    await waitFor(() => expect(c.rpcCalls).toHaveLength(2));
    expect([...c.rpcCalls].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { name: "set_story_follow", args: { p_story_id: STORY_ID, p_followed: false } },
      { name: "set_story_save", args: { p_story_id: STORY_ID, p_saved: false } },
    ]);
    expect(await screen.findByRole("button", { name: t.follow })).toBeTruthy();
    expect(await screen.findByRole("button", { name: t.save })).toBeTruthy();
  });

  it("puts the old state back and says why when the server refuses", async () => {
    const c = fakeClient({ rpc: () => ({ data: null, error: { code: "42501", message: "denied" } }) });
    renderActions(c);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.forbidden));
    expect((await screen.findByRole("button", { name: t.follow })).getAttribute("aria-pressed")).toBe("false");
  });
});

function FollowersProbe() {
  const detail = useQuery<StoryDetail | null>({
    queryKey: storyKeys.detail(STORY_ID),
    queryFn: () => null,
    staleTime: Infinity,
  });
  return <p data-testid="followers">{detail.data?.stats.followers ?? "none"}</p>;
}

describe("the follower count on the story page", () => {
  function renderWithDetail(c: ReturnType<typeof fakeClient>) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(storyKeys.detail(STORY_ID), {
      id: STORY_ID,
      stats: { reads: 1, votes: 2, comments: 3, followers: 5 },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider client={withAuth(c, testSession())}>
          <AuthProvider>
            <PlatformProvider adapter={adapter}>
              <ToastProvider port={toasts}>
                <FollowersProbe />
                <StoryActions storyId={STORY_ID} />
              </ToastProvider>
            </PlatformProvider>
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
  }

  it("goes up at once when following, then takes the server's count", async () => {
    let answer: (value: RpcResult) => void = () => undefined;
    const c = fakeClient({ rpc: () => new Promise((resolve) => (answer = resolve)) });
    renderWithDetail(c);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    await waitFor(() => expect(screen.getByTestId("followers").textContent).toBe("6"));
    answer({ data: 9, error: null });
    await waitFor(() => expect(screen.getByTestId("followers").textContent).toBe("9"));
  });

  it("goes back to what it was when the server refuses", async () => {
    const c = fakeClient({ rpc: () => ({ data: null, error: { code: "42501", message: "denied" } }) });
    renderWithDetail(c);
    fireEvent.click(await screen.findByRole("button", { name: t.follow }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.forbidden));
    expect(screen.getByTestId("followers").textContent).toBe("5");
  });

  it("does not move when saving", async () => {
    const c = fakeClient({ rpc: () => ({ data: 77, error: null }) });
    renderWithDetail(c);
    fireEvent.click(await screen.findByRole("button", { name: t.save }));
    await screen.findByRole("button", { name: t.saved });
    expect(screen.getByTestId("followers").textContent).toBe("5");
  });
});

describe("StoryPeekProvider", () => {
  it("opens a quick look from a story card's context menu, with the story page's own actions", async () => {
    const c = fakeClient({ rpc: () => ({ data: 3, error: null }) });
    const story = toStorySummary({
      id: STORY_ID,
      slug: "muoi-va-tro",
      title: "Muối và tro",
      synopsis: "Một ngọn hải đăng, một cơn bão.",
      cover_storage_key: null,
      status: "ongoing",
      is_mature: false,
      language_code: "vi",
      updated_at: "2026-11-04T00:00:00.123456+00:00",
      owner: { username: "an", display_name: "An Nhiên" },
      category: null,
      stats: null,
      story_tags: [],
    });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={withAuth(c, testSession())}>
          <AuthProvider>
            <PlatformProvider adapter={adapter}>
              <ToastProvider port={toasts}>
                <StoryPeekProvider>
                  <StoryTile story={story} locale="vi" />
                </StoryPeekProvider>
              </ToastProvider>
            </PlatformProvider>
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    fireEvent.contextMenu(screen.getByRole("link", { name: /Muối và tro/ }));
    const dialog = await screen.findByRole("dialog", { name: "Muối và tro" });
    expect(within(dialog).getByText("Một ngọn hải đăng, một cơn bão.")).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: storyText.peek.open }).getAttribute("href")).toBe(
      `/story/${STORY_ID}/muoi-va-tro`,
    );
    fireEvent.click(await within(dialog).findByRole("button", { name: t.follow }));
    await waitFor(() =>
      expect(c.rpcCalls).toContainEqual({ name: "set_story_follow", args: { p_story_id: STORY_ID, p_followed: true } }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: storyText.peek.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
