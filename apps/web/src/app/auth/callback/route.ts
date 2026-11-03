import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@storynest/utils";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point of the links in confirmation and password-reset emails (PKCE flow): exchanges the one-time `code`
 * for a session cookie, then sends the user on to `next`. `next` comes from the URL, so it is validated: only
 * same-site relative paths are followed (no open redirect). Any failure returns to the sign-in page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
