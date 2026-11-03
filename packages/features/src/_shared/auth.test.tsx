import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, fetchProfile, useAuth } from "./auth.tsx";
import type { DataClient } from "./client.ts";
import { DataProvider } from "./data.tsx";

afterEach(cleanup);

type Listener = (event: string, session: Session | null) => void;

const session = (id: string): Session =>
  ({ access_token: "t", user: { id, email: `${id}@x.dev` } }) as unknown as Session;
const profileRow = {
  id: "u1",
  username: "reader",
  display_name: "Reader",
  bio: null,
  avatar_storage_key: null,
  account_status: "active",
};

function fakeClient(
  options: { initial?: Session | null; profile?: unknown; profileError?: unknown; signOutError?: unknown } = {},
) {
  const listeners = new Set<Listener>();
  const unsubscribe = vi.fn((...args: unknown[]) => void args);
  const maybeSingle = vi.fn(async () => ({ data: options.profile ?? null, error: options.profileError ?? null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const client = {
    auth: {
      onAuthStateChange: (listener: Listener) => {
        listeners.add(listener);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(listener);
                unsubscribe();
              },
            },
          },
        };
      },
      getSession: vi.fn(async () => ({ data: { session: options.initial ?? null } })),
      signOut: vi.fn(async () => ({ error: options.signOutError ?? null })),
    },
    from: vi.fn(() => ({ select })),
  };
  return {
    client: client as unknown as DataClient,
    emit: (event: string, next: Session | null) => listeners.forEach((l) => l(event, next)),
    unsubscribe,
    spies: { select, eq, maybeSingle, client },
  };
}

function wrapper(client: DataClient | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataProvider client={client}>
          <AuthProvider>{children}</AuthProvider>
        </DataProvider>
      </QueryClientProvider>
    );
  };
}

function Status() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="name">{auth.profile?.display_name ?? "-"}</span>
      <span data-testid="loading">{String(auth.profileLoading)}</span>
      <button onClick={() => void auth.signOut().catch(() => undefined)}>signout</button>
    </div>
  );
}

const renderStatus = (client: DataClient | null) => {
  const Wrapper = wrapper(client);
  return render(
    <Wrapper>
      <Status />
    </Wrapper>,
  );
};

describe("AuthProvider", () => {
  it("starts loading, then settles to unauthenticated without a session", async () => {
    const { client } = fakeClient({ initial: null });
    renderStatus(client);
    expect(screen.getByTestId("status").textContent).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
    expect(screen.getByTestId("name").textContent).toBe("-");
  });

  it("is authenticated with the profile loaded by id when a session exists", async () => {
    const f = fakeClient({ initial: session("u1"), profile: profileRow });
    renderStatus(f.client);
    await waitFor(() => expect(screen.getByTestId("name").textContent).toBe("Reader"));
    expect(screen.getByTestId("status").textContent).toBe("authenticated");
    expect(f.spies.client.from).toHaveBeenCalledWith("app_users");
    expect(f.spies.eq).toHaveBeenCalledWith("id", "u1");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("follows auth events: sign in, then sign out clears profile data", async () => {
    const f = fakeClient({ initial: null, profile: profileRow });
    renderStatus(f.client);
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));

    act(() => f.emit("SIGNED_IN", session("u1")));
    await waitFor(() => expect(screen.getByTestId("name").textContent).toBe("Reader"));

    act(() => f.emit("SIGNED_OUT", null));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
    expect(screen.getByTestId("name").textContent).toBe("-");
  });

  it("an authenticated user without a profile row still renders (profile is null)", async () => {
    const f = fakeClient({ initial: session("u1"), profile: null });
    renderStatus(f.client);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("status").textContent).toBe("authenticated");
    expect(screen.getByTestId("name").textContent).toBe("-");
  });

  it("unsubscribes from auth events on unmount", async () => {
    const f = fakeClient({ initial: null });
    const view = renderStatus(f.client);
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
    view.unmount();
    expect(f.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("without a client it is simply signed out", async () => {
    renderStatus(null);
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
  });

  it("signOut calls Supabase and surfaces failures as AppError", async () => {
    const ok = fakeClient({ initial: session("u1"), profile: profileRow });
    renderStatus(ok.client);
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("authenticated"));
    act(() => screen.getByText("signout").click());
    await waitFor(() => expect(ok.spies.client.auth.signOut).toHaveBeenCalledTimes(1));
  });

  it("useAuth requires the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Status />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});

describe("fetchProfile", () => {
  it("returns the row, and converts a database error into an AppError", async () => {
    const good = fakeClient({ profile: profileRow });
    await expect(fetchProfile(good.client, "u1")).resolves.toEqual(profileRow);

    const bad = fakeClient({ profileError: { code: "42501", message: "denied" } });
    await expect(fetchProfile(bad.client, "u1")).rejects.toMatchObject({ name: "AppError", kind: "forbidden" });
  });
});
