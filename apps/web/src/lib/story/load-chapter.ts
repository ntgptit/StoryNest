import { cache } from "react";
import { prefetchChapter, type ChapterContent } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { loadStory, storyQueryClient } from "./load-story";

/**
 * Loads a chapter into the SAME query client as its story, so one dehydrate hands the client the story, the chapter
 * list and the chapter. null = not found; undefined = could not be loaded (no env / error: the client retries).
 * The chapter needs only the story id, so it is fetched in parallel with the story instead of after it.
 */
export const loadChapter = cache(async (storyId: string, chapterSlug: string) => {
  const [loaded, chapter] = await Promise.all([loadStory(storyId), loadChapterContent(storyId, chapterSlug)]);
  return { ...loaded, chapter };
});

async function loadChapterContent(storyId: string, chapterSlug: string): Promise<ChapterContent | null | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  try {
    return await prefetchChapter(storyQueryClient(storyId), await createSupabaseServerClient(), storyId, chapterSlug);
  } catch (error) {
    console.error("chapter: prefetch failed", error);
    return undefined;
  }
}
