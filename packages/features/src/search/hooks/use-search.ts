"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { useShowMature } from "../../adult-content/index.ts";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import type { StorySummary } from "../../discovery/index.ts";
import { searchAuthors, searchStories, searchTags, type OffsetPage } from "../api/search.api.ts";
import { searchKeys } from "../keys.ts";
import { SUGGESTION_COUNT, isSearchable, type AuthorHit, type TagHit } from "../model/search.ts";

const SUGGESTION_STALE_MS = 30_000;

/** The value after it has stopped changing for `delayMs`: keeps a request from going out on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type Pages<T> = { pages: OffsetPage<T>[]; pageParams: number[] };

export function useSearchStories(term: string) {
  const getClient = useDataClientGetter();
  const includeMature = useShowMature();
  return useInfiniteQuery<OffsetPage<StorySummary>, AppError, Pages<StorySummary>, readonly unknown[], number>({
    queryKey: searchKeys.stories(term, includeMature),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      searchStories(getClient(), term, { offset: pageParam, includeMature }).catch((e: unknown) =>
        Promise.reject(toAppError(e)),
      ),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: isSearchable(term),
  });
}

export function useSearchAuthors(term: string, enabled = true) {
  const getClient = useDataClientGetter();
  const includeMature = useShowMature();
  return useInfiniteQuery<OffsetPage<AuthorHit>, AppError, Pages<AuthorHit>, readonly unknown[], number>({
    queryKey: searchKeys.authors(term, includeMature),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      searchAuthors(getClient(), term, { offset: pageParam, includeMature }).catch((e: unknown) =>
        Promise.reject(toAppError(e)),
      ),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: enabled && isSearchable(term),
  });
}

export function useSearchTags(term: string, enabled = true) {
  const getClient = useDataClientGetter();
  return useQuery<TagHit[], AppError>({
    queryKey: searchKeys.tags(term),
    queryFn: () => searchTags(getClient(), term).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: enabled && isSearchable(term),
  });
}

/** The first few story matches for the box in the header. Keeps the previous list on screen while the next loads. */
export function useSuggestions(term: string) {
  const getClient = useDataClientGetter();
  const includeMature = useShowMature();
  return useQuery<StorySummary[], AppError>({
    queryKey: searchKeys.suggestions(term, includeMature),
    queryFn: () =>
      searchStories(getClient(), term, { pageSize: SUGGESTION_COUNT, includeMature })
        .then((page) => page.items)
        .catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: isSearchable(term),
    staleTime: SUGGESTION_STALE_MS,
    placeholderData: keepPreviousData,
  });
}
