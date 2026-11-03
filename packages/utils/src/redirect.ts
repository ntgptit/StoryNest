/**
 * Validates a post-login destination taken from user-controlled input (`?next=`). Only same-site relative paths
 * are accepted, so a crafted link cannot bounce a freshly authenticated user to another site (open redirect).
 * Anything else yields `fallback`.
 */
export function safeRedirectPath(input: string | null | undefined, fallback = "/"): string {
  if (typeof input !== "string" || input === "") return fallback;
  // Backslashes and control characters are normalised by browsers ("/\evil.com" -> "//evil.com"): reject outright.
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f || char === "\\") return fallback;
  }
  if (!input.startsWith("/") || input.startsWith("//")) return fallback;
  try {
    const base = "http://redirect.invalid";
    const url = new URL(input, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
