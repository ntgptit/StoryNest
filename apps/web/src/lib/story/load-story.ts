import { cache } from "react";
import { createQueryClient, prefetchStory, type StoryDetail } from "@storynest/features";
import type { QueryClient } from "@tanstack/react-query";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoadedStory {
  queryClient: QueryClient;
  /** null = the story does not exist or the caller may not see it; undefined = could not be loaded (no env / error). */
  story: StoryDetail | null | undefined;
}

/**
 * The query client of one story's pages for this request. Shared through cache() so the story and its chapter can
 * be loaded in parallel into the same client, and one dehydrate hands the browser all of it.
 */
export const storyQueryClient = cache((_storyId: string): QueryClient => createQueryClient());

/**
 * Loads a story once per request: `generateMetadata` and the page both call this, and React's cache() makes the
 * second call free. The query client is kept so the page can hydrate the client with the same data.
 */
export const loadStory = cache(async (storyId: string): Promise<LoadedStory> => {
  const queryClient = storyQueryClient(storyId);
  if (!isSupabaseConfigured()) return { queryClient, story: undefined };
  try {
    return { queryClient, story: await prefetchStory(queryClient, await createSupabaseServerClient(), storyId) };
  } catch (error) {
    // The client will retry and show its own error state; never swallow silently (see the home page).
    console.error("story: prefetch failed", error);
    return { queryClient, story: undefined };
  }
});
