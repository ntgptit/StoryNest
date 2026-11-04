// NO "use client" in this module on purpose: the home page calls prefetchDiscovery() from a Server Component, and
// Next refuses to call anything exported from a module marked "use client". The hooks (hooks/use-latest-stories.ts)
// are the client side and import their query options from here, so server prefetch and client hooks share keys.
import type { QueryClient } from "@tanstack/react-query";
import type { DataClient } from "../_shared/client.ts";
import { toAppError } from "../_shared/errors.ts";
import { listCategories, listLatestStories, type StoryPage } from "./api/discovery.api.ts";
import { discoveryKeys, type LatestStoriesFilter } from "./keys.ts";
import type { Category } from "./model/categories.ts";

const CATEGORIES_STALE_MS = 10 * 60_000; // the category tree changes rarely

export function categoriesQueryOptions(getClient: () => DataClient) {
  return {
    queryKey: discoveryKeys.categories(),
    queryFn: () => listCategories(getClient()).catch((error: unknown) => Promise.reject(toAppError(error))),
    staleTime: CATEGORIES_STALE_MS,
  };
}

export function latestStoriesQueryOptions(
  getClient: () => DataClient,
  filter: LatestStoriesFilter,
  categories: readonly Category[],
) {
  return {
    queryKey: discoveryKeys.latest(filter),
    queryFn: ({ pageParam }: { pageParam: string | null }): Promise<StoryPage> =>
      listLatestStories(getClient(), { ...filter, cursor: pageParam, categories }).catch((error: unknown) =>
        Promise.reject(toAppError(error)),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last: StoryPage) => last.nextCursor,
  };
}

/**
 * Server-side prefetch of the first page (and the category tree) so the home page is rendered with content for
 * crawlers and first paint. The keys equal the client hooks' keys, so hydration finds the data.
 * Like useLatestStories, the feed waits for the category tree only when a category filter needs expanding; otherwise
 * both queries run in parallel (one round trip instead of two on every visit to the unfiltered home page).
 */
export async function prefetchDiscovery(
  queryClient: QueryClient,
  client: DataClient,
  filter: LatestStoriesFilter,
): Promise<void> {
  const getClient = () => client;
  const categoriesLoaded = queryClient.prefetchQuery(categoriesQueryOptions(getClient));
  if (filter.categorySlug) await categoriesLoaded;
  const categories = queryClient.getQueryData<Category[]>(discoveryKeys.categories()) ?? [];
  await Promise.all([
    categoriesLoaded,
    queryClient.prefetchInfiniteQuery(latestStoriesQueryOptions(getClient, filter, categories)),
  ]);
}
