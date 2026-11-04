"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { editorKeys, getChapterDraft, saveChapterDraft, clearBackup } from "../../editor/index.ts";
import type { ReaderBlock } from "../../reader/index.ts";
import type { ChapterVersion } from "../model/history.ts";
import { readerBlocksToBody } from "../model/history.ts";
import { chapterVersionsQueryOptions, versionBlocksQueryOptions } from "../queries.ts";

export function useChapterVersions(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ChapterVersion[], AppError>({
    ...chapterVersionsQueryOptions(getClient, chapterId),
    enabled: auth.status === "authenticated",
    staleTime: 0,
  });
}

export function useVersionBlocks(versionId: string | null) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  return useQuery<ReaderBlock[], AppError>({
    ...versionBlocksQueryOptions(getClient, versionId ?? "none"),
    enabled: auth.status === "authenticated" && versionId !== null,
  });
}

/**
 * Copies a version into the working draft. Only the draft is written (at the revision read just now, so a save made
 * elsewhere in the meantime is a conflict, never overwritten); the version itself and the live chapter stay as they are.
 */
export function useRestoreVersion(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useMutation<void, AppError, { title: string; blocks: readonly ReaderBlock[] }>({
    mutationFn: async ({ title, blocks }) => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        const body = readerBlocksToBody(blocks);
        if (!body) throw toAppError({ code: "22023", message: "Version has no restorable content" });
        const draft = await getChapterDraft(getClient(), chapterId);
        if (!draft) throw toAppError({ code: "PT404", message: "Draft not found" });
        await saveChapterDraft(getClient(), userId, {
          chapterId,
          title,
          body,
          expectedRevision: draft.revision,
        });
        clearBackup(chapterId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editorKeys.draft(chapterId) }),
  });
}
