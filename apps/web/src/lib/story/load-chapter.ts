import { cache } from "react";
import { prefetchChapter, type ChapterContent } from "@storynest/features";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { loadStory } from "./load-story";

/**
 * Loads a chapter into the SAME query client as its story, so one dehydrate hands the client the story, the chapter
 * list and the chapter. null = not found; undefined = could not be loaded (no env / error: the client retries).
 */
export const loadChapter = cache(async (storyId: string, chapterSlug: string) => {
  const loaded = await loadStory(storyId);
  let chapter: ChapterContent | null | undefined;
  if (isSupabaseConfigured()) {
    try {
      chapter = await prefetchChapter(loaded.queryClient, await createSupabaseServerClient(), storyId, chapterSlug);
    } catch (error) {
      console.error("chapter: prefetch failed", error);
    }
  }
  return { ...loaded, chapter };
});
