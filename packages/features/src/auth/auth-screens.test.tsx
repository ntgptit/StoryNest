import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { ForgotPasswordScreen, ResetPasswordScreen, SignInScreen, SignUpScreen } from "./index.ts";

afterEach(cleanup);

type AuthError = { name: string; status: number; code: string; message: string } | null;
const authError = (code: string, status = 400): AuthError => ({ name: "AuthApiError", status, code, message: code });

function fakeClient(
  overrides: {
    signIn?: AuthError;
    signUp?: { error?: AuthError; session?: unknown };
    reset?: AuthError;
    update?: AuthError;
    session?: Session | null;
  } = {},
) {
  const auth = {
    signInWithPassword: vi.fn(async () => ({ data: {}, error: overrides.signIn ?? null })),
    signUp: vi.fn(async () => ({
      data: { session: overrides.signUp?.session ?? null },
      error: overrides.signUp?.error ?? null,
    })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: overrides.reset ?? null })),
    updateUser: vi.fn(async () => ({ data: {}, error: overrides.update ?? null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(async () => ({ data: { session: overrides.session ?? null } })),
    signOut: vi.fn(async () => ({ error: null })),
  };
  const query = { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  return { client: { auth, from: () => query } as unknown as DataClient, auth };
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

function renderWith(client: DataClient, ui: ReactNode, toast = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>
          <ToastProvider port={{ show: toast }}>
            <AuthProvider>{ui}</AuthProvider>
          </ToastProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
  return { toast };
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { selector: "input" }), { target: { value } });
const submit = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

describe("SignInScreen", () => {
  it("validates before calling the API, with translated messages", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <SignInScreen onSignedIn={vi.fn()} />);
    submit("Đăng nhập");
    expect(await screen.findByText("Email không hợp lệ.")).toBeTruthy();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("normalises the email and reports success", async () => {
    const { client, auth } = fakeClient();
    const onSignedIn = vi.fn();
    renderWith(client, <SignInScreen onSignedIn={onSignedIn} />);
    type("Email", "  Reader@Example.COM ");
    type("Mật khẩu", "secret-pass");
    submit("Đăng nhập");
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "reader@example.com", password: "secret-pass" });
  });

  it("shows a wrong-credentials error without leaking which part was wrong, and stays usable", async () => {
    const { client } = fakeClient({ signIn: authError("invalid_credentials") });
    const onSignedIn = vi.fn();
    renderWith(client, <SignInScreen onSignedIn={onSignedIn} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "wrong");
    submit("Đăng nhập");
    expect((await screen.findByRole("alert")).textContent).toBe("Email hoặc mật khẩu không đúng.");
    expect(onSignedIn).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Đăng nhập" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("maps unconfirmed email and rate limits", async () => {
    const unconfirmed = fakeClient({ signIn: authError("email_not_confirmed") });
    renderWith(unconfirmed.client, <SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "x");
    submit("Đăng nhập");
    expect((await screen.findByRole("alert")).textContent).toContain("chưa được xác nhận");
    cleanup();

    const limited = fakeClient({ signIn: authError("over_request_rate_limit", 429) });
    renderWith(limited.client, <SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "x");
    submit("Đăng nhập");
    expect((await screen.findByRole("alert")).textContent).toContain("quá nhanh");
  });

  it("disables the button while signing in", async () => {
    const { client, auth } = fakeClient();
    let release: () => void = () => undefined;
    auth.signInWithPassword.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({ data: {}, error: null }))),
    );
    renderWith(client, <SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "x");
    submit("Đăng nhập");
    const pending = await screen.findByRole("button", { name: "Đang đăng nhập…" });
    expect((pending as HTMLButtonElement).disabled).toBe(true);
    await act(async () => release());
  });

  it("keeps a safe `next` on the sign-up link and drops an unsafe one", () => {
    const { client } = fakeClient();
    renderWith(client, <SignInScreen next="/library?tab=saved" onSignedIn={vi.fn()} />);
    expect(screen.getByText("Đăng ký").getAttribute("href")).toBe("/register?next=%2Flibrary%3Ftab%3Dsaved");
    cleanup();
    renderWith(client, <SignInScreen next="//evil.com" onSignedIn={vi.fn()} />);
    expect(screen.getByText("Đăng ký").getAttribute("href")).toBe("/register");
  });

  it("toggles password visibility", () => {
    const { client } = fakeClient();
    renderWith(client, <SignInScreen onSignedIn={vi.fn()} />);
    const input = screen.getByLabelText("Mật khẩu", { selector: "input" }) as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(input.type).toBe("text");
  });
});

