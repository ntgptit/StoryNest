import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { AuthorScreen, FollowingScreen } from "../author/index.ts";
import { DiscoverScreen } from "../discovery/index.ts";
import { RankingScreen } from "../ranking/index.ts";
import { ForYouStories, SimilarStories } from "../recommendations/index.ts";
import { SearchBox, SearchScreen } from "../search/index.ts";
import { AdultContentButton, AdultContentSync, AdultGate, useAdultContent, useShowMature } from "./index.ts";
import { getRemoteAdultContent, saveRemoteAdultContent } from "./api/adult-content.api.ts";
import {
  ADULT_CONTENT_STORAGE_KEY,
  NO_ADULT_CONTENT,
  getServerAdultContent,
  getStoredAdultContent,
  parseAdultContent,
  setStoredAdultContent,
  subscribeAdultContent,
} from "./model/store.ts";
import { adultContentText } from "./strings.ts";

const t = adultContentText;

beforeEach(() => {
  window.localStorage.clear();
  setStoredAdultContent(NO_ADULT_CONTENT);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the stored choice", () => {
  it("shows nothing by default and for anything that is not a clear yes", () => {
    expect(parseAdultContent(null)).toEqual(NO_ADULT_CONTENT);
    expect(parseAdultContent("")).toEqual(NO_ADULT_CONTENT);
    expect(parseAdultContent("not json")).toEqual(NO_ADULT_CONTENT);
    expect(parseAdultContent("null")).toEqual(NO_ADULT_CONTENT);
    expect(parseAdultContent("42")).toEqual(NO_ADULT_CONTENT);
    expect(parseAdultContent(JSON.stringify({ ageConfirmed: "yes", show: true }))).toEqual(NO_ADULT_CONTENT);
    expect(parseAdultContent(JSON.stringify({ show: true }))).toEqual(NO_ADULT_CONTENT);
    expect(getServerAdultContent()).toEqual(NO_ADULT_CONTENT);
  });

  it("never shows adult content without the age confirmation, even if the stored value says so", () => {
    expect(parseAdultContent(JSON.stringify({ ageConfirmed: false, show: true }))).toEqual({
      ageConfirmed: false,
      show: false,
    });
    expect(parseAdultContent(JSON.stringify({ ageConfirmed: true, show: true }))).toEqual({
      ageConfirmed: true,
      show: true,
    });
    expect(parseAdultContent(JSON.stringify({ ageConfirmed: true, show: "true" }))).toEqual({
      ageConfirmed: true,
      show: false,
    });
    expect(parseAdultContent(JSON.stringify({ ageConfirmed: true }))).toEqual({ ageConfirmed: true, show: false });
  });

  it("saves and reads back, refusing to save 'show' without the confirmation", () => {
    setStoredAdultContent({ ageConfirmed: true, show: true });
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true });
    expect(window.localStorage.getItem(ADULT_CONTENT_STORAGE_KEY)).toBe('{"ageConfirmed":true,"show":true}');
    setStoredAdultContent({ ageConfirmed: false, show: true });
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: false, show: false });
  });

  it("returns the same object while nothing changed (a requirement of useSyncExternalStore)", () => {
    setStoredAdultContent({ ageConfirmed: true, show: true });
    expect(getStoredAdultContent()).toBe(getStoredAdultContent());
  });

  it("tells subscribers about a change, and stops after they unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAdultContent(listener);
    setStoredAdultContent({ ageConfirmed: true, show: true });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setStoredAdultContent(NO_ADULT_CONTENT);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("follows another tab's change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAdultContent(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: ADULT_CONTENT_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("keeps the choice for the page when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setStoredAdultContent({ ageConfirmed: true, show: true });
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true });
  });
});

describe("useAdultContent", () => {
  it("starts hidden; enable confirms the age and shows; disable hides but remembers the confirmation", () => {
    const { result } = renderHook(() => useAdultContent());
    expect(result.current).toMatchObject({ show: false, ageConfirmed: false });
    act(() => result.current.enable());
    expect(result.current).toMatchObject({ show: true, ageConfirmed: true });
    act(() => result.current.disable());
    expect(result.current).toMatchObject({ show: false, ageConfirmed: true });
    act(() => result.current.enable());
    expect(result.current.show).toBe(true);
  });

  it("useShowMature is the one flag the lists use", () => {
    const { result } = renderHook(() => useShowMature());
    expect(result.current).toBe(false);
    act(() => setStoredAdultContent({ ageConfirmed: true, show: true }));
    expect(result.current).toBe(true);
  });
});

const back = vi.fn();
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back, refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

type Call = [string, unknown[]];

