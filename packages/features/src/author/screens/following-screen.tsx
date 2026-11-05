"use client";

import { Users } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { STORY_GRID as GRID, StoryTile } from "../../discovery/index.ts";
import { useFollowedStories } from "../hooks/use-author.ts";
import { authorText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = authorText;

/** Stories updated by the authors the signed-in reader follows, newest first. */
export function FollowingScreen({
  locale = currentLocale(),
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const feed = useFollowedStories();
  const stories = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label={t.feed.title} className="flex flex-col gap-4">
      <PageHeader title={t.feed.title} description={t.feed.description} />
      {feed.isError && stories.length === 0 ? (
        <ErrorState
          title={t.feed.error.title}
          description={t.feed.error.description}
          retryLabel={t.feed.error.retry}
          onRetry={() => void feed.refetch()}
        />
      ) : feed.isPending ? (
        <div className={GRID} aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <EmptyState icon={Users} title={t.feed.empty.title} description={t.feed.empty.description} />
      ) : (
        <InfiniteList
          items={stories}
          getKey={(story) => story.id}
          listClassName={GRID}
          renderItem={(story) => <StoryTile story={story} locale={locale} coverUrlFor={coverUrlFor} />}
          revealAppended
          hasMore={feed.hasNextPage}
          isLoadingMore={feed.isFetchingNextPage}
          onLoadMore={() => void feed.fetchNextPage()}
          loadMoreLabel={t.loadMore}
          loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
          endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{t.endOfList}</p>}
        />
      )}
    </section>
  );
}
