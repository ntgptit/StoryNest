"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getStoryRating, setStoryRating } from "../api/rating.api.ts";
import { storyKeys } from "../keys.ts";
import { EMPTY_RATING, type StoryRating } from "../model/rating.ts";

/**
 * The story's rating summary and mine, with a setter that shows my stars at once; the server's summary replaces the
 * guess and a refusal (own story, not read yet) puts the previous state back.
 */
export function useStoryRating(storyId: string) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  const key = storyKeys.rating(storyId, userId);

  const state = useQuery<StoryRating, AppError>({
    queryKey: key,
    queryFn: () => getStoryRating(getClient(), storyId).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: auth.status !== "loading",
  });

  const rate = useMutation<StoryRating, AppError, number | null, { previous: StoryRating | undefined }>({
    mutationFn: async (stars) => {
      try {
        return await setStoryRating(getClient(), storyId, stars, queryClient.getQueryData(key) ?? EMPTY_RATING);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (stars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<StoryRating>(key);
      if (previous) queryClient.setQueryData<StoryRating>(key, { ...previous, mine: stars });
      return { previous };
    },
    onError: (_error, _stars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (next) => queryClient.setQueryData(key, next),
  });

  return { state, rate, signedIn: userId !== null };
}
