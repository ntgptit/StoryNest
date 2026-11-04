import { safeRedirectPath } from "@storynest/utils";

/** Paths (and everything below them) that need a signed-in user. One list, used by the proxy and by tests. */
export const PROTECTED_PREFIXES = ["/me", "/studio", "/library", "/settings", "/notifications", "/following"] as const;

/** Credential pages a signed-in user has no reason to see (the reset page is excluded: recovery counts as signed in). */
export const GUEST_ONLY_PATHS = ["/login", "/register"] as const;

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.some((path) => matches(pathname, path));
}

/**
 * Optimistic redirect decision for the proxy (the pages re-check with requireUser, RLS is the real boundary):
 *  - anonymous visitor on a protected path   -> /login?next=<where they were going>
 *  - signed-in user on /login or /register   -> wherever `next` points (home by default)
 * Returns the path to redirect to, or null to let the request through.
 */
export function decideAuthRedirect(input: {
  pathname: string;
  search: string;
  isAuthenticated: boolean;
}): string | null {
  const { pathname, search, isAuthenticated } = input;

  if (!isAuthenticated && isProtectedPath(pathname)) {
    return `/login?next=${encodeURIComponent(safeRedirectPath(`${pathname}${search}`))}`;
  }
  if (isAuthenticated && isGuestOnlyPath(pathname)) {
    return safeRedirectPath(new URLSearchParams(search).get("next"));
  }
  return null;
}
