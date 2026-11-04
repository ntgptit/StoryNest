"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { listRecommendedForMe, listSimilarStories } from "../api/recommendations.api.ts";
import { recommendationKeys } from "../keys.ts";
import type { Recommendation } from "../model/recommendation.ts";

const STALE_MS = 5 * 60_000;

/** Stories like this one. Recommendations are a nicety: callers show nothing while loading or when this fails. */
export function useSimilarStories(storyId: string) {
  const getClient = useDataClientGetter();
  return useQuery<Recommendation[], AppError>({
    queryKey: recommendationKeys.similar(storyId),
    queryFn: () => listSimilarStories(getClient(), storyId).catch((e: unknown) => Promise.reject(toAppError(e))),
    staleTime: STALE_MS,
  });
}

/** Personal recommendations of the signed-in reader (idle for a guest). */
export function useRecommendedForMe() {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useQuery<Recommendation[], AppError>({
    queryKey: recommendationKeys.forMe(userId ?? "none"),
    queryFn: () => listRecommendedForMe(getClient()).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
    staleTime: STALE_MS,
  });
}
