"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { editorKeys, getChapterDraft, clearBackup } from "../../editor/index.ts";
import type { ReaderBlock } from "../../reader/index.ts";
import { restoreChapterVersion } from "../api/history.api.ts";
import { historyKeys } from "../keys.ts";
import type { ChapterVersion } from "../model/history.ts";
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
 * Copies a version into the working draft, on the server (restore_chapter_version), which also makes that version the
 * draft's base: publishing afterwards starts a branch from it (Lucian 177). Only the draft is written, at the revision
 * read just now, so a save made elsewhere in the meantime is a conflict, never overwritten; the version itself and the
 * live chapter stay as they are.
 */
export function useRestoreVersion(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useMutation<void, AppError, { versionId: string }>({
    mutationFn: async ({ versionId }) => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        const draft = await getChapterDraft(getClient(), chapterId);
        if (!draft) throw toAppError({ code: "PT404", message: "Draft not found" });
        await restoreChapterVersion(getClient(), versionId, draft.revision);
        clearBackup(chapterId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: editorKeys.draft(chapterId) }),
        queryClient.invalidateQueries({ queryKey: historyKeys.versions(chapterId) }),
      ]),
  });
}
