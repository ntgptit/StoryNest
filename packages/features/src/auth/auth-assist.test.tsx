import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_MIN_LENGTH } from "@storynest/validation";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { EMAIL_TYPO_DELAY_MS } from "./components/email-typo-fix.tsx";
import { ForgotPasswordScreen, SignInScreen, SignUpScreen } from "./index.ts";
import { editDistance, suggestEmailFix } from "./model/email-typo.ts";
import { passwordStrength } from "./model/password-strength.ts";
import { RESEND_COOLDOWN_SECONDS } from "./model/resend.ts";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("passwordStrength (advisory meter)", () => {
  it("rates nothing for an empty password", () => {
    expect(passwordStrength("")).toEqual({
      score: 0,
      checks: { length: false, mixedCase: false, number: false, symbol: false },
      hints: [],
    });
  });

  it("follows length and variety, and the length point is the schema's minimum", () => {
    expect(passwordStrength("a".repeat(PASSWORD_MIN_LENGTH - 1)).checks.length).toBe(false);
    expect(passwordStrength("abcdefgk").checks.length).toBe(true);
    expect(passwordStrength("short").score).toBe(1);
    expect(passwordStrength("lowercase").score).toBe(1);
    expect(passwordStrength("Lowercase").score).toBe(2);
    expect(passwordStrength("Lowercase7").score).toBe(3);
    expect(passwordStrength("Lowercase7!xyzw").score).toBe(4);
    expect(passwordStrength("a long sentence of words").score).toBe(4);
  });

  it("caps common passwords and marks runs and repeats", () => {
    expect(passwordStrength("Password123!")).toMatchObject({ score: 1, hints: expect.arrayContaining(["common"]) });
    expect(passwordStrength("matkhau2026").hints).toContain("common");
    expect(passwordStrength("Zebra1234xy").hints).toContain("sequence");
    expect(passwordStrength("Zebraaaa7x").hints).toContain("repeat");
    expect(passwordStrength("Zebra1234xy").score).toBeLessThan(passwordStrength("Zebra1947xy").score);
  });

  it("suggests more length only once the minimum is met", () => {
    expect(passwordStrength("Ab1!").hints).not.toContain("longer");
    expect(passwordStrength("Zebra19!").hints).toContain("longer");
    expect(passwordStrength("Zebra19!horse").hints).not.toContain("longer");
  });
});

describe("suggestEmailFix", () => {
  it("counts a swap of neighbours as one edit", () => {
    expect(editDistance("gmial.com", "gmail.com")).toBe(1);
    expect(editDistance("hotmial.con", "hotmail.com")).toBe(2);
    expect(editDistance("abc", "abc")).toBe(0);
  });

  it.each([
    ["an@gmial.com", "an@gmail.com", { head: "an@gm", changed: "ai", tail: "l.com" }],
    ["an@gmail.con", "an@gmail.com", { head: "an@gmail.co", changed: "m", tail: "" }],
    ["An.Tran@Yaho.com", "An.Tran@yahoo.com", undefined],
    ["x@hotmial.con", "x@hotmail.com", undefined],
    [" x@outlok.com ", "x@outlook.com", undefined],
  ])("%s → %s", (typed, address, parts) => {
    const fix = suggestEmailFix(typed);
    expect(fix?.address).toBe(address);
    if (parts) expect(fix).toMatchObject(parts);
  });

  it.each(["an@gmail.com", "an@me.com", "an@company.vn", "an@gmail", "gmail.com", "@gmial.com", "an@gmx.de", ""])(
    "leaves %j alone",
    (typed) => expect(suggestEmailFix(typed)).toBeNull(),
  );
});

type AuthError = { name: string; status: number; code: string; message: string } | null;

function fakeClient(overrides: { reset?: AuthError[] } = {}) {
  const resets = [...(overrides.reset ?? [])];
  const auth = {
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    resend: vi.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: resets.shift() ?? null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
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

const field = (label: RegExp | string) => screen.getByLabelText(label, { selector: "input" }) as HTMLInputElement;
const type = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } });

