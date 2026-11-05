"use client";

import { useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import type { ChapterListItem, StoryDetail } from "../model/story-detail.ts";
import { nextChapterQueryOptions, storyChaptersQueryOptions, storyQueryOptions } from "../queries.ts";

export function useStory(storyId: string) {
  const getClient = useDataClientGetter();
  return useQuery<StoryDetail | null, AppError>(storyQueryOptions(getClient, storyId));
}

export function useStoryChapters(storyId: string) {
  const getClient = useDataClientGetter();
  return useQuery<ChapterListItem[], AppError>(storyChaptersQueryOptions(getClient, storyId));
}

/**
 * The next chapter's time. Fetched in the browser only (not prefetched): the countdown ticks from the client clock, so
 * it is never part of the server HTML. Refreshed every few minutes so a new schedule (or a cancelled one) shows up.
 */
export function useNextChapterAt(storyId: string) {
  const getClient = useDataClientGetter();
  return useQuery<string | null, AppError>({
    ...nextChapterQueryOptions(getClient, storyId),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
