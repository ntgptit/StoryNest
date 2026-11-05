import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
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

describe("AuthProvider: the query cache belongs to one user at a time", () => {
  // Per-user data cached under keys that do not carry the user id (reading progress, studio, history...).
  const PRIVATE_KEY = ["progress", "story", "s1"] as const;

  function setup(initial: Session | null) {
    const f = fakeClient({ initial, profile: profileRow });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const resolvers: ((value: string) => void)[] = []; // one per request, in call order
    const queryFn = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)));
    const seen: { user: string; data: string | undefined }[] = [];
    function Probe() {
      const auth = useAuth();
      const query = useQuery({ queryKey: PRIVATE_KEY, queryFn, enabled: auth.status === "authenticated" });
      seen.push({ user: auth.user?.id ?? auth.status, data: query.data });
      return <span data-testid="probe">{query.data ?? "-"}</span>;
    }
    const ui = render(
      <QueryClientProvider client={queryClient}>
        <DataProvider client={f.client}>
          <AuthProvider>
            <Probe />
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    const resolve = (value: string, call = resolvers.length - 1) => act(() => resolvers[call]?.(value));
    return { ...f, queryClient, queryFn, seen, ui, resolve };
  }

  it("keeps data hydrated from the server for the first session and across token refreshes", async () => {
    const t = setup(session("u1"));
    t.queryClient.setQueryData(PRIVATE_KEY, "u1-data");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("u1-data"));
    act(() => t.emit("TOKEN_REFRESHED", session("u1")));
    act(() => t.emit("USER_UPDATED", session("u1")));
    expect(t.queryClient.getQueryData(PRIVATE_KEY)).toBe("u1-data");
  });

  it("drops the previous user's data on sign-out", async () => {
    const t = setup(session("u1"));
    t.queryClient.setQueryData(PRIVATE_KEY, "u1-data");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("u1-data"));
    act(() => t.emit("SIGNED_OUT", null));
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("-"));
    expect(t.queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined();
  });

  it("never renders the previous user's data for the next user", async () => {
    const t = setup(session("u1"));
    t.queryClient.setQueryData(PRIVATE_KEY, "u1-data");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("u1-data"));

    act(() => t.emit("SIGNED_IN", session("u2"))); // another account signs in (e.g. in another tab)
    expect(t.seen.filter((render) => render.user === "u2" && render.data === "u1-data")).toEqual([]);
    expect(screen.getByTestId("probe").textContent).toBe("-");

    t.resolve("u2-data"); // the screen loads the new user's data
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("u2-data"));
  });

  it("does not let a late answer to the previous user's request write their data back", async () => {
    const t = setup(session("u1"));
    await waitFor(() => expect(t.queryFn).toHaveBeenCalledTimes(1)); // u1's request is in flight
    act(() => t.emit("SIGNED_OUT", null));
    t.resolve("u1-late", 0); // the answer to u1's request arrives after the sign-out
    await act(() => new Promise((resolve) => setTimeout(resolve, 20))); // let the query settle

    expect(t.queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined();
    expect(screen.getByTestId("probe").textContent).toBe("-");
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
