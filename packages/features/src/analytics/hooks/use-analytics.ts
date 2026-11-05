"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import {
  getChapterStats,
  getCommentTerms,
  getDailyRange,
  getDailyStats,
  getReaderCohorts,
  getReaderSplit,
  getReadSources,
} from "../api/analytics.api.ts";
import type { Cohort, DayRange, ReaderSplit, ReadSources, TermMonth } from "../model/insights.ts";
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
    // Keep the previous range on screen while the next one loads, so the chart morphs instead of blinking out.
    placeholderData: keepPreviousData,
  });
}

/**
 * The daily series of either the last `days` days or, when `range` is given, that range of UTC days. One query at a
 * time, so the totals and the chart follow whichever the author picked.
 */
export function useDailySeries(storyId: string, days: number, range: DayRange | null) {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  const viewer = userId ?? "none";
  return useQuery<DailyPoint[], AppError>({
    queryKey: range
      ? analyticsKeys.dailyRange(viewer, storyId, range.from, range.to)
      : analyticsKeys.daily(viewer, storyId, days),
    queryFn: () =>
      (range ? getDailyRange(getClient(), storyId, range) : getDailyStats(getClient(), storyId, days)).catch(
        (e: unknown) => Promise.reject(toAppError(e)),
      ),
    enabled: userId !== null,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/** Insight queries share their shape: the viewer in the key, nothing before sign-in, no retry of a refusal. */
function useInsight<T>(key: (viewer: string) => readonly unknown[], load: () => Promise<T>) {
  const userId = useUserId();
  return useQuery<T, AppError>({
    queryKey: key(userId ?? "none"),
    queryFn: () => load().catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useReaderCohorts(storyId: string, weeks: number) {
  const getClient = useDataClientGetter();
  return useInsight<Cohort[]>(
    (viewer) => analyticsKeys.cohorts(viewer, storyId, weeks),
    () => getReaderCohorts(getClient(), storyId, weeks),
  );
}

export function useReaderSplit(storyId: string, days: number) {
  const getClient = useDataClientGetter();
  return useInsight<ReaderSplit>(
    (viewer) => analyticsKeys.split(viewer, storyId, days),
    () => getReaderSplit(getClient(), storyId, days),
  );
}

export function useCommentTerms(storyId: string, months: number) {
  const getClient = useDataClientGetter();
  return useInsight<TermMonth[]>(
    (viewer) => analyticsKeys.terms(viewer, storyId, months),
    () => getCommentTerms(getClient(), storyId, months),
  );
}

export function useReadSources(storyId: string, days: number) {
  const getClient = useDataClientGetter();
  return useInsight<ReadSources>(
    (viewer) => analyticsKeys.sources(viewer, storyId, days),
    () => getReadSources(getClient(), storyId, days),
  );
}
