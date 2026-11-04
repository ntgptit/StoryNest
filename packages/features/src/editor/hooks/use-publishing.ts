"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { discoveryKeys } from "../../discovery/index.ts";
import { storyKeys } from "../../story/index.ts";
import {
  getChapterPublishState,
  publishChapter,
  scheduleChapter,
  unpublishChapter,
  type ChapterPublishState,
} from "../api/publishing.api.ts";

const publishStateKey = (chapterId: string) => ["editor", "publish-state", chapterId] as const;

/** Whether the chapter is a draft, scheduled, published or archived, and what this user may do about it. */
export function useChapterPublishState(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ChapterPublishState | null, AppError>({
    queryKey: publishStateKey(chapterId),
    queryFn: () =>
      getChapterPublishState(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
    enabled: auth.status === "authenticated",
    staleTime: 0,
  });
}

type Action =
  | { kind: "publish"; expectedRevision: number }
  | { kind: "schedule"; expectedRevision: number; scheduledFor: string }
  | { kind: "unpublish" };

/** Publish, schedule or unpublish one chapter, then refresh everything that shows it (state, studio, story page, feed). */
export function usePublishAction(chapterId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, Action>({
    mutationFn: async (action) => {
      try {
        const client = getClient();
        if (action.kind === "publish") await publishChapter(client, chapterId, action.expectedRevision);
        else if (action.kind === "schedule")
          await scheduleChapter(client, chapterId, action.scheduledFor, action.expectedRevision);
        else await unpublishChapter(client, chapterId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: publishStateKey(chapterId) }),
        queryClient.invalidateQueries({ queryKey: ["studio"] }),
        queryClient.invalidateQueries({ queryKey: storyKeys.all }),
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
      ]),
  });
}
