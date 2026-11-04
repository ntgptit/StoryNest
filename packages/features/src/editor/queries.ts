// No "use client": query options are plain data shared by hooks.
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { getChapterDraft } from "./api/draft.api.ts";

export const editorKeys = {
  all: ["editor"] as const,
  draft: (chapterId: string) => ["editor", "draft", chapterId] as const,
};

export function chapterDraftQueryOptions(getClient: () => DataClient, chapterId: string) {
  return {
    queryKey: editorKeys.draft(chapterId),
    queryFn: () => getChapterDraft(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}
