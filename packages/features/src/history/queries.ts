// No "use client": query options are plain data shared by hooks.
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { getVersionBlocks, listChapterVersions } from "./api/history.api.ts";
import { historyKeys } from "./keys.ts";

export function chapterVersionsQueryOptions(getClient: () => DataClient, chapterId: string) {
  return {
    queryKey: historyKeys.versions(chapterId),
    queryFn: () =>
      listChapterVersions(getClient(), chapterId).catch((error: unknown) => Promise.reject(toAppError(error))),
  };
}

/** A published version never changes, so its blocks can be cached for the whole session. */
export function versionBlocksQueryOptions(getClient: () => DataClient, versionId: string) {
  return {
    queryKey: historyKeys.blocks(versionId),
    queryFn: () =>
      getVersionBlocks(getClient(), versionId).catch((error: unknown) => Promise.reject(toAppError(error))),
    staleTime: Infinity,
  };
}
