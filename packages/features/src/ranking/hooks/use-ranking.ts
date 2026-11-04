"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { useShowMature } from "../../adult-content/index.ts";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getRankingFreshness, listTopStories, type RankingPage } from "../api/ranking.api.ts";
import { rankingKeys } from "../keys.ts";
import type { RankingFreshness, RankingPeriod } from "../model/ranking.ts";

const FRESHNESS_STALE_MS = 60_000;

export function useTopStories(period: RankingPeriod) {
  const getClient = useDataClientGetter();
  const includeMature = useShowMature();
  return useInfiniteQuery<
    RankingPage,
    AppError,
    { pages: RankingPage[]; pageParams: number[] },
    readonly unknown[],
    number
  >({
    queryKey: rankingKeys.top(period, includeMature),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listTopStories(getClient(), period, { offset: pageParam, includeMature }).catch((e: unknown) =>
        Promise.reject(toAppError(e)),
      ),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
}

/** When the ranking was last refreshed. Failing quietly is fine: the ranking works without the note. */
export function useRankingFreshness() {
  const getClient = useDataClientGetter();
  return useQuery<RankingFreshness | null, AppError>({
    queryKey: rankingKeys.freshness(),
    queryFn: () => getRankingFreshness(getClient()).catch((e: unknown) => Promise.reject(toAppError(e))),
    staleTime: FRESHNESS_STALE_MS,
  });
}
