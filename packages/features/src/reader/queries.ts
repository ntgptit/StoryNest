// NO "use client" in this module on purpose: the chapter page calls prefetchChapter from a Server Component
// (see discovery/queries.ts for the reason). The hooks are the client side and import their options from here.
import type { QueryClient } from "@tanstack/react-query";
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { getChapterContent } from "./api/reader.api.ts";
import { readerKeys } from "./keys.ts";
import type { ChapterContent } from "./model/chapter.ts";

export function chapterQueryOptions(getClient: () => DataClient, storyId: string, chapterSlug: string) {
  return {
    queryKey: readerKeys.chapter(storyId, chapterSlug),
    queryFn: (): Promise<ChapterContent | null> =>
      getChapterContent(getClient(), storyId, chapterSlug).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

/** Loads the chapter into the cache on the server and returns it (null = not found) so the page can answer 404. */
export function prefetchChapter(
  queryClient: QueryClient,
  client: DataClient,
  storyId: string,
  chapterSlug: string,
): Promise<ChapterContent | null> {
  return queryClient.fetchQuery(chapterQueryOptions(() => client, storyId, chapterSlug));
}
