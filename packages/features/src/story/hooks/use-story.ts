"use client";

import { useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import type { ChapterListItem, StoryDetail } from "../model/story-detail.ts";
import { storyChaptersQueryOptions, storyQueryOptions } from "../queries.ts";

export function useStory(storyId: string) {
  const getClient = useDataClientGetter();
  return useQuery<StoryDetail | null, AppError>(storyQueryOptions(getClient, storyId));
}

export function useStoryChapters(storyId: string) {
  const getClient = useDataClientGetter();
  return useQuery<ChapterListItem[], AppError>(storyChaptersQueryOptions(getClient, storyId));
}
