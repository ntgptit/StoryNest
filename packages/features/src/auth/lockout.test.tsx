import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { FIRST_RUN_STORAGE_KEY, isFirstRunDue, markFirstRunDue, markFirstRunSeen } from "./model/first-run.ts";
import { retryAfterSeconds } from "./model/messages.ts";
import { ForgotPasswordScreen, SignInScreen, SignUpScreen } from "./index.ts";

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const LIMIT_MESSAGE = "For security purposes, you can only request this after 37 seconds.";
const limited = (code: string, message = LIMIT_MESSAGE) => ({ name: "AuthApiError", status: 429, code, message });

function fakeClient(error: unknown, usernames: string[] = []) {
  const auth = {
    signInWithPassword: vi.fn(async () => ({ data: {}, error })),
    signUp: vi.fn(async () => ({ data: { session: null }, error })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
  };
  const lookups: string[] = [];
  const from = () => ({
    select: () => ({
      eq: (_column: string, value: string) => ({
        maybeSingle: async () => ({ data: null, error: null }),
        limit: async () => {
          lookups.push(value);
          return { data: usernames.includes(value) ? [{ id: "x" }] : [], error: null };
        },
      }),
    }),
  });
  return { client: { auth, from } as unknown as DataClient, auth, lookups };
}

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _replace, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderWith(client: DataClient, ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>
          <ToastProvider port={{ show: vi.fn() }}>
            <AuthProvider>{ui}</AuthProvider>
          </ToastProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { selector: "input" }), { target: { value } });

describe("retryAfterSeconds", () => {
  it("reads the wait a rate-limit error names, and nothing else", () => {
    expect(retryAfterSeconds(new AppError("rateLimited", LIMIT_MESSAGE, { code: "over_email_send_rate_limit" }))).toBe(
      37,
    );
    expect(retryAfterSeconds(new AppError("invalid", "after 12 seconds", { code: "over_request_rate_limit" }))).toBe(
      12,
    );
    // No number: no countdown (nothing is estimated).
    expect(retryAfterSeconds(new AppError("rateLimited", "Too many requests"))).toBeNull();
    // Not a rate limit, even with a number in it.
    expect(retryAfterSeconds(new AppError("invalid", "wait 30 seconds"))).toBeNull();
    // Absurd waits stay the plain message.
    expect(retryAfterSeconds(new AppError("rateLimited", "after 7200 seconds"))).toBeNull();
    expect(retryAfterSeconds(null)).toBeNull();
  });
});

describe("lockout countdown on the auth screens", () => {
  it("sign in: shows the countdown, keeps submit disabled and offers the reset link", async () => {
    const { client, auth } = fakeClient(limited("over_request_rate_limit"));
    renderWith(client, <SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "x");
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Bạn đã thử quá nhiều lần")).toBeTruthy();
    expect(screen.getAllByText("Thử lại sau 0:37").length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Đăng nhập" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Đặt lại mật khẩu thay vì chờ" }).getAttribute("href")).toBe(
      "/forgot-password",
    );
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  it("a rate limit without a named wait keeps the plain message and a usable button", async () => {
    const { client } = fakeClient(limited("over_request_rate_limit", "Request rate limit reached"));
    renderWith(client, <SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "x");
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect((await screen.findByRole("alert")).textContent).toContain("quá nhanh");
    expect(screen.queryByText("Bạn đã thử quá nhiều lần")).toBeNull();
    expect((screen.getByRole("button", { name: "Đăng nhập" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("forgot password: the request form waits too", async () => {
    const { client } = fakeClient(limited("over_email_send_rate_limit"));
    renderWith(client, <ForgotPasswordScreen />);
    type("Email", "a@b.co");
    fireEvent.click(screen.getByRole("button", { name: "Gửi liên kết" }));
    expect(await screen.findByText("Bạn đã thử quá nhiều lần")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Gửi liên kết" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("sign up extras", () => {
  it("shows a live username hint after a pause, and only for valid names", async () => {
    const { client, lookups } = fakeClient(null, ["taken_name"]);
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type(/Tên người dùng/, "ab");
    type(/Tên người dùng/, "taken_name");
    expect(await screen.findByText(/Tên này đã có người dùng/, { selector: "span:not(.sr-only)" })).toBeTruthy();
    type(/Tên người dùng/, "Free_Name");
    expect(await screen.findByText("Tên này có vẻ còn trống", { selector: "span:not(.sr-only)" })).toBeTruthy();
    // "ab" is too short to check; names are looked up in lower case (the column ignores case).
    expect(lookups).toEqual(["taken_name", "free_name"]);
  });

  it("marks the first-run intro as due after a successful sign-up", async () => {
    const { client } = fakeClient(null);
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "new@b.co");
    type("Mật khẩu", "long-enough-pass");
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
    await screen.findByText("Kiểm tra email của bạn");
    expect(isFirstRunDue()).toBe(true);
  });

  it("first-run flag: due once, never again after it was seen", () => {
    expect(isFirstRunDue()).toBe(false);
    markFirstRunDue();
    expect(isFirstRunDue()).toBe(true);
    markFirstRunSeen();
    markFirstRunDue();
    expect(isFirstRunDue()).toBe(false);
    expect(window.localStorage.getItem(FIRST_RUN_STORAGE_KEY)).toBe("seen");
  });
});
