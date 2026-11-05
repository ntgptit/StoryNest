/* Lucian UX/UI Prompt #221 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#221 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";

import { cn } from "../lib/utils.ts";

/** Default top inset: the sticky app header (h-14). A button hidden under it counts as scrolled away. */
const HEADER_INSET = "-56px 0px 0px 0px";

/**
 * True once `anchorRef` has scrolled up out of view (above the top inset), false while it is on screen or still below
 * the fold. Without IntersectionObserver (old browsers, tests) it stays false, so the page simply keeps its own button.
 */
export function useScrolledPast(anchorRef: RefObject<Element | null>, rootMargin = HEADER_INSET): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const top = entry.rootBounds?.top ?? 0;
        setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= top);
      },
      { rootMargin },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef, rootMargin]);
  return past;
}

/**
 * Compact bar that rises from the bottom once the page's own main action (`anchorRef`) has scrolled away, and slips
 * back down when that action is on screen again, so the action is always one tap away. On phones it sits above the
 * BottomNav (`bottom-above-nav`), from md up at the very bottom; the home-indicator inset is respected either way.
 * While hidden it is `inert` and hidden from assistive tech, so its copy of the action is never a second tab stop.
 * It starts hidden, so nothing moves on first render. A spacer of its height keeps the end of the page reachable.
 */
export function StickyActionBar({
  anchorRef,
  label,
  children,
  rootMargin,
  className,
}: {
  /** The in-page element whose action the bar repeats. */
  anchorRef: RefObject<Element | null>;
  /** Accessible name of the bar's region. */
  label: string;
  children: ReactNode;
  /** IntersectionObserver root margin; defaults to the sticky header's height at the top. */
  rootMargin?: string;
  className?: string;
}) {
  const visible = useScrolledPast(anchorRef, rootMargin);

  return (
    <>
      <div aria-hidden data-part="spacer" className="h-16" />
      <div
        role="region"
        aria-label={label}
        aria-hidden={visible ? undefined : true}
        inert={!visible}
        data-state={visible ? "visible" : "hidden"}
        className="pointer-events-none fixed inset-x-0 bottom-above-nav z-30 px-safe md:bottom-0"
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto flex w-full max-w-5xl items-center gap-2 rounded-t-2xl border-x border-t bg-background/95 px-4 py-2 shadow-lg backdrop-blur [transition:transform_0.45s_var(--ease-rise),opacity_0.3s_var(--ease-soft)] sm:px-6 md:pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            visible ? "opacity-100" : "translate-y-[110%] opacity-0",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
