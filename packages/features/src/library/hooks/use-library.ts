"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { setStoryFollow, setStorySave, storyKeys } from "../../story/index.ts";
import { listFollowing, listReading, listSaved, removeFromReading } from "../api/library.api.ts";
import { libraryKeys } from "../keys.ts";
import type { LibraryEntry, LibraryTab } from "../model/library.ts";

/** One tab of the library, read fresh whenever it is opened. Idle until the session is known. */
export function useLibraryList(tab: LibraryTab) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  const load = { reading: listReading, saved: listSaved, following: listFollowing }[tab];
  const key = userId === null ? libraryKeys.all : libraryKeys[tab](userId);
  return useQuery<LibraryEntry[], AppError>({
    queryKey: key,
    queryFn: () => load(getClient(), userId ?? "").catch((error: unknown) => Promise.reject(toAppError(error))),
    enabled: userId !== null,
    staleTime: 0,
  });
}

/** Tabs whose removal can be undone: saving and following again is the same call with `true`. */
export type UndoableLibraryTab = Exclude<LibraryTab, "reading">;
export const isUndoable = (tab: LibraryTab): tab is UndoableLibraryTab => tab !== "reading";

/**
 * Undo of a removal from the saved or followed tab: saves / follows the story again through the same API as the story
 * page's buttons, then refreshes the library and the story page. (Taking a story off "reading" deletes its progress
 * pointer, which cannot be put back as it was, so that tab has no undo.)
 */
export function useRestoreToLibrary(tab: UndoableLibraryTab) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (storyId) => {
      try {
        if (tab === "saved") await setStorySave(getClient(), storyId, true);
        else await setStoryFollow(getClient(), storyId, true);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
        queryClient.invalidateQueries({ queryKey: storyKeys.all }),
      ]),
  });
}

/** Removes a story from one tab. Unsaving and unfollowing also refresh the story page's buttons and count. */
export function useRemoveFromLibrary(tab: LibraryTab) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useMutation<void, AppError, string>({
    mutationFn: async (storyId) => {
      try {
        if (userId === null) throw toAppError({ status: 401, message: "Not signed in" });
        if (tab === "reading") await removeFromReading(getClient(), userId, storyId);
        else if (tab === "saved") await setStorySave(getClient(), storyId, false).then(() => undefined);
        else await setStoryFollow(getClient(), storyId, false).then(() => undefined);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
        queryClient.invalidateQueries({ queryKey: storyKeys.all }),
      ]),
  });
}