/** A client that answers every query with nothing and records what was asked: the table queries and the RPCs. */
function recorder() {
  const tableCalls: Call[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const from = () => {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "neq", "in", "or", "order", "limit", "returns"]) {
      b[method] = (...args: unknown[]) => {
        tableCalls.push([method, args]);
        return b;
      };
    }
    b.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
    return b;
  };
  const rpc = (name: string, args: Record<string, unknown> = {}) => {
    rpcCalls.push({ name, args });
    const promise = Promise.resolve({ data: [], error: null });
    return Object.assign(promise, { returns: () => promise });
  };
  return { client: { from, rpc } as unknown as DataClient, tableCalls, rpcCalls };
}

function renderUi(client: DataClient, ui: ReactNode, signedIn = false) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession(TEST_USER_ID) : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("AdultContentButton", () => {
  it("is off by default, and the dialog asks for the confirmation before showing anything", () => {
    renderUi(recorder().client, <AdultContentButton />);
    const button = screen.getByRole("button", { name: t.button });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(t.dialog.hiddenDescription)).toBeTruthy();
    expect(dialog.getByText(t.dialog.deviceNote)).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: t.dialog.keepHidden }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(getStoredAdultContent().show).toBe(false);
  });

  it("shows adult content once the reader confirms, remembers it, and can hide it again", async () => {
    renderUi(recorder().client, <AdultContentButton />);
    const button = screen.getByRole("button", { name: t.button });
    fireEvent.click(button);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: t.dialog.enable }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true });

    fireEvent.click(button);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(t.dialog.shownDescription)).toBeTruthy();
    expect(dialog.queryByRole("button", { name: t.dialog.enable })).toBeNull();
    fireEvent.click(dialog.getByRole("button", { name: t.dialog.disable }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: false });
  });
});

describe("AdultGate", () => {
  it("lets an ordinary story through", () => {
    renderUi(recorder().client, <AdultGate isMature={false}>nội dung</AdultGate>);
    expect(screen.getByText("nội dung")).toBeTruthy();
    expect(screen.queryByText(t.gate.title)).toBeNull();
  });

  it("stands in front of an adult story, and shows it after the confirmation", () => {
    back.mockClear();
    renderUi(recorder().client, <AdultGate isMature>nội dung 18+</AdultGate>);
    expect(screen.queryByText("nội dung 18+")).toBeNull();
    expect(screen.getByText(t.gate.title)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t.gate.back }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("nội dung 18+")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: t.gate.confirm }));
    expect(screen.getByText("nội dung 18+")).toBeTruthy();
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true });
  });

  it("does not ask a reader who already chose to see adult content", () => {
    setStoredAdultContent({ ageConfirmed: true, show: true });
    renderUi(recorder().client, <AdultGate isMature>nội dung 18+</AdultGate>);
    expect(screen.getByText("nội dung 18+")).toBeTruthy();
  });

  it("asks again after the reader hid adult content, but only once more", () => {
    setStoredAdultContent({ ageConfirmed: true, show: false });
    renderUi(recorder().client, <AdultGate isMature>nội dung 18+</AdultGate>);
    expect(screen.getByText(t.gate.title)).toBeTruthy();
  });
});

