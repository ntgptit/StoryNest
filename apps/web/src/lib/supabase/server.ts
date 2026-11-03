import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@storynest/database";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Server client for Server Components, Server Actions and Route Handlers. Runs as the signed-in user, so every
 * query is subject to RLS. Create one per request; never share it across requests.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. src/proxy.ts refreshes the session.
        }
      },
    },
  });
}
