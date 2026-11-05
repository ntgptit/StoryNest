import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { adultContentText } from "../adult-content/index.ts";
import { getLanguage, setLanguage } from "../_shared/i18n.ts";
import { LanguageProvider } from "../_shared/language.tsx";
import { MainShell } from "./components/main-shell.tsx";
import { UserMenu } from "./components/user-menu.tsx";
import { initials } from "./model/initials.ts";

afterEach(() => {
  cleanup();
  setLanguage("vi", { persist: false });
});

const session = { access_token: "t", user: { id: "u1", email: "reader@example.com" } } as unknown as Session;
const profile = {
  id: "u1",
  username: "reader",
  display_name: "Nguyễn Văn An",
  bio: null,
  avatar_storage_key: null,
  account_status: "active",
};

function fakeClient(options: { session: Session | null; profile?: unknown; signOutError?: unknown }) {
  const signOut = vi.fn(async () => ({ error: options.signOutError ?? null }));
  const client = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      getSession: async () => ({ data: { session: options.session } }),
      signOut,
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: options.profile ?? null, error: null }) }) }),
    }),
  } as unknown as DataClient;
  return { client, signOut };
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
  const toast = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>
          <ToastProvider port={{ show: toast }}>
            <AuthProvider>
              <LanguageProvider>{ui}</LanguageProvider>
            </AuthProvider>
          </ToastProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
  return { navigation, toast };
}

describe("initials", () => {
  it.each([
    ["Nguyễn Văn An", "NA"],
    ["reader", "R"],
    ["  đặng  ", "Đ"],
    ["a b c", "AC"],
    ["", "?"],
    ["   ", "?"],
    ["😀 smile", "😀S"],
  ])("%j -> %j", (name, expected) => expect(initials(name)).toBe(expected));
});