describe("SignUpScreen", () => {
  it("rejects a short password and a bad username before any request", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "123");
    type(/Tên người dùng/, "no spaces!");
    submit("Đăng ký");
    expect(await screen.findByText("Mật khẩu cần ít nhất 8 ký tự.")).toBeTruthy();
    expect(screen.getByText(/Tên người dùng chỉ gồm/)).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("asks the user to confirm their email and builds a safe callback link", async () => {
    const { client, auth } = fakeClient();
    const onSignedUp = vi.fn();
    renderWith(client, <SignUpScreen next="/library" onSignedUp={onSignedUp} />);
    type("Email", "New@Reader.io");
    type("Mật khẩu", "long-enough-pass");
    type(/Tên người dùng/, "reader_1");
    submit("Đăng ký");
    expect(await screen.findByText("Kiểm tra email của bạn")).toBeTruthy();
    expect(screen.getByText("new@reader.io")).toBeTruthy();
    expect(onSignedUp).not.toHaveBeenCalled();
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "new@reader.io",
      password: "long-enough-pass",
      options: { emailRedirectTo: "https://app.test/auth/callback?next=%2Flibrary", data: { username: "reader_1" } },
    });
  });

  it("omits empty optional fields from the metadata", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "long-enough-pass");
    submit("Đăng ký");
    await waitFor(() => expect(auth.signUp).toHaveBeenCalled());
    const options = (auth.signUp.mock.calls[0] as unknown as [{ options: { data: object } }])[0].options;
    expect(options.data).toEqual({});
  });

  it("continues straight away when sign-up returns a session", async () => {
    const { client } = fakeClient({ signUp: { session: { access_token: "t" } } });
    const onSignedUp = vi.fn();
    renderWith(client, <SignUpScreen onSignedUp={onSignedUp} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "long-enough-pass");
    submit("Đăng ký");
    await waitFor(() => expect(onSignedUp).toHaveBeenCalledTimes(1));
  });

  it("reports an already registered email", async () => {
    const { client } = fakeClient({ signUp: { error: authError("user_already_exists", 422) } });
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "long-enough-pass");
    submit("Đăng ký");
    expect((await screen.findByRole("alert")).textContent).toBe("Email này đã được đăng ký.");
  });
});

describe("ForgotPasswordScreen", () => {
  it("sends the reset email with a callback that lands on /reset-password", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <ForgotPasswordScreen />);
    type("Email", "A@B.co");
    submit("Gửi liên kết");
    expect(await screen.findByText("Đã gửi hướng dẫn")).toBeTruthy();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.co", {
      redirectTo: "https://app.test/auth/callback?next=%2Freset-password",
    });
  });

  it("does not reveal whether the address has an account (same message either way)", async () => {
    const { client } = fakeClient();
    renderWith(client, <ForgotPasswordScreen />);
    type("Email", "nobody@nowhere.dev");
    submit("Gửi liên kết");
    expect((await screen.findByRole("status")).textContent).toContain("Nếu email này có tài khoản");
  });

  it("validates the email and reports rate limits", async () => {
    const { client, auth } = fakeClient({ reset: authError("over_email_send_rate_limit", 429) });
    renderWith(client, <ForgotPasswordScreen />);
    submit("Gửi liên kết");
    expect(await screen.findByText("Email không hợp lệ.")).toBeTruthy();
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    type("Email", "a@b.co");
    submit("Gửi liên kết");
    expect((await screen.findByRole("alert")).textContent).toContain("quá nhanh");
  });
});

describe("ResetPasswordScreen", () => {
  const session = { access_token: "t", user: { id: "u1" } } as unknown as Session;

  it("explains an expired or missing recovery link", async () => {
    const { client } = fakeClient({ session: null });
    renderWith(client, <ResetPasswordScreen onDone={vi.fn()} />);
    expect(await screen.findByText("Liên kết không hợp lệ hoặc đã hết hạn")).toBeTruthy();
    expect(screen.getByText("Yêu cầu liên kết mới").getAttribute("href")).toBe("/forgot-password");
  });

  it("requires matching passwords", async () => {
    const { client, auth } = fakeClient({ session });
    renderWith(client, <ResetPasswordScreen onDone={vi.fn()} />);
    await screen.findByText("Đặt mật khẩu mới", { selector: "h1" });
    type("Mật khẩu mới", "long-enough-pass");
    type("Nhập lại mật khẩu", "different-pass-1");
    submit("Đổi mật khẩu");
    expect(await screen.findByText("Mật khẩu nhập lại không khớp.")).toBeTruthy();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password, toasts and finishes", async () => {
    const { client, auth } = fakeClient({ session });
    const onDone = vi.fn();
    const { toast } = renderWith(client, <ResetPasswordScreen onDone={onDone} />);
    await screen.findByText("Đặt mật khẩu mới", { selector: "h1" });
    type("Mật khẩu mới", "long-enough-pass");
    type("Nhập lại mật khẩu", "long-enough-pass");
    submit("Đổi mật khẩu");
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "long-enough-pass" });
    expect(toast).toHaveBeenCalledWith("success", "Đã đổi mật khẩu.");
  });

  it("reports reuse of the old password", async () => {
    const { client } = fakeClient({ session, update: authError("same_password", 422) });
    renderWith(client, <ResetPasswordScreen onDone={vi.fn()} />);
    await screen.findByText("Đặt mật khẩu mới", { selector: "h1" });
    type("Mật khẩu mới", "long-enough-pass");
    type("Nhập lại mật khẩu", "long-enough-pass");
    submit("Đổi mật khẩu");
    expect((await screen.findByRole("alert")).textContent).toContain("khác mật khẩu cũ");
  });
});

describe("without Supabase configured (static prerender, local UI work)", () => {
  function renderWithoutClient(ui: ReactNode) {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider client={null}>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>
              <AuthProvider>{ui}</AuthProvider>
            </ToastProvider>
          </PlatformProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
  }

  it("every screen still renders (the build prerenders these pages without env vars)", async () => {
    for (const screen_ of [
      <SignInScreen key="a" onSignedIn={vi.fn()} />,
      <SignUpScreen key="b" onSignedUp={vi.fn()} />,
      <ForgotPasswordScreen key="c" />,
      <ResetPasswordScreen key="d" onDone={vi.fn()} />,
    ]) {
      renderWithoutClient(screen_);
      await waitFor(() => expect(document.querySelector("h1")).not.toBeNull());
      cleanup();
    }
  });

  it("a submit shows a generic error instead of crashing", async () => {
    renderWithoutClient(<SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "a@b.co");
    type("Mật khẩu", "x");
    submit("Đăng nhập");
    expect((await screen.findByRole("alert")).textContent).toBe("Đã có lỗi xảy ra. Vui lòng thử lại.");
  });
});
