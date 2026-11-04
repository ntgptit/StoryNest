import { excerpt, formatCount, formatRelativeTime } from "@storynest/utils";
import { BookOpen, Heart } from "lucide-react";

import { Badge } from "../components/badge.tsx";
import { cn } from "../lib/utils.ts";
import type { NavLinkComponent } from "./bottom-nav.tsx";
import { StoryCover } from "./story-cover.tsx";

export interface StoryCardData {
  href: string;
  title: string;
  authorName: string;
  synopsis: string;
  coverUrl?: string | null;
  categoryName?: string | null;
  /** Already translated, e.g. "Đang ra". */
  statusLabel: string;
  /** Shown as a badge when set, e.g. "18+". */
  matureLabel?: string | null;
  reads: number;
  votes: number;
  updatedAt: string;
}

export interface StoryCardLabels {
  reads: string;
  votes: string;
  /** Receives the relative time ("3 giờ trước") and returns the full phrase ("Cập nhật 3 giờ trước"). */
  updated: (relative: string) => string;
}

/**
 * Story tile for lists and grids: cover, title, author, category and status, a short synopsis and counters.
 * The whole card is one link (the app injects its router link, like BottomNav). Presentation only.
 */
export function StoryCard({
  story,
  labels,
  LinkComponent,
  locale = "vi",
  now,
  className,
}: {
  story: StoryCardData;
  labels: StoryCardLabels;
  LinkComponent: NavLinkComponent;
  locale?: string;
  /** Injectable clock for the "updated" phrase (tests). */
  now?: Date;
  className?: string;
}) {
  return (
    <LinkComponent
      href={story.href}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border bg-card p-3 text-card-foreground transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <StoryCover title={story.title} coverUrl={story.coverUrl}>
        {story.matureLabel ? (
          <Badge variant="destructive" className="absolute top-2 left-2">
            {story.matureLabel}
          </Badge>
        ) : null}
      </StoryCover>

      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">{story.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{story.authorName}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {story.categoryName ? <Badge variant="secondary">{story.categoryName}</Badge> : null}
          <Badge variant="outline">{story.statusLabel}</Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{excerpt(story.synopsis, 120)}</p>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title={labels.reads}>
          <BookOpen className="size-3.5" aria-hidden />
          <span aria-hidden>{formatCount(story.reads, locale)}</span>
          <span className="sr-only">{`${labels.reads}: ${formatCount(story.reads, locale)}`}</span>
        </span>
        <span className="inline-flex items-center gap-1" title={labels.votes}>
          <Heart className="size-3.5" aria-hidden />
          <span aria-hidden>{formatCount(story.votes, locale)}</span>
          <span className="sr-only">{`${labels.votes}: ${formatCount(story.votes, locale)}`}</span>
        </span>
      </div>
      <p className="text-[0.7rem] text-muted-foreground">
        {labels.updated(formatRelativeTime(story.updatedAt, locale, now))}
      </p>
    </LinkComponent>
  );
}
