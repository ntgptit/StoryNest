/**
 * The public address of the site, used for canonical links, Open Graph URLs, the sitemap and robots.txt.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel the production domain is the next best; locally it is the dev server.
 * A value that is not an absolute http(s) address is ignored rather than producing broken links everywhere.
 */
const LOCAL_SITE_URL = "http://localhost:3000";

function parseSiteUrl(value: string | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    // A bare host gets https; anything that already names a scheme is judged as it is (ftp:// is refused below).
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? new URL(url.origin) : null;
  } catch {
    return null;
  }
}

export function getSiteUrl(): URL {
  return (
    parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    parseSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    new URL(LOCAL_SITE_URL)
  );
}

/** An absolute URL for a path of this site. */
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
