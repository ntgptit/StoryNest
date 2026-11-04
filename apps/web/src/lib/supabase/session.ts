import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@storynest/database";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session cookies for the incoming request (called from src/proxy.ts).
 * Uses getClaims(), which validates the JWT signature, instead of trusting the cookie contents.
 * Returns the response carrying the refreshed cookies and whether the visitor holds a valid, non-anonymous session.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cache-Control etc.: keeps CDNs from caching a response that carries auth cookies.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims) && data?.claims.is_anonymous !== true;
  return { response, isAuthenticated };
}
