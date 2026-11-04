"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getLibraryState, setStoryFollow, setStorySave } from "../api/library.api.ts";
import { storyKeys } from "../keys.ts";
import { NOT_IN_LIBRARY, followersAfter, withFollowing, withSaved, type LibraryState } from "../model/library.ts";
import type { StoryDetail } from "../model/story-detail.ts";

/**
 * Follow and save state of one story for the signed-in reader, with a toggle for each that shows its effect at once
 * (the follower count on the page moves too), takes the server's count when it answers and puts everything back if the
 * server refuses. A caller must not start a second toggle of the same kind while one is running (`isPending`).
 */
export function useStoryLibrary(storyId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  const key = storyKeys.library(storyId, userId);
  const detailKey = storyKeys.detail(storyId);

  const state = useQuery<LibraryState, AppError>({
    queryKey: key,
    queryFn: () => getLibraryState(getClient(), storyId, userId).catch((e: unknown) => Promise.reject(toAppError(e))),
    // The session is still being read: asking now would cache a guest answer under the wrong key.
    enabled: auth.status !== "loading",
  });

  const follow = useMutation<
    number,
    AppError,
    boolean,
    { previous: LibraryState | undefined; detail: StoryDetail | null | undefined }
  >({
    mutationFn: async (following) => {
      try {
        return await setStoryFollow(getClient(), storyId, following);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (following) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: key }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);
      const previous = queryClient.getQueryData<LibraryState>(key);
      const detail = queryClient.getQueryData<StoryDetail | null>(detailKey);
      const was = previous?.following ?? false;
      if (previous) queryClient.setQueryData<LibraryState>(key, withFollowing(previous, following));
      if (detail) {
        const next: StoryDetail = {
          ...detail,
          stats: { ...detail.stats, followers: followersAfter(detail.stats.followers, was, following) },
        };
        queryClient.setQueryData<StoryDetail | null>(detailKey, next);
      }
      return { previous, detail };
    },
    onError: (_error, _following, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (context?.detail) queryClient.setQueryData(detailKey, context.detail);
    },
    onSuccess: (followers, following) => {
      queryClient.setQueryData<LibraryState>(key, (current) => withFollowing(current ?? NOT_IN_LIBRARY, following));
      queryClient.setQueryData<StoryDetail | null>(detailKey, (detail) =>
        detail ? { ...detail, stats: { ...detail.stats, followers } } : detail,
      );
    },
  });

  const save = useMutation<number, AppError, boolean, { previous: LibraryState | undefined }>({
    mutationFn: async (saved) => {
      try {
        return await setStorySave(getClient(), storyId, saved);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (saved) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LibraryState>(key);
      if (previous) queryClient.setQueryData<LibraryState>(key, withSaved(previous, saved));
      return { previous };
    },
    onError: (_error, _saved, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (_count, saved) =>
      queryClient.setQueryData<LibraryState>(key, (current) => withSaved(current ?? NOT_IN_LIBRARY, saved)),
  });

  return { state, follow, save, signedIn: userId !== null };
}
