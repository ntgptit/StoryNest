import type { MetadataRoute } from "next";

import { isSupabaseConfigured } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";
import { countChapters, countStories, createAnonymousClient, listChapters, listStories } from "@/lib/seo/sitemap-data";
import { chapterEntries, parseSitemapId, SITEMAP_KIND, sitemapIds, storyEntries } from "@/lib/seo/sitemap";

/** The sitemaps are built from the database on request and refreshed hourly, not at build time. */
export const revalidate = 3600;
export const dynamic = "force-dynamic";

/** One file per page of stories and per page of chapters (the protocol allows 50,000 URLs per file). */
export async function generateSitemaps(): Promise<{ id: string }[]> {
  if (!isSupabaseConfigured()) return sitemapIds(0, 0).map((id) => ({ id }));
  const client = createAnonymousClient();
  const [stories, chapters] = await Promise.all([countStories(client), countChapters(client)]);
  return sitemapIds(stories, chapters).map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const parsed = parseSitemapId(await props.id);
  if (!parsed) return [];
  if (!isSupabaseConfigured()) return parsed.kind === SITEMAP_KIND.STORIES ? storyEntries([], absoluteUrl, true) : [];
  const client = createAnonymousClient();
  if (parsed.kind === SITEMAP_KIND.CHAPTERS) {
    return chapterEntries(await listChapters(client, parsed.page), absoluteUrl);
  }
  return storyEntries(await listStories(client, parsed.page), absoluteUrl, parsed.page === 0);
}
