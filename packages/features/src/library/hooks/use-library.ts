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
