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
import { MainShell } from "./components/main-shell.tsx";
import { UserMenu } from "./components/user-menu.tsx";
import { initials } from "./model/initials.ts";

afterEach(cleanup);

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
            <AuthProvider>{ui}</AuthProvider>
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
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("Tôi");
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
