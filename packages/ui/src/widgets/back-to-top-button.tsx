/* Lucian UX/UI Prompt #343 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#343 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useState, type MouseEvent, type RefObject } from "react";

import { cn } from "../lib/utils.ts";
import { useScrollProgress } from "./reading-progress.tsx";

/** The button shows once the page is scrolled further than this many screen heights. */
export const BACK_TO_TOP_AFTER_SCREENS = 1.5;

const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Round floating button that brings a long page back to the top. It rises at the bottom right once the page is
 * scrolled past `BACK_TO_TOP_AFTER_SCREENS` screens, its ring filling with the page's scroll progress. A press glides
 * the page to the top (a jump under reduced motion) while the arrow launches, and moves focus to `focusTargetRef`
 * (e.g. the page title with tabIndex -1), so keyboard users continue from the top too. On phones it sits above the
 * BottomNav. While hidden it is `inert` and hidden from assistive tech; it starts hidden, so nothing moves on load.
 */
export function BackToTopButton({
  label,
  focusTargetRef,
  className,
}: {
  /** Accessible name, e.g. "Back to top". */
  label: string;
  focusTargetRef?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const ratio = useScrollProgress();
  const [shown, setShown] = useState(false);
  const [launches, setLaunches] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShown(window.scrollY > window.innerHeight * BACK_TO_TOP_AFTER_SCREENS);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  const goTop = (event: MouseEvent<HTMLButtonElement>) => {
    setLaunches((count) => count + 1);
    // Focus leaves the button first: it turns inert on the way up, and losing focus then would stop the glide.
    const target = focusTargetRef?.current;
    if (target) target.focus({ preventScroll: true });
    else event.currentTarget.blur();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      data-slot="back-to-top"
      aria-label={label}
      aria-hidden={!shown}
      inert={!shown}
      tabIndex={shown ? undefined : -1}
      onClick={goTop}
      className={cn(
        "fixed right-4 bottom-above-nav z-30 mb-4 grid size-12 place-items-center rounded-full bg-foreground text-background shadow-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:bottom-6 md:mb-0",
        "[transition:opacity_0.3s_var(--ease-soft),transform_0.5s_var(--ease-spring)]",
        shown ? "opacity-100" : "pointer-events-none translate-y-5 scale-60 opacity-0",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - ratio)}
          className="stroke-primary"
        />
      </svg>
      <svg
        key={launches}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn("size-5", launches > 0 && "motion-safe:animate-back-to-top-launch")}
      >
        <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
      </svg>
    </button>
  );
}
