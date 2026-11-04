import { redirect } from "next/navigation";
import { safeRedirectPath } from "@storynest/utils";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | undefined;
  /** From the signed token's app_metadata, which only the server can set. */
  isModerator: boolean;
}

/**
 * The signed-in user for this request, or null. Identity comes from getClaims(), which verifies the JWT signature
 * (cookie contents alone must never be trusted on the server).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.is_anonymous === true) return null;
  return { id: claims.sub, email: claims.email, isModerator: claims.app_metadata?.role === "moderator" };
}

/**
 * Guard for Server Components and Server Actions. `returnTo` is the page's own path, so signing in brings the user
 * back to it. The proxy already redirects anonymous visitors; this is the authoritative second check.
 */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeRedirectPath(returnTo))}`);
  return user;
}
