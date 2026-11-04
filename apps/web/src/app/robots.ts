import type { MetadataRoute } from "next";

import { isSupabaseConfigured } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";
import { countChapters, countStories, createAnonymousClient } from "@/lib/seo/sitemap-data";
import { sitemapIds } from "@/lib/seo/sitemap";

/** Areas that only make sense signed in, plus technical routes. The pages also say noindex; this saves crawl budget. */
export const DISALLOWED_PATHS = [
  "/studio",
  "/me",
  "/library",
  "/lists",
  "/settings",
  "/notifications",
  "/following",
  "/moderation",
  "/search",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/dev",
] as const;

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let ids = sitemapIds(0, 0);
  if (isSupabaseConfigured()) {
    try {
      const client = createAnonymousClient();
      ids = sitemapIds(await countStories(client), await countChapters(client));
    } catch (error) {
      console.error("robots: could not count what the sitemaps hold", error);
    }
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] },
    // Next.js does not write a sitemap index for generateSitemaps, so each file is listed here.
    sitemap: ids.map((id) => absoluteUrl(`/sitemap/${id}.xml`)),
  };
}
