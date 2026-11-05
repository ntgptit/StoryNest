"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import type { PartRef } from "../../_shared/parts.ts";
import { storyKeys } from "../../story/index.ts";
import { createStoryPart, deleteStoryPart, renameStoryPart, setChapterPart } from "../api/parts.api.ts";
import { studioKeys } from "../keys.ts";
import type { StudioChapter } from "../model/studio-chapter.ts";
import { storyPartsQueryOptions } from "../queries.ts";

/** The parts of a story for the chapter manager. */
export function useStoryParts(storyId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<PartRef[], AppError>({
    ...storyPartsQueryOptions(getClient, storyId),
    enabled: auth.status === "authenticated",
    staleTime: 0,
  });
}

/** Parts show in the studio list, the public story page and the reader's contents. */
function useRefreshParts(storyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studioKeys.parts(storyId) }),
      queryClient.invalidateQueries({ queryKey: studioKeys.chapters(storyId) }),
      queryClient.invalidateQueries({ queryKey: storyKeys.all }),
    ]);
}

function useWrapped<TArgs>(storyId: string, run: (args: TArgs) => Promise<void>) {
  const refresh = useRefreshParts(storyId);
  return useMutation<void, AppError, TArgs>({
    mutationFn: async (args) => {
      try {
        await run(args);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

export function useCreatePart(storyId: string) {
  const getClient = useDataClientGetter();
  return useWrapped<{ id: string; title: string }>(storyId, ({ id, title }) =>
    createStoryPart(getClient(), storyId, id, title),
  );
}

export function useRenamePart(storyId: string) {
  const getClient = useDataClientGetter();
  return useWrapped<{ partId: string; title: string }>(storyId, ({ partId, title }) =>
    renameStoryPart(getClient(), partId, title),
  );
}

export function useDeletePart(storyId: string) {
  const getClient = useDataClientGetter();
  return useWrapped<string>(storyId, (partId) => deleteStoryPart(getClient(), partId));
}

/** Moves a chapter into a part (or out of all parts); the list shows it there at once and goes back on a refusal. */
export function useSetChapterPart(storyId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const refresh = useRefreshParts(storyId);
  return useMutation<
    void,
    AppError,
    { chapterId: string; partId: string | null },
    { previous: StudioChapter[] | undefined }
  >({
    mutationFn: async ({ chapterId, partId }) => {
      try {
        await setChapterPart(getClient(), chapterId, partId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async ({ chapterId, partId }) => {
      const key = studioKeys.chapters(storyId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<StudioChapter[]>(key);
      if (previous) {
        queryClient.setQueryData<StudioChapter[]>(
          key,
          previous.map((chapter) => (chapter.id === chapterId ? { ...chapter, partId } : chapter)),
        );
      }
      return { previous };
    },
    onError: (_error, _args, context) => {
      if (context?.previous) queryClient.setQueryData(studioKeys.chapters(storyId), context.previous);
    },
    onSettled: refresh,
  });
}
