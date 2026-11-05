/* Lucian UX/UI Prompt #358 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#358 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { excerpt, formatCount } from "@storynest/utils";
import { BookOpen, Heart, X } from "lucide-react";
import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";

import { Badge } from "../components/badge.tsx";
import { buttonVariants } from "../components/button.tsx";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/sheet.tsx";
import { cn } from "../lib/utils.ts";
import type { StoryCardData, StoryLinkComponent } from "./story-card.tsx";
import { StoryCover } from "./story-cover.tsx";

/** How long a finger must rest on a card before the peek opens (the element's 480ms). */
export const LONG_PRESS_MS = 480;
/** Moving further than this cancels the press: the finger is scrolling or swiping. */
const MOVE_TOLERANCE = 10;

/**
 * Long-press on touch, or the context menu (right click, the Menu key, Shift+F10, Android's long-press), calls `onPeek`.
 * A short tap stays a tap. After a long-press the click that follows is swallowed (`consumeClick`), so lifting the
 * finger does not also open the link. Without `onPeek` the handlers do nothing.
 */
export function useLongPress(onPeek: (() => void) | undefined) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  /** The press opened the peek: swallow the click that follows. */
  const fired = useRef(false);
  const openedAt = useRef(0);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const open = () => {
    cancel();
    openedAt.current = Date.now();
    onPeek?.();
  };

  return {
    handlers: onPeek
      ? {
          onPointerDown: (event: PointerEvent<HTMLElement>) => {
            fired.current = false;
            if (event.pointerType !== "touch" || !event.isPrimary) return;
            start.current = { x: event.clientX, y: event.clientY };
            timer.current = window.setTimeout(() => {
              fired.current = true;
              open();
            }, LONG_PRESS_MS);
          },
          onPointerMove: (event: PointerEvent<HTMLElement>) => {
            const from = start.current;
            if (!from) return;
            if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > MOVE_TOLERANCE) cancel();
          },
          onPointerUp: cancel,
          onPointerCancel: cancel,
          onContextMenu: (event: MouseEvent<HTMLElement>) => {
            event.preventDefault();
            // On Android the timer and the native long-press menu both fire: open once.
            if (Date.now() - openedAt.current < 1000) return;
            open();
          },
        }
      : {},
    /** True (once) when the click being handled ends a long-press and must not navigate. */
    consumeClick: () => {
      const swallow = fired.current;
      fired.current = false;
      return swallow;
    },
  };
}

export interface StoryPeekLabels {
  reads: string;
  votes: string;
  /** "Open story". */
  open: string;
  /** Accessible name of the close button. */
  close: string;
}

/**
 * Quick look at a story from a list without leaving it (Lucian 358): cover, title, author, badges, the synopsis and
 * the counters, the actions the caller passes (follow, save, add to a list) and a link to the story. A bottom sheet
 * on phones, a centred card from `sm` up; Escape, the backdrop or the close button dismiss it and focus goes back.
 */
export function StoryPeekSheet({
  story,
  open,
  onOpenChange,
  labels,
  LinkComponent,
  actions,
  locale = "vi",
}: {
  story: StoryCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: StoryPeekLabels;
  LinkComponent: StoryLinkComponent;
  actions?: ReactNode;
  locale?: string;
}) {
  return (
    <Sheet open={open && story !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[85dvh] w-full max-w-lg gap-0 overflow-y-auto rounded-t-2xl pb-safe sm:bottom-6 sm:rounded-2xl sm:border"
      >
        <SheetClose
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute top-2 right-2 rounded-full")}
          aria-label={labels.close}
        >
          <X aria-hidden />
        </SheetClose>
        {story ? (
          <div className="flex flex-col gap-4 p-4 motion-safe:animate-peek-in">
            <div className="flex gap-4">
              <StoryCover title={story.title} coverUrl={story.coverUrl} className="w-24 shrink-0 sm:w-28">
                {story.matureLabel ? (
                  <Badge variant="destructive" className="absolute top-1.5 left-1.5">
                    {story.matureLabel}
                  </Badge>
                ) : null}
              </StoryCover>
              <SheetHeader className="min-w-0 flex-1 gap-1 p-0 pr-6">
                <SheetTitle className="line-clamp-3 text-base leading-snug">{story.title}</SheetTitle>
                <p className="truncate text-sm text-muted-foreground">{story.authorName}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {story.categoryName ? <Badge variant="secondary">{story.categoryName}</Badge> : null}
                  <Badge variant="outline">{story.statusLabel}</Badge>
                </div>
                <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="size-3.5" aria-hidden />
                    <span aria-hidden>{formatCount(story.reads, locale)}</span>
                    <span className="sr-only">{`${labels.reads}: ${formatCount(story.reads, locale)}`}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5" aria-hidden />
                    <span aria-hidden>{formatCount(story.votes, locale)}</span>
                    <span className="sr-only">{`${labels.votes}: ${formatCount(story.votes, locale)}`}</span>
                  </span>
                </div>
              </SheetHeader>
            </div>
            <SheetDescription className="text-sm leading-relaxed text-foreground/90">
              {excerpt(story.synopsis, 420)}
            </SheetDescription>
            {actions}
            <LinkComponent href={story.href} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
              {labels.open}
            </LinkComponent>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
