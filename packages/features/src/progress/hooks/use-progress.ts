"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import type { ChapterProgress, StoryProgress } from "../model/progress.ts";
import { chapterProgressQueryOptions, storyProgressQueryOptions } from "../queries.ts";

/** Saved position in a chapter. Only runs for a signed-in reader; a guest simply has none. */
export function useChapterProgress(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ChapterProgress | null, AppError>({
    ...chapterProgressQueryOptions(getClient, chapterId),
    enabled: auth.status === "authenticated",
    // Always read the latest position when a chapter opens (it was written by this very reader, possibly elsewhere).
    staleTime: 0,
    gcTime: 0,
  });
}

/** Where to continue a story. Only runs for a signed-in reader. */
export function useStoryProgress(storyId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<StoryProgress | null, AppError>({
    ...storyProgressQueryOptions(getClient, storyId),
    enabled: auth.status === "authenticated",
    staleTime: 0,
  });
}
