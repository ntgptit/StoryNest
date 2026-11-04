"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDataClientGetter } from "../../_shared/data.tsx";
import type { AppError } from "../../_shared/errors.ts";
import type { StoryPage } from "../api/discovery.api.ts";
import { discoveryKeys, type LatestStoriesFilter } from "../keys.ts";
import type { Category } from "../model/categories.ts";
import { categoriesQueryOptions, latestStoriesQueryOptions } from "../queries.ts";

export function useCategories() {
  const getClient = useDataClientGetter();
  return useQuery<Category[], AppError>(categoriesQueryOptions(getClient));
}

/** Infinite feed of the latest stories. Waits for `categories` only when a category filter is active. */
export function useLatestStories(filter: LatestStoriesFilter, categories: readonly Category[] | undefined) {
  const getClient = useDataClientGetter();
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
