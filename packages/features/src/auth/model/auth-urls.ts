import { safeRedirectPath } from "@storynest/utils";

/** Where the email links (confirm sign-up, reset password) send the browser: our callback, which then redirects to `next`. */
export function authCallbackUrl(origin: string, next: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent(safeRedirectPath(next))}`;
}

/** `/register` + the post-login destination, preserved across the auth screens. Only safe paths are carried. */
export function withNext(path: string, next: string | undefined): string {
  if (!next) return path;
  const safe = safeRedirectPath(next, "");
  return safe === "" || safe === "/" ? path : `${path}?next=${encodeURIComponent(safe)}`;
}
