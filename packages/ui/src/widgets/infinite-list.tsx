"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/**
 * Cursor-paginated list: loads the next page when the bottom sentinel nears the viewport. It never calls
 * `onLoadMore` while a page is loading or when nothing is left, so a fast scroll cannot double-fetch.
 * A visible "load more" button (pass `loadMoreLabel`) keeps the list usable by keyboard and without
 * IntersectionObserver.
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
  endMessage,
  className,
  listClassName,
}: {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadingFallback?: ReactNode;
  loadMoreLabel?: string;
  endMessage?: ReactNode;
  className?: string;
  /** Classes of the <ul>; defaults to a vertical stack. Pass grid classes for a card grid. */
  listClassName?: string;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const latest = useRef({ hasMore, isLoadingMore, onLoadMore });
  latest.current = { hasMore, isLoadingMore, onLoadMore };

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const { hasMore: more, isLoadingMore: loading, onLoadMore: load } = latest.current;
        if (entries.some((e) => e.isIntersecting) && more && !loading) load();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length]); // re-observe after each page so a still-visible sentinel triggers the next load

  return (
    <div className={className}>
      <ul className={cn("flex flex-col", listClassName)}>
        {items.map((item, index) => (
          <li key={getKey(item)}>{renderItem(item, index)}</li>
        ))}
      </ul>
      {isLoadingMore ? loadingFallback : null}
      {hasMore ? (
        <div ref={sentinel} className="flex justify-center py-4">
          {loadMoreLabel && !isLoadingMore ? (
            <Button variant="outline" onClick={onLoadMore}>
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
