// NO "use client" in this module on purpose: the story page calls these from a Server Component (see
// discovery/queries.ts for the reason). The hooks are the client side and import their options from here.
import type { QueryClient } from "@tanstack/react-query";
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { getNextChapterAt, getStory, listStoryChapters } from "./api/story.api.ts";
import { storyKeys } from "./keys.ts";
import type { ChapterListItem, StoryDetail } from "./model/story-detail.ts";

export function storyQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: storyKeys.detail(storyId),
    queryFn: (): Promise<StoryDetail | null> =>
      getStory(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function storyChaptersQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: storyKeys.chapters(storyId),
    queryFn: (): Promise<ChapterListItem[]> =>
      listStoryChapters(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function nextChapterQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: storyKeys.nextChapter(storyId),
    queryFn: (): Promise<string | null> =>
      getNextChapterAt(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

/**
 * Loads the story into the cache on the server and returns it (null = not found), so the page can decide 404 /
 * redirect / metadata from the same data the client will hydrate. Chapters are prefetched alongside.
 */
export async function prefetchStory(
  queryClient: QueryClient,
  client: DataClient,
  storyId: string,
): Promise<StoryDetail | null> {
  const getClient = () => client;
  const [story] = await Promise.all([
    queryClient.fetchQuery(storyQueryOptions(getClient, storyId)),
    queryClient.prefetchQuery(storyChaptersQueryOptions(getClient, storyId)),
  ]);
  return story;
}
