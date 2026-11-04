"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getChapterVote, setChapterVote } from "../api/vote.api.ts";
import { readerKeys } from "../keys.ts";
import { settledVote, withVote, type VoteState } from "../model/vote.ts";

/**
 * My vote and the chapter's count, with a toggle that shows its effect at once. If the server refuses, the previous
 * state comes back; if it answers, its count replaces the guess. The caller must not start a second toggle while one is
 * running (`isPending`), so answers cannot arrive out of order.
 */
export function useChapterVote(chapterId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  const key = readerKeys.vote(chapterId, userId);

  const state = useQuery<VoteState, AppError>({
    queryKey: key,
    queryFn: () => getChapterVote(getClient(), chapterId, userId).catch((e: unknown) => Promise.reject(toAppError(e))),
    // The session is still being read: asking now would cache a guest answer under the wrong key.
    enabled: auth.status !== "loading",
  });

  const toggle = useMutation<number, AppError, boolean, { previous: VoteState | undefined }>({
    mutationFn: async (voted) => {
      try {
        return await setChapterVote(getClient(), chapterId, voted);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (voted) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<VoteState>(key);
      if (previous) queryClient.setQueryData<VoteState>(key, withVote(previous, voted));
      return { previous };
    },
    onError: (_error, _voted, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (votes, voted) => queryClient.setQueryData<VoteState>(key, settledVote(voted, votes)),
  });

  return { state, toggle, signedIn: userId !== null, loadingSession: auth.status === "loading" };
}
