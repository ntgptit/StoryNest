"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getChapterStats, getDailyStats } from "../api/analytics.api.ts";
import { analyticsKeys } from "../keys.ts";
import type { ChapterStat, DailyPoint } from "../model/stats.ts";

function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.user.id : null;
}

export function useChapterStats(storyId: string) {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<ChapterStat[], AppError>({
    queryKey: analyticsKeys.chapters(userId ?? "none", storyId),
    queryFn: () => getChapterStats(getClient(), storyId).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
    retry: false,
  });
}

export function useDailyStats(storyId: string, days: number) {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<DailyPoint[], AppError>({
    queryKey: analyticsKeys.daily(userId ?? "none", storyId, days),
    queryFn: () => getDailyStats(getClient(), storyId, days).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
    retry: false,
  });
}
