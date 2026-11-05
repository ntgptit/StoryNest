"use client";

import { Trophy } from "lucide-react";
import { formatCount, formatRelativeTime } from "@storynest/utils";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useNavigation } from "../../_shared/platform.tsx";
import { STORY_GRID as GRID, StoryTile } from "../../discovery/index.ts";
import { useRankingFreshness, useTopStories } from "../hooks/use-ranking.ts";
import { RANKING_PERIODS, rankingHref, type RankedStory, type RankingPeriod } from "../model/ranking.ts";
import { rankingText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = rankingText;

/** Top stories of a period. The period comes from the address, so each tab has its own link. */
export function RankingScreen({
  period,
  locale = currentLocale(),
  coverUrlFor,
}: {
  period: RankingPeriod;
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const navigation = useNavigation();
  const ranking = useTopStories(period);
  const freshness = useRankingFreshness();
  const items = ranking.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label={t.title} className="flex flex-col gap-4">
      <PageHeader title={t.title} description={t.description} />
      <Tabs value={period} onValueChange={(next) => navigation.replace(rankingHref(next as RankingPeriod))}>
        <TabsList aria-label={t.periodsLabel}>
          {RANKING_PERIODS.map((name) => (
            <TabsTrigger key={name} value={name}>
              {t.periods[name]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {freshness.data ? (
        <p className="text-xs text-muted-foreground">
          {t.updated(formatRelativeTime(freshness.data.refreshedAt, locale))}
        </p>
      ) : null}

      {ranking.isError && items.length === 0 ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => void ranking.refetch()}
        />
      ) : ranking.isPending ? (
        <div className={GRID} aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Trophy} title={t.empty.title} description={t.empty.description} />
      ) : (
        <InfiniteList
          items={items}
          getKey={(item) => item.story.id}
          listClassName={GRID}
          renderItem={(item) => <RankedCard item={item} locale={locale} coverUrlFor={coverUrlFor} />}
          revealAppended
          hasMore={ranking.hasNextPage}
          isLoadingMore={ranking.isFetchingNextPage}
          onLoadMore={() => void ranking.fetchNextPage()}
          loadMoreLabel={t.loadMore}
          loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
          endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{t.endOfList}</p>}
        />
      )}
    </section>
  );
}

function RankedCard({
  item,
  locale,
  coverUrlFor,
}: {
  item: RankedStory;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  return (
    <div className="relative flex h-full flex-col gap-1">
      <span
        aria-label={t.rank(item.rank)}
        className="absolute top-2 left-2 z-10 inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow"
      >
        {item.rank}
      </span>
      <StoryTile story={item.story} locale={locale} coverUrlFor={coverUrlFor} />
      <p className="px-1 text-xs text-muted-foreground">
        {t.inPeriod(formatCount(item.reads, locale), formatCount(item.votes, locale))}
      </p>
    </div>
  );
}
