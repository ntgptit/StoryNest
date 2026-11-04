// No "use client": query options are plain data and shared by hooks. Progress is private, so nothing prefetches it.
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { getChapterProgress, getStoryProgress } from "./api/progress.api.ts";
import { progressKeys } from "./keys.ts";

export function chapterProgressQueryOptions(getClient: () => DataClient, chapterId: string) {
  return {
    queryKey: progressKeys.chapter(chapterId),
    queryFn: () =>
      getChapterProgress(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

export function storyProgressQueryOptions(getClient: () => DataClient, storyId: string) {
  return {
    queryKey: progressKeys.story(storyId),
    queryFn: () => getStoryProgress(getClient(), storyId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}