describe("email typo suggestion", () => {
  it("offers the fix after a pause and changes the field only when pressed (sign-in)", async () => {
    vi.useFakeTimers();
    const { client } = fakeClient();
    renderWith(client, <SignInScreen onSignedIn={vi.fn()} />);
    type("Email", "an@gmial.com");
    expect(screen.queryByRole("button", { name: /Có phải ý bạn là/ })).toBeNull();
    act(() => vi.advanceTimersByTime(EMAIL_TYPO_DELAY_MS));
    const hint = screen.getByRole("button", { name: "Có phải ý bạn là an@gmail.com?" });
    expect(field("Email").value).toBe("an@gmial.com");
    fireEvent.click(hint);
    expect(field("Email").value).toBe("an@gmail.com");
    expect(screen.queryByRole("button", { name: /Có phải ý bạn là/ })).toBeNull();
  });

  it("is offered on sign-up and forgot password too, and never blocks sending the typed address", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <ForgotPasswordScreen />);
    type("Email", "an@yaho.com");
    expect(await screen.findByRole("button", { name: /an@yahoo\.com/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gửi liên kết" }));
    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("an@yaho.com", expect.anything()));
    cleanup();

    renderWith(fakeClient().client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "an@hotmial.com");
    expect(await screen.findByRole("button", { name: /an@hotmail\.com/ })).toBeTruthy();
  });
});

describe("password strength meter on sign-up", () => {
  it("appears while typing, informs, and does not stop a weak password that meets the minimum", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    expect(screen.queryByText("Độ mạnh")).toBeNull();
    type("Email", "an@example.com");
    type("Mật khẩu", "password");
    expect(screen.getByText("Yếu")).toBeTruthy();
    expect(screen.getByText("Đây là mật khẩu phổ biến, dễ bị đoán.")).toBeTruthy();
    expect(screen.getByText(`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`).textContent).toContain("đã đạt");
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledTimes(1));
  });

  it("leaves the minimum-length rule to the schema", async () => {
    const { client, auth } = fakeClient();
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "an@example.com");
    type("Mật khẩu", "Ab1!");
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
    expect(await screen.findByText("Mật khẩu cần ít nhất 8 ký tự.")).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe("check your inbox", () => {
  it("sign-up: locks resend for the cooldown, then sends the confirmation again to the same address", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { client, auth } = fakeClient();
    renderWith(client, <SignUpScreen onSignedUp={vi.fn()} />);
    type("Email", "an@example.com");
    type("Mật khẩu", "Zebra19!horse");
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
    expect(await screen.findByText("Kiểm tra email của bạn")).toBeTruthy();
    const locked = screen.getByRole("button", { name: `Gửi lại sau ${RESEND_COOLDOWN_SECONDS} giây` });
    fireEvent.click(locked);
    expect(auth.resend).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại email" }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledTimes(1));
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: "an@example.com" }));
    expect(await screen.findByText(/Đã gửi lại email\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dùng email khác" }));
    expect(field("Email").value).toBe("an@example.com");
  });

  it("forgot password: resend is locked for the cooldown, then sends the same request again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { client, auth } = fakeClient();
    renderWith(client, <ForgotPasswordScreen />);
    type("Email", "an@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Gửi liên kết" }));
    const locked = await screen.findByRole("button", { name: `Gửi lại sau ${RESEND_COOLDOWN_SECONDS} giây` });
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(locked);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000));
    const ready = screen.getByRole("button", { name: "Gửi lại email" });
    expect(ready.getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(ready);
    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(2));
    expect(auth.resetPasswordForEmail).toHaveBeenLastCalledWith("an@example.com", expect.anything());
    expect(await screen.findByText(/Đã gửi lại email\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: `Gửi lại sau ${RESEND_COOLDOWN_SECONDS} giây` })).toBeTruthy();
  });

  it("forgot password: a refused resend is reported, and 'use a different email' goes back to the form", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const limited = { name: "AuthApiError", status: 429, code: "over_email_send_rate_limit", message: "x" };
    const { client } = fakeClient({ reset: [null, limited] });
    renderWith(client, <ForgotPasswordScreen />);
    type("Email", "an@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Gửi liên kết" }));
    await screen.findByText("Đã gửi hướng dẫn");
    act(() => vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại email" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.");
    fireEvent.click(screen.getByRole("button", { name: "Dùng email khác" }));
    expect(field("Email").value).toBe("an@example.com");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
