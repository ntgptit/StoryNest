import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { decideAuthRedirect } from "@/lib/auth/route-guard";
import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    // Allow the UI to run locally before Supabase is set up, but never silently skip auth in production.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase is not configured: cannot refresh sessions.");
    }
    return NextResponse.next();
  }

  const { response, isAuthenticated } = await updateSession(request);

  // Optimistic gate only: every protected page re-checks with requireUser(), and RLS is the real boundary.
  const target = decideAuthRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated,
  });
  if (target === null) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Keep the refreshed session cookies and the no-cache headers that updateSession set on the original response.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export const config = {
  // Everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
