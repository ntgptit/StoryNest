import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, authKeys } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { updateProfile } from "./api/profile.api.ts";
import { isUsernameTaken, profileErrorMessage, validationMessage } from "./model/messages.ts";
import { EditProfileScreen } from "./index.ts";
import { profileText } from "./strings.ts";

afterEach(cleanup);

const session = { access_token: "t", user: { id: "u1", email: "reader@example.com" } } as unknown as Session;
const profile = {
  id: "u1",
  username: "reader",
  display_name: "Người Đọc",
  bio: "xin chào",
  avatar_storage_key: null,
  account_status: "active",
};

type PgError = { code: string; message: string } | null;

/** A client whose `from("app_users")` supports both the profile read (AuthProvider) and the update chain. */
function fakeClient(options: { session?: Session | null; update?: { data?: unknown; error?: PgError } } = {}) {
  const single = vi.fn(async () => ({
    data: options.update?.data ?? { ...profile },
    error: options.update?.error ?? null,
  }));
  const select = vi.fn(() => ({ single }));
  const eqUpdate = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq: eqUpdate }));
  const client = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      getSession: async () => ({ data: { session: options.session === undefined ? session : options.session } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...profile }, error: null }) }) }),
      update,
    }),
  } as unknown as DataClient;
  return { client, update, eqUpdate, select, single };
}

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/me/edit" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function setup(ui: ReactNode, client: DataClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const toast = vi.fn();
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
  return { toast, queryClient };
}

const field = (label: string | RegExp) => screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement;
const type = (label: string | RegExp, value: string) => fireEvent.change(field(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: profileText.edit.submit }));

describe("updateProfile", () => {
  it("updates only the three editable columns of the user's own row", async () => {
    const { client, update, eqUpdate } = fakeClient();
    await updateProfile(client, "u1", { username: "new_name", display_name: "Tên", bio: null });
    expect(update).toHaveBeenCalledWith({ username: "new_name", display_name: "Tên", bio: null });
    expect(eqUpdate).toHaveBeenCalledWith("id", "u1");
  });

  it("maps a unique violation to conflict and zero matched rows to notFound", async () => {
    const taken = fakeClient({ update: { data: null, error: { code: "23505", message: "duplicate key" } } });
    await expect(
      updateProfile(taken.client, "u1", { username: "x_y", display_name: "A", bio: null }),
    ).rejects.toMatchObject({
      kind: "conflict",
    });
    const none = fakeClient({ update: { data: null, error: { code: "PGRST116", message: "0 rows" } } });
    await expect(
      updateProfile(none.client, "u1", { username: "x_y", display_name: "A", bio: null }),
    ).rejects.toMatchObject({
      kind: "notFound",
    });
  });
});

describe("EditProfileScreen", () => {
  it("starts from the current profile and keeps Save disabled until something changes", async () => {
    const { client } = fakeClient();
    setup(<EditProfileScreen onSaved={vi.fn()} />, client);
    await screen.findByRole("heading", { name: profileText.edit.title });
    expect(field(profileText.edit.displayName).value).toBe("Người Đọc");
    expect(field(profileText.edit.username).value).toBe("reader");
    expect(field(profileText.edit.bio).value).toBe("xin chào");
    const button = screen.getByRole("button", { name: profileText.edit.submit }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    type(profileText.edit.displayName, "Tên mới");
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it("validates before saving, with translated messages", async () => {
    const { client, update } = fakeClient();
    setup(<EditProfileScreen onSaved={vi.fn()} />, client);
    await screen.findByRole("heading", { name: profileText.edit.title });
    type(profileText.edit.displayName, "   ");
    type(profileText.edit.username, "no spaces");
    save();
    expect(await screen.findByText(profileText.validation.displayNameRequired)).toBeTruthy();
    expect(screen.getByText(profileText.validation.usernameInvalid)).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("saves trimmed values, turns an emptied bio into null, updates the cache, toasts and finishes", async () => {
    const saved = { ...profile, display_name: "Tên mới", bio: null };
    const { client, update } = fakeClient({ update: { data: saved } });
    const onSaved = vi.fn();
    const { toast, queryClient } = setup(<EditProfileScreen onSaved={onSaved} />, client);
    await screen.findByRole("heading", { name: profileText.edit.title });
    type(profileText.edit.displayName, "  Tên mới  ");
    type(profileText.edit.bio, "   ");
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({ username: "reader", display_name: "Tên mới", bio: null });
    expect(toast).toHaveBeenCalledWith("success", profileText.edit.saved);
    expect(queryClient.getQueryData(authKeys.profile("u1"))).toEqual(saved);
  });

  it("puts a taken username on the username field and keeps the form open", async () => {
    const { client } = fakeClient({ update: { data: null, error: { code: "23505", message: "duplicate" } } });
    const onSaved = vi.fn();
    setup(<EditProfileScreen onSaved={onSaved} />, client);
    await screen.findByRole("heading", { name: profileText.edit.title });
    type(profileText.edit.username, "taken_name");
    save();
    expect(await screen.findByText(profileText.errors.usernameTaken)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull(); // not duplicated as a banner
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows other failures as a banner", async () => {
    const { client } = fakeClient({ update: { data: null, error: { code: "42501", message: "rls" } } });
    setup(<EditProfileScreen onSaved={vi.fn()} />, client);
    await screen.findByRole("heading", { name: profileText.edit.title });
    type(profileText.edit.displayName, "Khác");
    save();
    expect((await screen.findByRole("alert")).textContent).toBe(profileText.errors.forbidden);
  });

  it("explains itself to a guest instead of showing a form", async () => {
    const { client } = fakeClient({ session: null });
    setup(<EditProfileScreen onSaved={vi.fn()} />, client);
    const link = await screen.findByText(profileText.edit.signIn);
    expect(link.closest("a")?.getAttribute("href")).toBe("/login?next=%2Fme%2Fedit");
    expect(screen.queryByRole("heading", { name: profileText.edit.title })).toBeNull();
  });

  it("links Cancel back to the profile", async () => {
    const { client } = fakeClient();
    setup(<EditProfileScreen onSaved={vi.fn()} />, client);
    await screen.findByRole("heading", { name: profileText.edit.title });
    expect(screen.getByText(profileText.edit.cancel).closest("a")?.getAttribute("href")).toBe("/me");
  });
});

describe("messages", () => {
  it("translates schema codes; unknown codes never leak raw English", () => {
    expect(validationMessage("username_invalid")).toBe(profileText.validation.usernameInvalid);
    expect(validationMessage("bio_too_long")).toBe(profileText.validation.bioTooLong);
    expect(validationMessage("Too small: expected string")).toBe(profileText.errors.generic);
    expect(validationMessage(undefined)).toBeUndefined();
  });
  it("classifies save errors", () => {
    expect(isUsernameTaken(new AppError("conflict", "x"))).toBe(true);
    expect(isUsernameTaken(new AppError("forbidden", "x"))).toBe(false);
    expect(profileErrorMessage(new AppError("network", "x"))).toBe(profileText.errors.network);
    expect(profileErrorMessage(new AppError("notFound", "x"))).toBe(profileText.errors.notFound);
    expect(profileErrorMessage(new AppError("unknown", "x"))).toBe(profileText.errors.generic);
  });
});
