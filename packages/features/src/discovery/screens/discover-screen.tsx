"use client";

import { Library } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { StoryCard } from "@storynest/ui/widgets/story-card";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { useCategories, useLatestStories } from "../hooks/use-latest-stories.ts";
import { rootCategories } from "../model/categories.ts";
import { toStoryCardData } from "../model/story-card.ts";
import { discoveryText } from "../strings.ts";
import { CategoryChips } from "./category-chips.tsx";
import { TagFilters } from "./tag-filters.tsx";
import { currentLocale } from "../../_shared/i18n.ts";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

/** Home feed: latest updated public stories, filterable by category (the filter lives in the URL as a link). */
export function DiscoverScreen({
  categorySlug,
  tagSlug,
  pageSize,
  locale = currentLocale(),
  coverUrlFor,
}: {
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
  pageSize?: number | undefined;
  locale?: string;
  /** Resolves a cover storage key to a public URL (the app knows the Supabase project URL). */
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const auth = useAuth();
  const categories = useCategories();
  const feed = useLatestStories({ categorySlug, tagSlug, pageSize }, categories.data);

  const stories = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const labels = {
    reads: discoveryText.card.reads,
    votes: discoveryText.card.votes,
    updated: discoveryText.card.updated,
  };
  const failed = feed.isError || (Boolean(categorySlug) && categories.isError);

  return (
    <section aria-labelledby="discover-title" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="discover-title" className="text-xl font-semibold tracking-tight">
          {discoveryText.title}
        </h2>
        <nav aria-label={discoveryText.shortcutsLabel} className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          {auth.status === "authenticated" ? (
            <AppLink href="/following" className="text-primary underline-offset-4 hover:underline">
              {discoveryText.seeFollowing}
            </AppLink>
          ) : null}
          <AppLink href="/ranking" className="text-primary underline-offset-4 hover:underline">
            {discoveryText.seeRanking}
          </AppLink>
        </nav>
      </div>

      {categories.data ? (
        <CategoryChips categories={rootCategories(categories.data)} activeSlug={categorySlug} tagSlug={tagSlug} />
      ) : (
        <Skeleton className="h-9 w-full max-w-md rounded-full" aria-hidden />
      )}

      <TagFilters categorySlug={categorySlug} tagSlug={tagSlug} />

      {failed && stories.length === 0 ? (
        <ErrorState
          title={discoveryText.error.title}
          description={discoveryText.error.description}
          retryLabel={discoveryText.error.retry}
          onRetry={() => {
            void categories.refetch();
            void feed.refetch();
          }}
        />
      ) : feed.isPending ? (
        <div className={GRID} aria-busy>
          {Array.from({ length: pageSize ?? 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={Library}
          title={tagSlug ? discoveryText.emptyTag.title : discoveryText.empty.title}
          description={tagSlug ? discoveryText.emptyTag.description : discoveryText.empty.description}
        />
      ) : (
        <div
          aria-busy={feed.isPlaceholderData || undefined}
          className={`transition-opacity ${feed.isPlaceholderData ? "opacity-60" : ""}`}
        >
          <InfiniteList
            items={stories}
            getKey={(story) => story.id}
            listClassName={GRID}
            renderItem={(story) => (
              <StoryCard
                story={toStoryCardData(story, coverUrlFor)}
                labels={labels}
                LinkComponent={AppLink}
                locale={locale}
              />
            )}
            // The previous filter's list is only a stand-in: never page it on behalf of the new filter.
            hasMore={feed.hasNextPage && !feed.isPlaceholderData}
            isLoadingMore={feed.isFetchingNextPage}
            onLoadMore={() => void feed.fetchNextPage()}
            loadMoreLabel={discoveryText.loadMore}
            loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
            endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{discoveryText.endOfList}</p>}
          />
          {feed.isError ? (
            <ErrorState
              title={discoveryText.error.title}
              retryLabel={discoveryText.error.retry}
              onRetry={() => void feed.fetchNextPage()}
              className="py-4"
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
