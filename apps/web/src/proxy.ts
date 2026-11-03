import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
  return updateSession(request);
}

export const config = {
  // Everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
