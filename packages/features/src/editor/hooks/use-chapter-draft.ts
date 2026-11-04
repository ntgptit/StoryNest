"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChapterBody } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { saveChapterDraft, type ChapterDraft } from "../api/draft.api.ts";
import { chapterDraftQueryOptions } from "../queries.ts";

/** The draft to edit. Always read fresh (the editor must start from what is saved now), never kept after leaving. */
export function useChapterDraft(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ChapterDraft | null, AppError>({
    ...chapterDraftQueryOptions(getClient, chapterId),
    enabled: auth.status === "authenticated",
    staleTime: 0,
    gcTime: 0,
    // Another tab or device saving must not swap the document under a cursor: reloads are explicit.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSaveChapterDraft(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useMutation<number, AppError, { title: string; body: ChapterBody; expectedRevision: number }>({
    mutationFn: async (input) => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        return await saveChapterDraft(getClient(), userId, { chapterId, ...input });
      } catch (error) {
        throw toAppError(error);
      }
    },
  });
}