describe("UserMenu", () => {
  it("offers sign-in to guests", async () => {
    const { client } = fakeClient({ session: null });
    setup(<UserMenu />, client);
    const link = await screen.findByText("Đăng nhập");
    expect(link.closest("a")?.getAttribute("href")).toBe("/login");
  });

  it("shows a placeholder while the session is loading, not a flash of the sign-in button", () => {
    const { client } = fakeClient({ session: null });
    setup(<UserMenu />, client);
    expect(screen.queryByText("Đăng nhập")).toBeNull();
  });

  it("shows the member's initials and a menu with profile and sign out", async () => {
    const { client } = fakeClient({ session, profile });
    setup(<UserMenu />, client);
    const trigger = await screen.findByRole("button", { name: "Menu tài khoản" });
    await waitFor(() => expect(trigger.textContent).toBe("NA"));
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    expect(await screen.findByText("Nguyễn Văn An")).toBeTruthy();
    expect(screen.getByText("Hồ sơ").closest("a")?.getAttribute("href")).toBe("/me");
    expect(screen.getByText("Cài đặt").closest("a")?.getAttribute("href")).toBe("/settings");
    expect(screen.getByText("Đăng xuất")).toBeTruthy();
  });

  it("shows the moderation entry to a moderator and to nobody else", async () => {
    const asModerator = {
      ...session,
      user: { ...session.user, app_metadata: { role: "moderator" } },
    } as unknown as Session;
    const open = async () => {
      const trigger = await screen.findByRole("button", { name: "Menu tài khoản" });
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    };
    setup(<UserMenu />, fakeClient({ session: asModerator, profile }).client);
    await open();
    expect((await screen.findByText("Kiểm duyệt")).closest("a")?.getAttribute("href")).toBe("/moderation");
    cleanup();
    setup(<UserMenu />, fakeClient({ session, profile }).client);
    await open();
    await screen.findByText("Cài đặt");
    expect(screen.queryByText("Kiểm duyệt")).toBeNull();
  });

  it("falls back to the email while the profile is still loading", async () => {
    const { client } = fakeClient({ session, profile: null });
    setup(<UserMenu />, client);
    const trigger = await screen.findByRole("button", { name: "Menu tài khoản" });
    expect(trigger.textContent).toBe("R");
  });

  it("signs out, goes home and refreshes server data", async () => {
    const { client, signOut } = fakeClient({ session, profile });
    const { navigation } = setup(<UserMenu />, client);
    const trigger = await screen.findByRole("button", { name: "Menu tài khoản" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByText("Đăng xuất"));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a failed sign-out and stays on the page", async () => {
    const { client } = fakeClient({
      session,
      profile,
      signOutError: { name: "AuthApiError", status: 500, message: "boom" },
    });
    const { navigation, toast } = setup(<UserMenu />, client);
    const trigger = await screen.findByRole("button", { name: "Menu tài khoản" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByText("Đăng xuất"));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("error", "Không đăng xuất được. Vui lòng thử lại."));
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

describe("language switcher", () => {
  it("shows the language in force, offers the other one by name, and switches the whole frame at once", async () => {
    const { client } = fakeClient({ session: null });
    setup(
      <MainShell>
        <p>page content</p>
      </MainShell>,
      client,
      "/",
    );
    const header = within(screen.getByRole("banner"));
    const button = header.getByRole("button", { name: "Chuyển sang English" });
    expect(button.textContent).toBe("VI");
    fireEvent.click(button);
    await waitFor(() => expect(getLanguage()).toBe("en"));
    const back = await within(screen.getByRole("banner")).findByRole("button", { name: "Switch to Tiếng Việt" });
    expect(back.textContent).toBe("EN");
    expect(await screen.findByText("Sign in")).toBeTruthy();
    // Bottom nav (mobile) and desktop nav row: only one of them is displayed at a time, both follow the language.
    expect(screen.getAllByRole("navigation", { name: "Main navigation" })).toHaveLength(2);
    expect(screen.getAllByText("Library")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Browse" })).toBeTruthy();
    fireEvent.click(back);
    expect(await screen.findByText("Đăng nhập")).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Điều hướng chính" })).toHaveLength(2);
  });
});

describe("MainShell", () => {
  it("renders the header, the page and a bottom nav that marks the current section", async () => {
    const { client } = fakeClient({ session: null });
    setup(
      <MainShell>
        <p>page content</p>
      </MainShell>,
      client,
      "/me",
    );
    expect(screen.getByText("page content")).toBeTruthy();
    expect(screen.getByRole("banner").textContent).toContain("StoryNest");
    const navs = screen.getAllByRole("navigation", { name: "Điều hướng chính" });
    expect(navs).toHaveLength(2);
    for (const nav of navs) expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("Tôi");
    expect(await screen.findByText("Đăng nhập")).toBeTruthy();
  });

  it("has the adult-content control in the header, off by default", () => {
    const { client } = fakeClient({ session: null });
    setup(
      <MainShell>
        <p>page content</p>
      </MainShell>,
      client,
      "/",
    );
    const control = within(screen.getByRole("banner")).getByRole("button", { name: adultContentText.button });
    expect(control.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the adult-content choice in step with the account: a signed-in member's account copy is read", async () => {
    const { client } = fakeClient({ session, profile });
    const from = vi.fn((table: string) =>
      table === "user_settings"
        ? { select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }
        : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) },
    );
    setup(
      <MainShell>
        <p>page content</p>
      </MainShell>,
      {
        ...client,
        from,
        // the notification bell listens to Realtime for a signed-in member
        channel: () => {
          const channel = { on: () => channel, subscribe: () => channel };
          return channel;
        },
        removeChannel: vi.fn(),
      } as unknown as DataClient,
    );
    await waitFor(() => expect(from).toHaveBeenCalledWith("user_settings"));
  });
});

describe("DesktopNav", () => {
  const categories = [
    { id: 2, slug: "ngon-tinh", name: "Ngôn tình", parent_id: null, sort_order: 2 },
    { id: 1, slug: "kiem-hiep", name: "Kiếm hiệp", parent_id: null, sort_order: 1 },
    { id: 3, slug: "co-dai", name: "Cổ đại", parent_id: 2, sort_order: 1 },
  ];
  const tags = [{ tag_id: 1, slug: "he-thong", display_name: "Hệ thống", stories_count: 4 }];

  /** Guest client that also answers the categories list and the popular-tags RPC. */
  function browsingClient(): DataClient {
    const base = fakeClient({ session: null }).client;
    const from = (table: string) =>
      table === "categories"
        ? { select: () => ({ order: () => ({ order: async () => ({ data: categories, error: null }) }) }) }
        : (base.from as unknown as (t: string) => unknown)(table);
    const rpc = () => ({ returns: async () => ({ data: tags, error: null }) });
    return { ...base, from, rpc } as unknown as DataClient;
  }

  /** Member client: profile, empty account settings and a Realtime stub for the bell. */
  function memberClient(): DataClient {
    const base = fakeClient({ session, profile }).client;
    const from = (table: string) =>
      table === "user_settings"
        ? { select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }
        : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) };
    const channel = () => {
      const stub = { on: () => stub, subscribe: () => stub };
      return stub;
    };
    return { ...base, from, channel, removeChannel: vi.fn() } as unknown as DataClient;
  }

  const shell = (client: DataClient, pathname: string) =>
    setup(
      <MainShell>
        <p>page</p>
      </MainShell>,
      client,
      pathname,
    );

  const desktopNav = () => {
    const nav = screen
      .getAllByRole("navigation", { name: "Điều hướng chính" })
      .find((element) => within(element).queryByRole("button", { name: "Khám phá" }));
    if (!nav) throw new Error("desktop nav not rendered");
    return within(nav);
  };

  const panelOf = (trigger: HTMLElement) => {
    const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
    if (!panel) throw new Error("panel not open");
    return within(panel);
  };

  it("lists the bottom-nav sections plus Browse and Rankings, and marks the current page", () => {
    shell(fakeClient({ session: null }).client, "/library");
    const nav = desktopNav();
    const names = nav.getAllByRole("listitem").map((item) => item.firstElementChild?.textContent);
    expect(names).toEqual(["Trang chủ", "Khám phá", "Xếp hạng", "Thư viện", "Viết", "Tôi"]);
    expect(nav.getByRole("link", { name: "Thư viện" }).getAttribute("aria-current")).toBe("page");
    expect(nav.getByRole("link", { name: "Trang chủ" }).getAttribute("aria-current")).toBeNull();
    expect(nav.queryByRole("link", { name: "Theo dõi" })).toBeNull();
  });

  it("shows Following to members only", async () => {
    shell(memberClient(), "/following");
    const link = await desktopNav().findByRole("link", { name: "Theo dõi" });
    expect(link.getAttribute("href")).toBe("/following");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("opens Rankings with a click, offers every period, and closes with Escape back on the trigger", () => {
    shell(fakeClient({ session: null }).client, "/ranking");
    const trigger = desktopNav().getByRole("button", { name: "Xếp hạng" });
    expect(trigger.hasAttribute("data-active")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const panel = panelOf(trigger);
    expect(panel.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Hôm nay", "/ranking?period=day"],
      ["Tuần này", "/ranking"],
      ["Tháng này", "/ranking?period=month"],
      ["Mọi lúc", "/ranking?period=all"],
    ]);
    fireEvent.keyDown(panel.getByRole("link", { name: "Tháng này" }), { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("a second click closes a clicked-open panel, a press outside closes it too", () => {
    shell(fakeClient({ session: null }).client, "/");
    const trigger = desktopNav().getByRole("button", { name: "Xếp hạng" });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByText("page"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("Browse lists the root categories in order and popular tags as home-feed filters", async () => {
    shell(browsingClient(), "/");
    const trigger = desktopNav().getByRole("button", { name: "Khám phá" });
    fireEvent.click(trigger);
    const panel = panelOf(trigger);
    const list = within(await panel.findByRole("list", { name: "Thể loại" }));
    await waitFor(() => expect(list.getAllByRole("link")).toHaveLength(3));
    expect(list.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Tất cả truyện", "/"],
      ["Kiếm hiệp", "/?category=kiem-hiep"],
      ["Ngôn tình", "/?category=ngon-tinh"],
    ]);
    const tag = await panel.findByRole("link", { name: "#Hệ thống" });
    expect(tag.getAttribute("href")).toBe("/?tag=he-thong");
    fireEvent.click(tag); // following a link closes the menu
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("glides from panel to panel when the mouse moves between items, without closing", () => {
    shell(browsingClient(), "/");
    const nav = desktopNav();
    const browse = nav.getByRole("button", { name: "Khám phá" });
    const ranking = nav.getByRole("button", { name: "Xếp hạng" });
    fireEvent.pointerEnter(browse, { pointerType: "mouse" });
    expect(browse.getAttribute("aria-expanded")).toBe("true");
    const surface = document.querySelector('[data-slot="mega-nav-surface"]');
    expect(document.querySelector('[data-slot="mega-nav-panel"]')?.className).toContain("animate-mega-fade");
    fireEvent.pointerEnter(ranking, { pointerType: "mouse" });
    expect(browse.getAttribute("aria-expanded")).toBe("false");
    expect(ranking.getAttribute("aria-expanded")).toBe("true");
    // The same surface element stays (so its size and position can transition); the content slides in from the right.
    expect(document.querySelector('[data-slot="mega-nav-surface"]')).toBe(surface);
    expect(document.querySelector('[data-slot="mega-nav-panel"]')?.className).toContain("animate-mega-from-end");
  });

  it("does not open on a touch hover", () => {
    shell(fakeClient({ session: null }).client, "/");
    const browse = desktopNav().getByRole("button", { name: "Khám phá" });
    fireEvent.pointerEnter(browse, { pointerType: "touch" });
    expect(browse.getAttribute("aria-expanded")).toBe("false");
  });
});
