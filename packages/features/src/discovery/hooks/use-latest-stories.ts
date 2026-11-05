"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import { useShowMature } from "../../adult-content/index.ts";
import { toAppError } from "../../_shared/errors.ts";
import { countLatestStories, listPopularTags, type StoryPage } from "../api/discovery.api.ts";
import { discoveryKeys, type LatestStoriesFilter } from "../keys.ts";
import type { Category } from "../model/categories.ts";
import { POPULAR_TAGS_LIMIT, type PopularTag } from "../model/popular-tags.ts";
import { categoriesQueryOptions, latestStoriesQueryOptions } from "../queries.ts";

export function useCategories() {
  const getClient = useDataClientGetter();
  return useQuery<Category[], AppError>(categoriesQueryOptions(getClient));
}

/** Infinite feed of the latest stories. Waits for `categories` only when a category filter is active. */
export function useLatestStories(filterWanted: LatestStoriesFilter, categories: readonly Category[] | undefined) {
  const getClient = useDataClientGetter();
  // Adult stories are in the feed only when the reader chose to see them: the choice is not the caller's to make.
  const showMature = useShowMature();
  const filter: LatestStoriesFilter = { ...filterWanted, includeMature: showMature };
  const needsCategories = Boolean(filter.categorySlug);
  return useInfiniteQuery<
    StoryPage,
    AppError,
    { pages: StoryPage[]; pageParams: (string | null)[] },
    ReturnType<typeof discoveryKeys.latest>,
    string | null
  >({
    ...latestStoriesQueryOptions(getClient, filter, categories ?? []),
    enabled: !needsCategories || categories !== undefined,
  });
}

const COUNT_STALE_MS = 60_000;

/**
 * How many stories a filter would list (head-only count on the feed's query). `enabled` keeps it idle until it is
 * needed (the filter sheet is open, the feed came back empty). Like the feed, it waits for the category tree.
 */
export function useStoryCount(
  filterWanted: LatestStoriesFilter,
  categories: readonly Category[] | undefined,
  enabled = true,
) {
  const getClient = useDataClientGetter();
  const showMature = useShowMature();
  const filter: LatestStoriesFilter = { ...filterWanted, includeMature: showMature };
  const needsCategories = Boolean(filter.categorySlug);
  return useQuery<number, AppError>({
    queryKey: discoveryKeys.count(filter),
    queryFn: () =>
      countLatestStories(getClient(), { ...filter, categories: categories ?? [] }).catch((error: unknown) =>
        Promise.reject(toAppError(error)),
      ),
    enabled: enabled && (!needsCategories || categories !== undefined),
    staleTime: COUNT_STALE_MS,
    // Keep the last number while the next filter is being counted, so the button does not flash back to "counting".
    placeholderData: keepPreviousData,
  });
}

const POPULAR_TAGS_STALE_MS = 5 * 60_000;

/** Quick tag filters for the home page. Failing quietly is fine: the feed works without them. */
export function usePopularTags(limit: number = POPULAR_TAGS_LIMIT) {
  const getClient = useDataClientGetter();
  return useQuery<PopularTag[], AppError>({
    queryKey: discoveryKeys.popularTags(limit),
    queryFn: () => listPopularTags(getClient(), limit).catch((error: unknown) => Promise.reject(toAppError(error))),
    staleTime: POPULAR_TAGS_STALE_MS,
  });
}