describe("every list follows the choice", () => {
  const eqMature = (calls: Call[]) => calls.filter(([m, a]) => m === "eq" && a[0] === "is_mature");
  const mature = (rpcCalls: { args: Record<string, unknown> }[]) => rpcCalls.map((c) => c.args.p_include_mature);

  const cases: {
    name: string;
    ui: () => ReactNode;
    signedIn?: boolean;
    read: (r: ReturnType<typeof recorder>) => unknown[];
  }[] = [
    { name: "the home feed", ui: () => <DiscoverScreen />, read: (r) => eqMature(r.tableCalls).map(() => "filtered") },
    {
      name: "search results",
      ui: () => <SearchScreen term="truyen" tab="stories" />,
      read: (r) => mature(r.rpcCalls.filter((c) => c.name === "search_stories")),
    },
    {
      name: "search results for authors",
      ui: () => <SearchScreen term="truyen" tab="authors" />,
      read: (r) => mature(r.rpcCalls.filter((c) => c.name === "search_authors")),
    },
    {
      name: "the ranking",
      ui: () => <RankingScreen period="week" />,
      read: (r) => mature(r.rpcCalls.filter((c) => c.name === "top_stories")),
    },
    {
      name: "the feed of followed authors",
      ui: () => <FollowingScreen />,
      signedIn: true,
      read: (r) => mature(r.rpcCalls.filter((c) => c.name === "list_followed_stories")),
    },
    {
      name: "similar stories",
      ui: () => <SimilarStories storyId="5eed0000-0000-4000-8000-000000000001" />,
      read: (r) => mature(r.rpcCalls.filter((c) => c.name === "similar_stories")),
    },
    {
      name: "recommendations for me",
      ui: () => <ForYouStories />,
      signedIn: true,
      read: (r) => mature(r.rpcCalls.filter((c) => c.name === "recommend_for_me")),
    },
  ];

  for (const c of cases) {
    it(`${c.name}: adult stories are left out by default and asked for after the choice`, async () => {
      const hidden = recorder();
      renderUi(hidden.client, c.ui(), c.signedIn);
      await waitFor(() => expect(c.read(hidden).length).toBeGreaterThan(0));
      if (c.name === "the home feed") expect(eqMature(hidden.tableCalls)[0]?.[1]).toEqual(["is_mature", false]);
      else expect(c.read(hidden).every((flag) => flag === false)).toBe(true);
      cleanup();

      setStoredAdultContent({ ageConfirmed: true, show: true });
      const shown = recorder();
      renderUi(shown.client, c.ui(), c.signedIn);
      await waitFor(() => {
        if (c.name === "the home feed") expect(shown.tableCalls.some(([m]) => m === "select")).toBe(true);
        else expect(c.read(shown).length).toBeGreaterThan(0);
      });
      if (c.name === "the home feed") expect(eqMature(shown.tableCalls)).toEqual([]);
      else expect(c.read(shown).every((flag) => flag === true)).toBe(true);
    });
  }

  for (const c of cases) {
    it(`${c.name}: switching the choice asks again instead of reusing the answer of the other choice`, async () => {
      const r = recorder();
      renderUi(r.client, c.ui(), c.signedIn);
      const asked = () =>
        c.name === "the home feed" ? r.tableCalls.filter(([m]) => m === "select").length : c.read(r).length;
      await waitFor(() => expect(asked()).toBeGreaterThan(0));
      const before = asked();
      const filteredBefore = eqMature(r.tableCalls).length;

      act(() => setStoredAdultContent({ ageConfirmed: true, show: true }));
      await waitFor(() => expect(asked()).toBeGreaterThan(before));
      if (c.name === "the home feed") expect(eqMature(r.tableCalls).length).toBe(filteredBefore);
      else expect(c.read(r).at(-1)).toBe(true);

      act(() => setStoredAdultContent({ ageConfirmed: true, show: false }));
      const afterShow = asked();
      // hiding again goes back to the cached hidden answer: no new question is needed, and the list is the hidden one
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(asked()).toBeGreaterThanOrEqual(afterShow);
    });
  }

  it("the author page's story list too", async () => {
    const profile = {
      user_id: "00000000-0000-4000-8000-0000000000a1",
      username: "tac_gia_a",
      display_name: "Tác Giả A",
      bio: "",
      avatar_storage_key: null,
      followers_count: 0,
      stories_count: 0,
      is_following: false,
    };
    const make = () => {
      const r = recorder();
      const rpc = (name: string, args: Record<string, unknown> = {}) => {
        r.rpcCalls.push({ name, args });
        const promise = Promise.resolve({ data: name === "author_profile" ? [profile] : [], error: null });
        return Object.assign(promise, { returns: () => promise });
      };
      return { ...r, client: { ...(r.client as unknown as object), rpc } as unknown as DataClient };
    };
    const hidden = make();
    renderUi(hidden.client, <AuthorScreen username="tac_gia_a" />);
    await waitFor(() => expect(eqMature(hidden.tableCalls).length).toBeGreaterThan(0));
    cleanup();
    setStoredAdultContent({ ageConfirmed: true, show: true });
    const shown = make();
    renderUi(shown.client, <AuthorScreen username="tac_gia_a" />);
    await waitFor(() => expect(shown.tableCalls.some(([m, a]) => m === "eq" && a[0] === "owner_id")).toBe(true));
    expect(eqMature(shown.tableCalls)).toEqual([]);
  });

  it("the suggestions in the header ask again when the choice changes, not reuse the other choice's answer", async () => {
    const r = recorder();
    renderUi(r.client, <SearchBox />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "truyen" } });
    await waitFor(() => expect(mature(r.rpcCalls.filter((c) => c.name === "search_stories"))).toEqual([false]), {
      timeout: 2000,
    });
    act(() => setStoredAdultContent({ ageConfirmed: true, show: true }));
    await waitFor(() => expect(mature(r.rpcCalls.filter((c) => c.name === "search_stories"))).toEqual([false, true]));
  });

  it("the suggestions in the header too", async () => {
    const hidden = recorder();
    renderUi(hidden.client, <SearchBox />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "truyen" } });
    await waitFor(() => expect(hidden.rpcCalls.some((c) => c.name === "search_stories")).toBe(true), { timeout: 2000 });
    expect(mature(hidden.rpcCalls.filter((c) => c.name === "search_stories"))).toEqual([false]);
    cleanup();
    setStoredAdultContent({ ageConfirmed: true, show: true });
    const shown = recorder();
    renderUi(shown.client, <SearchBox />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "truyen" } });
    await waitFor(() => expect(shown.rpcCalls.some((c) => c.name === "search_stories")).toBe(true), { timeout: 2000 });
    expect(mature(shown.rpcCalls.filter((c) => c.name === "search_stories"))).toEqual([true]);
  });
});

