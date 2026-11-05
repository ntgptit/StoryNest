"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@storynest/database";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DataClient } from "./client.ts";
import { useOptionalDataClient } from "./data.tsx";
import { toAppError, unwrap } from "./errors.ts";

export type Profile = Pick<
  Tables<"app_users">,
  "id" | "username" | "display_name" | "bio" | "avatar_storage_key" | "account_status"
>;

export const authKeys = {
  all: ["auth"] as const,
  profile: (userId: string) => ["auth", "profile", userId] as const,
};

export const PROFILE_COLUMNS = "id, username, display_name, bio, avatar_storage_key, account_status";

/** The signed-in user's own profile (RLS also lets everyone read active profiles; we always ask by id). */
export async function fetchProfile(client: DataClient, userId: string): Promise<Profile | null> {
  return unwrap(await client.from("app_users").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle());
}

export type AuthState =
  | { status: "loading"; session: null; user: null; profile: null }
  | { status: "unauthenticated"; session: null; user: null; profile: null }
  | { status: "authenticated"; session: Session; user: User; profile: Profile | null };

export type AuthContextValue = AuthState & {
  /** True while the profile row is still loading for an authenticated user. */
  profileLoading: boolean;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type SessionState = { status: "loading" } | { status: "ready"; session: Session | null };

/**
 * Mirrors the Supabase session into React state. This is for rendering only (menus, redirects); it is NOT an
 * authorisation decision. The server re-validates the JWT (src/proxy.ts) and RLS enforces access in the database.
 *
 * supabase-js broadcasts auth changes between browser tabs, so signing out in one tab updates the others.
 *
 * Data isolation: the query cache belongs to one user at a time. Many per-user keys do not carry the user id
 * (reading progress, studio, history...), so when the user changes (sign-out, or another account signing in, also
 * from another tab) everything cached is reset BEFORE the new state renders: no screen can show the previous user's
 * data, a request still in flight for them is cancelled (so a late answer cannot write their data back), and what is
 * on screen is fetched again for the new user. The first known session keeps the cache (it may hold data the server
 * rendered for that same user), and so do token refreshes of the same user.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useOptionalDataClient();
  const queryClient = useQueryClient();
  const [sessionState, setSessionState] = useState<SessionState>(
    client ? { status: "loading" } : { status: "ready", session: null },
  );

  // Whose data the query cache holds: undefined until the first session is known, then a user id or null (guest).
  const cacheOwner = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!client) {
      setSessionState({ status: "ready", session: null });
      return;
    }
    let active = true;
    const adoptCacheOwner = (session: Session | null) => {
      const next = session?.user.id ?? null;
      const previous = cacheOwner.current;
      cacheOwner.current = next;
      if (previous === undefined || previous === next) return;
      queryClient.removeQueries({ queryKey: authKeys.all });
      void queryClient.resetQueries();
    };
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      adoptCacheOwner(session); // before the state update, so the next render already sees an empty cache
      setSessionState({ status: "ready", session });
    });
    // INITIAL_SESSION is delivered through the listener above; getSession covers older clients and races.
    void client.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (cacheOwner.current === undefined) cacheOwner.current = session?.user.id ?? null;
      setSessionState((current) => (current.status === "loading" ? { status: "ready", session } : current));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  const session = sessionState.status === "ready" ? sessionState.session : null;
  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: authKeys.profile(userId ?? "anonymous"),
    queryFn: () => fetchProfile(client as DataClient, userId as string),
    enabled: client !== null && userId !== undefined,
  });

  const value = useMemo<AuthContextValue>(() => {
    const signOut = async () => {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw toAppError(error);
    };
    if (sessionState.status === "loading") {
      return { status: "loading", session: null, user: null, profile: null, profileLoading: false, signOut };
    }
    if (!session) {
      return { status: "unauthenticated", session: null, user: null, profile: null, profileLoading: false, signOut };
    }
    return {
      status: "authenticated",
      session,
      user: session.user,
      profile: profileQuery.data ?? null,
      profileLoading: profileQuery.isPending,
      signOut,
    };
  }, [client, session, sessionState.status, profileQuery.data, profileQuery.isPending]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === undefined) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
