import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { FIRST_RUN_STORAGE_KEY } from "../auth/model/first-run.ts";
import { CommandPaletteLauncher } from "./components/command-palette-launcher.tsx";
import { FirstRunIntro } from "./components/first-run-intro.tsx";
import { closestPath, editDistance, searchSuggestion } from "./model/not-found.ts";
import { filterCommands, isPaletteShortcut, paletteCommands } from "./model/palette.ts";
import { NotFoundScreen } from "./screens/not-found-screen.tsx";

const session = { access_token: "t", user: { id: "u1", email: "reader@example.com" } } as unknown as Session;
const profile = { id: "u1", username: "reader", display_name: "An", bio: null, avatar_storage_key: null };

/** Media queries the test pretends match (the rest do not). */
let matching: string[] = [];

beforeEach(() => {
  window.localStorage.clear();
  matching = [];
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: matching.includes(query),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});
afterEach(cleanup);

function fakeClient(signedIn: boolean, stories: { id: string; title: string; slug: string }[] = []) {
  const storyQuery = {
    then: (resolve: (value: unknown) => void) => resolve({ data: stories, error: null, count: stories.length }),
  };
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "is", "in", "or", "ilike", "order", "range", "limit", "not", "gte"]) {
    chain[method] = () => Object.assign({}, chain, storyQuery);
  }
  chain.maybeSingle = async () => ({ data: profile, error: null });
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      getSession: async () => ({ data: { session: signedIn ? session : null } }),
    },
    from: () => chain,
    rpc: () => Object.assign({}, chain, storyQuery),
  } as unknown as DataClient;
}

function setup(ui: ReactNode, client: DataClient, pathname = "/") {
  const navigation = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname };
  const adapter: PlatformAdapter = {
    platform: "web",
    isNative: false,
    Link: ({ href, replace: _r, children, ...rest }) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
    useNavigation: () => navigation,
    appOrigin: () => "https://app.test",
    openExternal: vi.fn(),
  };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>
          <ToastProvider port={{ show: vi.fn() }}>
            <AuthProvider>{ui}</AuthProvider>
          </ToastProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
  return { navigation };
}

describe("not-found suggestions", () => {
  it("measures typos with swaps as one edit", () => {
    expect(editDistance("library", "library")).toBe(0);
    expect(editDistance("libaray", "library")).toBe(2);
    expect(editDistance("lbirary", "library")).toBe(1);
    expect(editDistance("", "abc")).toBe(3);
  });

  it("suggests the closest known page only for a near miss", () => {
    expect(closestPath("/libary")).toBe("/library");
    expect(closestPath("/Studoi/")).toBe("/studio");
    expect(closestPath("/settigns?x=1")).toBe("/settings");
    expect(closestPath("/studio/nwe")).toBe("/studio/new");
    // Too far from anything, the home page, or a real page.
    expect(closestPath("/something-else")).toBeNull();
    expect(closestPath("/")).toBeNull();
    expect(closestPath("/library")).toBeNull();
    // Short addresses need a closer match: "/mx" is not a typo of "/me".
    expect(closestPath("/xy")).toBeNull();
  });

  it("offers a search for the words of a story or author address", () => {
    expect(searchSuggestion("/story/123/dung-bo-cuoc")).toEqual({
      href: "/search?q=dung+bo+cuoc",
      term: "dung bo cuoc",
    });
    expect(searchSuggestion("/story/123/dung-bo-cuoc/chuong-1")?.term).toBe("dung bo cuoc");
    expect(searchSuggestion("/author/nguyen_an")).toEqual({
      href: "/search?q=nguyen_an&tab=authors",
      term: "nguyen_an",
    });
    expect(searchSuggestion("/story/123")).toBeNull();
    expect(searchSuggestion("/libary")).toBeNull();
  });

  it("the screen shows the fix as a link, and always a way home", async () => {
    setup(<NotFoundScreen />, fakeClient(false), "/libary");
    expect(screen.getByRole("heading", { name: "Không tìm thấy trang" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "/library" }).getAttribute("href")).toBe("/library");
    expect(screen.getByRole("link", { name: "Về trang chủ" }).getAttribute("href")).toBe("/");
    cleanup();
    setup(<NotFoundScreen />, fakeClient(false), "/story/9/hoa-no");
    expect(screen.getByRole("link", { name: "Tìm “hoa no”" }).getAttribute("href")).toBe("/search?q=hoa+no");
  });
});

describe("command palette", () => {
  it("lists members-only pages only for members and filters without diacritics", () => {
    const visitor = paletteCommands(false).map((c) => c.href);
    expect(visitor).toContain("/library");
    expect(visitor).not.toContain("/following");
    expect(paletteCommands(true).map((c) => c.href)).toContain("/studio/new");
    expect(filterCommands(paletteCommands(false), "thu vien").map((c) => c.href)).toEqual(["/library"]);
    expect(filterCommands(paletteCommands(false), "  ")).toHaveLength(paletteCommands(false).length);
  });

  it("the shortcut is Ctrl/Cmd+K outside text fields", () => {
    const base = { key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, target: document.body };
    expect(isPaletteShortcut(base)).toBe(true);
    expect(isPaletteShortcut({ ...base, ctrlKey: false, metaKey: true })).toBe(true);
    expect(isPaletteShortcut({ ...base, ctrlKey: false })).toBe(false);
    expect(isPaletteShortcut({ ...base, shiftKey: true })).toBe(false);
    const field = document.createElement("input");
    expect(isPaletteShortcut({ ...base, target: field })).toBe(false);
  });

  it("opens on Ctrl+K on desktop, moves with the arrows and runs the row with Enter", async () => {
    matching = ["(min-width: 768px)"];
    const { navigation } = setup(<CommandPaletteLauncher />, fakeClient(false));
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox", { name: "Tìm trang hoặc truyện" });
    fireEvent.change(input, { target: { value: "thư" } });
    const options = screen.getAllByRole("option");
    expect(options[0]?.textContent).toBe("Thư viện");
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigation.push).toHaveBeenCalledWith("/library");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
  });

  it("does nothing on phones", () => {
    setup(<CommandPaletteLauncher />, fakeClient(false));
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});

describe("first-run intro", () => {
  it("shows once for a signed-in account when sign-up marked it due; skipping marks it seen", async () => {
    matching = ["(prefers-reduced-motion: reduce)"];
    window.localStorage.setItem(FIRST_RUN_STORAGE_KEY, "due");
    setup(<FirstRunIntro />, fakeClient(true));
    expect(await screen.findByRole("heading", { name: "Đọc theo cách của bạn" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
    expect(screen.getByRole("heading", { name: "Theo dõi và lưu vào Thư viện" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.localStorage.getItem(FIRST_RUN_STORAGE_KEY)).toBe("seen");
  });

  it("stays away when nothing is due or nobody is signed in", async () => {
    setup(<FirstRunIntro />, fakeClient(true));
    window.localStorage.setItem(FIRST_RUN_STORAGE_KEY, "due");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    setup(<FirstRunIntro />, fakeClient(false));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
