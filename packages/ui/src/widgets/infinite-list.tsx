/* Lucian UX/UI Prompt #251 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#251 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { ErrorState } from "./error-state.tsx";
import { cn } from "../lib/utils.ts";

/**
 * Cursor-paginated list: loads the next page when the bottom sentinel nears the viewport. It never calls
 * `onLoadMore` while a page is loading or when nothing is left, so a fast scroll cannot double-fetch.
 * A visible "load more" button (pass `loadMoreLabel`) keeps the list usable by keyboard and without
 * IntersectionObserver.
 *
 * With `revealAppended`, the items of a page that "load more" brought in rise in a short stagger apart (Lucian 251),
 * so the reader notices where the new results start. Only those: never the first page, never a list that was
 * replaced (a new filter) or refreshed in place, and never again on scrolling back (the animation runs once, when the
 * item mounts). It is decorative, so it only runs when motion is allowed.
 */
export function InfiniteList<T>({
  items,
  getKey,
  renderItem,
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadingFallback,
  loadMoreLabel,
  loadError,
  endMessage,
  className,
  listClassName,
  listLabel,
  revealAppended = false,
}: {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadingFallback?: ReactNode;
  loadMoreLabel?: string;
  /**
   * Set when loading the next page failed: the items already shown stay, and an inline error with a retry button
   * (which calls `onLoadMore`) replaces the sentinel, so nothing retries on its own.
   */
  loadError?: { title: string; retryLabel: string } | undefined;
  endMessage?: ReactNode;
  className?: string;
  /** Classes of the <ul>; defaults to a vertical stack. Pass grid classes for a card grid. */
  listClassName?: string;
  /** Accessible name of the <ul>. */
  listLabel?: string;
  /** Let the items of each page loaded later rise in (see above). */
  revealAppended?: boolean;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  // Whether a next page was asked for since the items last changed: only then do new items count as appended.
  const [asked, setAsked] = useState(false);
  const loadMore = () => {
    setAsked(true);
    onLoadMore();
  };
  const failed = loadError !== undefined;
  const latest = useRef({ hasMore, isLoadingMore, onLoadMore: loadMore, failed });
  latest.current = { hasMore, isLoadingMore, onLoadMore: loadMore, failed };

  // "Adjust state while rendering": the keys of the items that came in with a later page, each with its place in the
  // stagger. They keep it while mounted (the animation only runs on mount, so it never replays), and the map starts
  // over when the list is replaced or refreshed instead of extended.
  const [count, setCount] = useState(items.length);
  const [rising, setRising] = useState<ReadonlyMap<string, number>>(() => new Map());
  if (items.length !== count) {
    setCount(items.length);
    setAsked(false);
    if (revealAppended && asked && count > 0 && items.length > count) {
      const next = new Map(rising);
      items.slice(count).forEach((item, offset) => next.set(getKey(item), offset));
      setRising(next);
    } else if (rising.size > 0) {
      setRising(new Map());
    }
  }

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const { hasMore: more, isLoadingMore: loading, onLoadMore: load } = latest.current;
        if (entries.some((e) => e.isIntersecting) && more && !loading && !latest.current.failed) load();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length]); // re-observe after each page so a still-visible sentinel triggers the next load

  return (
    <div className={className}>
      <ul aria-label={listLabel} className={cn("flex flex-col", listClassName)}>
        {items.map((item, index) => {
          const key = getKey(item);
          const place = rising.get(key);
          // 60 ms apart, capped so a big page does not keep its last cards waiting.
          const style: CSSProperties | undefined =
            place === undefined ? undefined : { animationDelay: `${Math.min(place, 7) * 60}ms` };
          return (
            <li key={key} className={place === undefined ? undefined : "motion-safe:animate-card-rise"} style={style}>
              {renderItem(item, index)}
            </li>
          );
        })}
      </ul>
      {isLoadingMore ? loadingFallback : null}
      {loadError && !isLoadingMore ? (
        <ErrorState title={loadError.title} retryLabel={loadError.retryLabel} onRetry={loadMore} className="py-4" />
      ) : null}
      {hasMore && !loadError ? (
        <div ref={sentinel} className="flex justify-center py-4">
          {loadMoreLabel && !isLoadingMore ? (
            <Button variant="outline" onClick={loadMore}>
              {loadMoreLabel}
            </Button>
          ) : null}
        </div>
      ) : (
        endMessage
      )}
    </div>
  );
}