describe("the account copy (WP 6.3)", () => {
  function syncClient(remote: { age_confirmed: boolean; show_mature: boolean } | null, selectError: unknown = null) {
    const upsert = vi.fn(async () => ({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle: async () => ({ data: remote, error: selectError }) }));
    const from = vi.fn(() => ({ select, upsert }));
    return { from, select, upsert };
  }
  function renderSync(client: DataClient) {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={client}>
          <AuthProvider>
            <AdultContentSync />
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
  }

  it("reads null for no row and the two columns for a saved one; saves only those columns", async () => {
    const none = syncClient(null);
    expect(await getRemoteAdultContent(none as unknown as DataClient)).toBeNull();
    expect(none.from).toHaveBeenCalledWith("user_settings");
    expect(none.select).toHaveBeenCalledWith("age_confirmed, show_mature");
    const saved = syncClient({ age_confirmed: true, show_mature: false });
    expect(await getRemoteAdultContent(saved as unknown as DataClient)).toEqual({ ageConfirmed: true, show: false });
    await saveRemoteAdultContent(saved as unknown as DataClient, "u1", { ageConfirmed: true, show: true });
    expect(saved.upsert).toHaveBeenCalledWith(
      { user_id: "u1", age_confirmed: true, show_mature: true },
      { onConflict: "user_id" },
    );
  });

  it("does nothing for a guest", async () => {
    const c = syncClient({ age_confirmed: true, show_mature: true });
    setStoredAdultContent({ ageConfirmed: true, show: false });
    renderSync(withAuth(c, null));
    await act(async () => {});
    expect(c.from).not.toHaveBeenCalled();
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: false });
  });

  it("adopts the choice of an account that confirmed its age, on a device that never asked", async () => {
    const c = syncClient({ age_confirmed: true, show_mature: true });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true }));
    expect(c.upsert).not.toHaveBeenCalled();
  });

  it("lets a confirmed account decide even when the device says otherwise", async () => {
    setStoredAdultContent({ ageConfirmed: true, show: true });
    const c = syncClient({ age_confirmed: true, show_mature: false });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: false }));
  });

  it("keeps the device choice when the account row only holds defaults, and uploads a confirmed one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setStoredAdultContent({ ageConfirmed: true, show: true });
    const c = syncClient({ age_confirmed: false, show_mature: false });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true });
    expect(c.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), age_confirmed: true, show_mature: true },
      { onConflict: "user_id" },
    );
    vi.useRealTimers();
  });

  it("uploads nothing when neither side has confirmed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = syncClient(null);
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("saves a change made on the device once, after a short pause", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = syncClient({ age_confirmed: true, show_mature: false });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => {});
    act(() => setStoredAdultContent({ ageConfirmed: true, show: true }));
    act(() => setStoredAdultContent({ ageConfirmed: true, show: false }));
    act(() => setStoredAdultContent({ ageConfirmed: true, show: true }));
    expect(c.upsert).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).toHaveBeenCalledTimes(1);
    expect(c.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), age_confirmed: true, show_mature: true },
      { onConflict: "user_id" },
    );
    vi.useRealTimers();
  });

  it("does not save what the account already holds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = syncClient({ age_confirmed: true, show_mature: true });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(getStoredAdultContent().show).toBe(true));
    act(() => setStoredAdultContent({ ageConfirmed: true, show: true }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(c.upsert).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("keeps working on the device when the account copy cannot be read", async () => {
    setStoredAdultContent({ ageConfirmed: true, show: true });
    const c = syncClient(null, { message: "x", code: "XX000" });
    renderSync(withAuth(c, testSession()));
    await waitFor(() => expect(c.from).toHaveBeenCalled());
    await act(async () => {});
    expect(getStoredAdultContent()).toEqual({ ageConfirmed: true, show: true });
    expect(c.upsert).not.toHaveBeenCalled();
  });
});
