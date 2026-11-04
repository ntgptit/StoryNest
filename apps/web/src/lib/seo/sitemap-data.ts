import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@storynest/database";
import { CHAPTER_STATUS, STORY_STATUS, VISIBILITY } from "@storynest/validation";

import { getSupabaseEnv } from "@/lib/env";

import { SITEMAP_PAGE_SIZE, type SitemapChapterRow, type SitemapStoryRow } from "./sitemap.ts";

/** A client with no session: a sitemap is what an anonymous visitor could find, whoever asks for it. */
export function createAnonymousClient(): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Client = SupabaseClient<Database>;

/**
 * What belongs in a sitemap: public stories that are not drafts, not removed and not adult (18+ stories are kept out
 * of search engines, see isIndexable). RLS already limits an anonymous client to public stories; the filters say it
 * again so the file does not depend on that alone.
 */
function publicStories(client: Client) {
  return client
    .from("stories")
    .select("id, slug, updated_at", { count: "exact" })
    .eq("visibility", VISIBILITY.PUBLIC)
    .is("deleted_at", null)
    .neq("status", STORY_STATUS.DRAFT)
    .eq("is_mature", false);
}

export async function countStories(client: Client): Promise<number> {
  const { count, error } = await publicStories(client).limit(0);
  if (error) throw error;
  return count ?? 0;
}

export async function listStories(client: Client, page: number): Promise<SitemapStoryRow[]> {
  const { data, error } = await publicStories(client)
    .order("id")
    .range(page * SITEMAP_PAGE_SIZE, (page + 1) * SITEMAP_PAGE_SIZE - 1);
  if (error) throw error;
  return data ?? [];
}

function publishedChapters(client: Client, columns: string) {
  return client
    .from("chapters")
    .select(columns, { count: "exact" })
    .eq("status", CHAPTER_STATUS.PUBLISHED)
    .is("deleted_at", null)
    .eq("story.visibility", VISIBILITY.PUBLIC)
    .is("story.deleted_at", null)
    .neq("story.status", STORY_STATUS.DRAFT)
    .eq("story.is_mature", false);
}

export async function countChapters(client: Client): Promise<number> {
  const { count, error } = await publishedChapters(client, "id, story:stories!inner(id)").limit(0);
  if (error) throw error;
  return count ?? 0;
}

export async function listChapters(client: Client, page: number): Promise<SitemapChapterRow[]> {
  const { data, error } = await publishedChapters(client, "slug, updated_at, story:stories!inner(id, slug)")
    .order("id")
    .range(page * SITEMAP_PAGE_SIZE, (page + 1) * SITEMAP_PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []) as unknown as SitemapChapterRow[];
}
