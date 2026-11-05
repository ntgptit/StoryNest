"use client";

import { BookOpen, Heart } from "lucide-react";
import { excerpt, formatCount } from "@storynest/utils";
import { Badge } from "@storynest/ui/components/badge";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { FeaturedCarousel } from "@storynest/ui/widgets/featured-carousel";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { AppLink } from "../../_shared/platform.tsx";
import { discoveryText, statusLabel, storyHref } from "../../discovery/index.ts";
import { useTopStories } from "../hooks/use-ranking.ts";
import { rankingHref, type RankedStory } from "../model/ranking.ts";
import { rankingText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = rankingText.featured;
/** How many of the week's top stories the home page features. */
export const FEATURED_COUNT = 5;

/**
 * The home page's featured row: the week's top stories from the ranking (no separate "featured" data), one large
 * slide at a time that moves on by itself (FeaturedCarousel). Nothing while it fails or when the ranking is empty.
 */
export function FeaturedStories({
  locale = currentLocale(),
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const ranking = useTopStories("week");
  if (ranking.isPending) return <Skeleton className="h-56 w-full rounded-2xl sm:h-64" aria-hidden />;
  const items = (ranking.data?.pages[0]?.items ?? []).slice(0, FEATURED_COUNT);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <FeaturedCarousel
        title={t.title}
        labels={{
          pause: t.pause,
          play: t.play,
          dots: t.dots,
          slide: (index, count) => t.slide(index + 1, count, items[index]?.story.title ?? ""),
        }}
      >
        {items.map((item) => (
          <FeaturedSlide key={item.story.id} item={item} locale={locale} coverUrlFor={coverUrlFor} />
        ))}
      </FeaturedCarousel>
      <AppLink
        href={rankingHref("week")}
        className="self-end text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t.seeAll}
      </AppLink>
    </div>
  );
}

function FeaturedSlide({
  item,
  locale,
  coverUrlFor,
}: {
  item: RankedStory;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const { story } = item;
  const coverUrl = story.coverStorageKey && coverUrlFor ? coverUrlFor(story.coverStorageKey) : null;
  return (
    <AppLink
      href={storyHref(story)}
      className="group flex gap-4 rounded-2xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:gap-6 sm:p-5"
    >
      <StoryCover title={story.title} coverUrl={coverUrl} className="w-28 shrink-0 self-start sm:w-36">
        <span className="absolute top-2 left-2 inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow">
          <span aria-hidden>{item.rank}</span>
          <span className="sr-only">{rankingText.rank(item.rank)}</span>
        </span>
      </StoryCover>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-balance group-hover:underline sm:text-xl">
          {story.title}
        </h3>
        <p className="truncate text-sm text-muted-foreground">{story.author.displayName}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {story.category ? <Badge variant="secondary">{story.category.name}</Badge> : null}
          <Badge variant="outline">{statusLabel(story.status)}</Badge>
          {story.isMature ? <Badge variant="destructive">{discoveryText.mature}</Badge> : null}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground sm:line-clamp-4">{excerpt(story.synopsis, 260)}</p>
        <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden />
            <span aria-hidden>{formatCount(item.reads, locale)}</span>
            <span className="sr-only">
              {rankingText.inPeriod(formatCount(item.reads, locale), formatCount(item.votes, locale))}
            </span>
          </span>
          <span className="inline-flex items-center gap-1" aria-hidden>
            <Heart className="size-3.5" />
            {formatCount(item.votes, locale)}
          </span>
        </div>
      </div>
    </AppLink>
  );
}
