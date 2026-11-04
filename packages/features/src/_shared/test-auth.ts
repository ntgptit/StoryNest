// Test helper (imported by *.test.tsx only): gives a fake data client a minimal `auth` so AuthProvider works.
import type { Session } from "@supabase/supabase-js";
import type { DataClient } from "./client.ts";

export const TEST_USER_ID = "00000000-0000-4000-8000-0000000000aa";

export function testSession(userId = TEST_USER_ID): Session {
  return { access_token: "t", user: { id: userId, email: "reader@test.dev" } } as unknown as Session;
}

/** Adds a signed-in (session) or guest (null) auth surface to a fake client. The profile query returns no row. */
export function withAuth<T extends object>(client: T, session: Session | null): DataClient {
  return {
    ...client,
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      getSession: async () => ({ data: { session } }),
    },
  } as unknown as DataClient;
}
