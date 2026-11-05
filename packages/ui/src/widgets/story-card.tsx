"use client";

import { excerpt, formatCount, formatRelativeTime } from "@storynest/utils";
import { BookOpen, Heart } from "lucide-react";
import { useRef, type AnchorHTMLAttributes, type ComponentType, type MouseEvent } from "react";

import { Badge } from "../components/badge.tsx";
import { FLIP_KEY_ATTRIBUTE } from "../lib/use-flip.ts";
import { cn } from "../lib/utils.ts";
import { morphCoverInto } from "../lib/view-transition.ts";
import { StoryCover } from "./story-cover.tsx";
import { useLongPress } from "./story-peek-sheet.tsx";

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

/** The app's router link (next/link on web). Event handlers are passed through to the anchor. */
export type StoryLinkComponent = ComponentType<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>;

/** `grid`: a cover tile. `list`: a row with a small cover and more room for the synopsis (Lucian 308). */
export type StoryCardVariant = "grid" | "list";

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * Story tile for lists and grids: cover, title, author, category and status, a short synopsis and counters.
 * The whole card is one link (the app injects its router link, like BottomNav). Presentation only.
 *
 * - `onNavigate`: when given, a plain click opens the story inside a view transition in which the cover grows into
 *   the story page's cover (Lucian 328, see lib/view-transition.ts); without support it is an ordinary link.
 * - `onPeek`: when given, a long-press (touch) or the context menu opens a quick look (Lucian 358, StoryPeekSheet);
 *   a short tap still opens the story.
 * - The cover carries a FLIP key (the href), so a grid/list switch can morph it (lib/use-flip.ts).
 */
export function StoryCard({
  story,
  labels,
  LinkComponent,
  locale = "vi",
  now,
  variant = "grid",
  onNavigate,
  onPeek,
  className,
}: {
  story: StoryCardData;
  labels: StoryCardLabels;
  LinkComponent: StoryLinkComponent;
  locale?: string;
  /** Injectable clock for the "updated" phrase (tests). */
  now?: Date;
  variant?: StoryCardVariant;
  onNavigate?: ((href: string) => void) | undefined;
  onPeek?: (() => void) | undefined;
  className?: string;
}) {
  const coverRef = useRef<HTMLDivElement>(null);
  const press = useLongPress(onPeek);
  const list = variant === "list";

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (press.consumeClick()) {
      event.preventDefault();
      return;
    }
    if (!onNavigate || event.defaultPrevented || !isPlainClick(event) || !coverRef.current) return;
    if (morphCoverInto(coverRef.current, () => onNavigate(story.href))) event.preventDefault();
  };

  const counters = (
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
  );
  const updated = (
    <p className="text-[0.7rem] text-muted-foreground">
      {labels.updated(formatRelativeTime(story.updatedAt, locale, now))}
    </p>
  );

  return (
    <LinkComponent
      href={story.href}
      data-variant={variant}
      onClick={onClick}
      {...press.handlers}
      className={cn(
        "group flex h-full rounded-xl border bg-card p-3 text-card-foreground transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        list ? "flex-row gap-3" : "flex-col gap-3",
        // A long-press opens the peek, not the browser's link preview or a text selection.
        onPeek && "[-webkit-touch-callout:none] select-none",
        className,
      )}
    >
      <div
        ref={coverRef}
        {...{ [FLIP_KEY_ATTRIBUTE]: story.href }}
        className={cn("relative", list ? "w-20 shrink-0 self-start sm:w-24" : "w-full")}
      >
        <StoryCover title={story.title} coverUrl={story.coverUrl}>
          {story.matureLabel ? (
            <Badge variant="destructive" className={cn("absolute", list ? "top-1 left-1" : "top-2 left-2")}>
              {story.matureLabel}
            </Badge>
          ) : null}
        </StoryCover>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 group-data-[morphing=true]/stories:motion-safe:animate-morph-fade">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:underline">{story.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{story.authorName}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {story.categoryName ? <Badge variant="secondary">{story.categoryName}</Badge> : null}
          <Badge variant="outline">{story.statusLabel}</Badge>
        </div>
        <p className={cn("text-xs text-muted-foreground", list ? "line-clamp-3" : "line-clamp-2")}>
          {excerpt(story.synopsis, list ? 240 : 120)}
        </p>
        {list ? (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
            {counters}
            {updated}
          </div>
        ) : null}
      </div>

      {list ? null : (
        <div className="flex flex-col gap-3 group-data-[morphing=true]/stories:motion-safe:animate-morph-fade">
          {counters}
          {updated}
        </div>
      )}
    </LinkComponent>
  );
}
