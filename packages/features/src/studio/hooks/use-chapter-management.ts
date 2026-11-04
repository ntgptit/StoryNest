"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChapterForm } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { storyKeys } from "../../story/index.ts";
import {
  createChapter,
  renameChapterSlug,
  reorderChapters,
  setChapterArchived,
  setChapterDeleted,
} from "../api/chapters.api.ts";
import { studioKeys } from "../keys.ts";
import { applyOrder, type StudioChapter } from "../model/studio-chapter.ts";
import { studioChaptersQueryOptions } from "../queries.ts";

/** All chapters of a story for the studio. Idle until the session is known. */
export function useStudioChapters(storyId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<StudioChapter[], AppError>({
    ...studioChaptersQueryOptions(getClient, storyId),
    enabled: auth.status === "authenticated",
    staleTime: 0,
  });
}

/** What shows chapters: the studio list and, for published ones, the public story page and reader. */
function useRefreshChapterViews(storyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studioKeys.chapters(storyId) }),
      queryClient.invalidateQueries({ queryKey: studioKeys.all }),
      queryClient.invalidateQueries({ queryKey: storyKeys.all }),
    ]);
}

export function useCreateChapter(storyId: string, newChapterId: () => string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapterViews(storyId);
  return useMutation<string, AppError, ChapterForm>({
    mutationFn: async (form) => {
      try {
        return await createChapter(getClient(), storyId, newChapterId(), form);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

/**
 * Moves chapters. The new order is shown at once (optimistic) and rolled back if the server refuses, e.g. because the
 * list changed elsewhere; either way the list is reloaded afterwards so the screen always ends up with the truth.
 */
export function useReorderChapters(storyId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const refresh = useRefreshChapterViews(storyId);
  return useMutation<void, AppError, string[], { previous: StudioChapter[] | undefined }>({
    mutationFn: async (orderedIds) => {
      try {
        await reorderChapters(getClient(), storyId, orderedIds);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (orderedIds) => {
      const key = studioKeys.chapters(storyId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<StudioChapter[]>(key);
      if (previous) queryClient.setQueryData<StudioChapter[]>(key, applyOrder(previous, orderedIds));
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(studioKeys.chapters(storyId), context.previous);
    },
    // Not awaited: the toast / the next click must not wait for the reload (which is only there to reconcile).
    onSettled: () => void refresh(),
  });
}

export function useArchiveChapter(storyId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapterViews(storyId);
  return useMutation<void, AppError, { chapterId: string; archived: boolean }>({
    mutationFn: async ({ chapterId, archived }) => {
      try {
        await setChapterArchived(getClient(), chapterId, archived);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

export function useRenameChapterSlug(storyId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapterViews(storyId);
  return useMutation<void, AppError, { chapterId: string; slug: string }>({
    mutationFn: async ({ chapterId, slug }) => {
      try {
        await renameChapterSlug(getClient(), chapterId, slug);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: refresh,
  });
}

export function useSetChapterDeleted(storyId: string) {
  const getClient = useDataClientGetter();
  const refresh = useRefreshChapterViews(storyId);
  return useMutation<void, AppError, { chapterId: string; deleted: boolean }>({
    mutationFn: async ({ chapterId, deleted }) => {
      try {
        await setChapterDeleted(getClient(), chapterId, deleted);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}
