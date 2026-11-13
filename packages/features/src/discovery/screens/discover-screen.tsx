"use client";

import { Library } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { STORY_GRID, StoryListFrame, StoryTile, useStoryView } from "../components/story-tile.tsx";
import { useCategories, useLatestStories } from "../hooks/use-latest-stories.ts";
import { rootCategories } from "../model/categories.ts";
import { discoveryText } from "../strings.ts";
import { CategoryChips } from "./category-chips.tsx";
import { DiscoverFilterBar } from "./filter-sheet.tsx";
import { LoosenFilters } from "./loosen-filters.tsx";
import { TagFilters } from "./tag-filters.tsx";
import { LengthFilter } from "./length-filter.tsx";
import { markReadSource } from "../../progress/index.ts";
import type { WordRange } from "../model/story-length.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * Home feed: latest updated public stories, filterable by category and tag (the filters live in the URL as links).
 * From `sm` up the filters are chip rows; on a phone they sit in a bottom sheet with a live result count. The grid
 * can be switched to a list (remembered in this browser).
 */
export function DiscoverScreen({
  categorySlug,
  tagSlug,
  words,
  pageSize,
  locale = currentLocale(),
  coverUrlFor,
}: {
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
  /** Story length range in words (the `words` address parameter). */
  words?: WordRange | undefined;
  pageSize?: number | undefined;
  locale?: string;
  /** Resolves a cover storage key to a public URL (the app knows the Supabase project URL). */
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const auth = useAuth();
  const categories = useCategories();
  const feed = useLatestStories({ categorySlug, tagSlug, words, pageSize }, categories.data);
  const storyView = useStoryView();

  const stories = feed.data?.pages.flatMap((page) => page.items) ?? [];
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

      {/* From sm up the category row follows the scroll, just under the header (Lucian 242), so switching category
          never needs a trip back to the top; the tag row stays in place. */}
      <div className="sticky top-below-header z-10 hidden bg-background/95 py-2 sm:-mx-6 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:block">
        {categories.data ? (
          <CategoryChips
            categories={rootCategories(categories.data)}
            activeSlug={categorySlug}
            tagSlug={tagSlug}
            words={words}
          />
        ) : (
          <Skeleton className="h-9 w-full max-w-md rounded-full" aria-hidden />
        )}
      </div>
      <TagFilters categorySlug={categorySlug} tagSlug={tagSlug} words={words} className="hidden sm:flex" />
      <LengthFilter
        key={words ? `${words.min}-${words.max ?? ""}` : "any"}
        categories={categories.data}
        categorySlug={categorySlug}
        tagSlug={tagSlug}
        words={words}
        locale={locale}
        className="hidden sm:flex"
      />

      <div className="flex items-center gap-2">
        <DiscoverFilterBar categories={categories.data} categorySlug={categorySlug} tagSlug={tagSlug} words={words} />
        <div className="ml-auto">{storyView.toggle}</div>
      </div>

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
        <div className={STORY_GRID} aria-busy>
          {Array.from({ length: pageSize ?? 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={Library}
          title={tagSlug ? discoveryText.emptyTag.title : discoveryText.empty.title}
          description={tagSlug ? discoveryText.emptyTag.description : discoveryText.empty.description}
          action={
            <LoosenFilters
              categories={categories.data}
              categorySlug={categorySlug}
              tagSlug={tagSlug}
              words={words}
              locale={locale}
            />
          }
        />
      ) : (
        <>
          {/* A story opened from the feed is a read from Discover (an in-app source, see markReadSource). */}
          <div className="contents" onClickCapture={() => markReadSource("discover")}>
            <StoryListFrame frameRef={storyView.containerRef}>
              <InfiniteList
                items={stories}
                getKey={(story) => story.id}
                listClassName={storyView.listClassName}
                renderItem={(story) => (
                  <StoryTile story={story} locale={locale} coverUrlFor={coverUrlFor} variant={storyView.view} />
                )}
                revealAppended
                hasMore={feed.hasNextPage}
                isLoadingMore={feed.isFetchingNextPage}
                onLoadMore={() => void feed.fetchNextPage()}
                loadMoreLabel={discoveryText.loadMore}
                loadError={
                  feed.isError ? { title: discoveryText.error.title, retryLabel: discoveryText.error.retry } : undefined
                }
                loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
                endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{discoveryText.endOfList}</p>}
              />
            </StoryListFrame>
          </div>
        </>
      )}
    </section>
  );
}
