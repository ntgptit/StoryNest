import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { ChangePasswordForm } from "./index.ts";

afterEach(cleanup);

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

function setup(options: { provider?: string; signInError?: unknown } = {}) {
  const session = {
    access_token: "t",
    user: { id: "u1", email: "an@example.com", app_metadata: { provider: options.provider ?? "email" } },
  };
  const auth = {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    getSession: async () => ({ data: { session } }),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: options.signInError ?? null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
  };
  const query = { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  const client = { auth, from: () => query } as unknown as DataClient;
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <DataProvider client={client}>
        <PlatformProvider adapter={adapter}>
          <ToastProvider port={{ show: vi.fn() }}>
            <AuthProvider>
              <ChangePasswordForm />
            </AuthProvider>
          </ToastProvider>
        </PlatformProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
  return auth;
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { selector: "input" }), { target: { value } });

describe("ChangePasswordForm", () => {
  it("checks the current password first, then sets the new one", async () => {
    const auth = setup();
    await screen.findByLabelText("Mật khẩu hiện tại", { selector: "input" });
    type("Mật khẩu hiện tại", "Old-pass-123");
    type("Mật khẩu mới", "Zebra19!horse");
    type("Nhập lại mật khẩu", "Zebra19!horse");
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: "Zebra19!horse" }));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "an@example.com", password: "Old-pass-123" });
  });

  it("asks for the current password and never changes anything when it is wrong", async () => {
    const wrong = { name: "AuthApiError", status: 400, code: "invalid_credentials", message: "x" };
    const auth = setup({ signInError: wrong });
    await screen.findByLabelText("Mật khẩu hiện tại", { selector: "input" });
    type("Mật khẩu mới", "Zebra19!horse");
    type("Nhập lại mật khẩu", "Zebra19!horse");
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Nhập mật khẩu hiện tại.");
    type("Mật khẩu hiện tại", "nope-nope-1");
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect((await screen.findByText("Mật khẩu hiện tại không đúng.")).textContent).toBeTruthy();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("shows nothing for an account that has no password", async () => {
    setup({ provider: "google" });
    await waitFor(() => expect(screen.queryByLabelText("Mật khẩu hiện tại", { selector: "input" })).toBeNull());
  });
});
