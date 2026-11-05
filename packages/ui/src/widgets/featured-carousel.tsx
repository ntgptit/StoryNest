/* Lucian UX/UI Prompt #057 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#057 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Pause, Play } from "lucide-react";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** Time each slide stays before the next one comes (the element's 5.2s). */
const INTERVAL_MS = 5200;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export interface FeaturedCarouselLabels {
  pause: string;
  play: string;
  /** Accessible name of the dots group, e.g. "Choose a story". */
  dots: string;
  /** Name of one dot / slide, e.g. "Story 2 of 5: Salt and Ash". */
  slide: (index: number, count: number) => string;
}

/**
 * One large slide at a time that moves on by itself (Lucian 057): a bar in the active dot fills while the slide
 * shows, then the next one slides in and its text rises in. It pauses while the pointer is over it or focus is in it,
 * while the tab is hidden, and whenever the reader presses Pause; under reduced motion it never moves by itself.
 * Swipe (native scroll with snap points) or press a dot to jump; only the visible slide is focusable.
 * Children are the slides.
 */
export function FeaturedCarousel({
  title,
  labels,
  children,
  interval = INTERVAL_MS,
  className,
}: {
  title: string;
  labels: FeaturedCarouselLabels;
  children: ReactNode;
  interval?: number;
  className?: string;
}) {
  const headingId = useId();
  const slides = Children.toArray(children);
  const count = slides.length;
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  /** How many times the slide changed: 0 on load, so nothing animates before the reader or the timer moves it. */
  const [changes, setChanges] = useState(0);
  const [stopped, setStopped] = useState(false); // the Pause button
  const [held, setHeld] = useState(false); // pointer over it or focus inside it
  const [hidden, setHidden] = useState(false); // the browser tab is in the background
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const activeRef = useRef(0);
  const show = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setActive(index);
    setChanges((n) => n + 1);
  }, []);

  // The visible slide follows the scroll position (swipe, or a scroll started by go()).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const width = track.clientWidth || 1;
      show(Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / width))));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [count, show]);

  const go = (index: number) => {
    const track = trackRef.current;
    const target = ((index % count) + count) % count;
    show(target);
    track?.scrollTo({ left: target * track.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const autoplay = count > 1 && !reduced;
  const running = autoplay && !stopped && !held && !hidden;

  if (count === 0) return null;
  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={headingId}
      data-slot="featured-carousel"
      className={cn("flex min-w-0 flex-col gap-3", className)}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setHeld(false);
      }}
      // Focus on a slide or a dot holds the slide; focus on Pause/Play does not, so Play resumes at once.
      onFocus={(event) => {
        if (!(event.target as HTMLElement).closest("[data-carousel-control]")) setHeld(true);
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as HTMLElement | null;
        if (!next || !event.currentTarget.contains(next) || next.closest("[data-carousel-control]")) setHeld(false);
      }}
    >
      <div className="flex items-center gap-2">
        <h2 id={headingId} className="mr-auto text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {autoplay ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-full"
            data-carousel-control=""
            aria-label={stopped ? labels.play : labels.pause}
            onClick={() => setStopped((value) => !value)}
          >
            {stopped ? <Play aria-hidden /> : <Pause aria-hidden />}
          </Button>
        ) : null}
      </div>

      <ul
        ref={trackRef}
        // Announce slide changes only when the reader causes them, not every few seconds.
        aria-live={running ? "off" : "polite"}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => {
          const current = index === active;
          return (
            <li
              key={isValidElement(slide) && slide.key != null ? slide.key : index}
              aria-roledescription="slide"
              aria-label={labels.slide(index, count)}
              inert={!current}
              className="w-full shrink-0 snap-start"
            >
              <div className={cn(current && changes > 0 && "motion-safe:animate-featured-in")}>{slide}</div>
            </li>
          );
        })}
      </ul>

      {count > 1 ? (
        <div role="group" aria-label={labels.dots} className="flex items-center justify-center gap-1">
          {slides.map((_, index) => {
            const current = index === active;
            return (
              <button
                key={index}
                type="button"
                aria-label={labels.slide(index, count)}
                aria-current={current ? "true" : undefined}
                onClick={() => go(index)}
                className="group/dot touch-target inline-flex items-center justify-center rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "relative block h-1.5 overflow-hidden rounded-full bg-muted-foreground/30 transition-[width] duration-500 ease-spring group-hover/dot:bg-muted-foreground/50",
                    current ? "w-8" : "w-1.5",
                  )}
                >
                  {current ? (
                    autoplay ? (
                      <span
                        key={`${index}-${changes}`}
                        className="absolute inset-0 origin-left animate-featured-timer bg-foreground/70"
                        style={
                          {
                            "--featured-interval": `${interval}ms`,
                            animationPlayState: running ? "running" : "paused",
                          } as CSSProperties
                        }
                        onAnimationEnd={() => go(index + 1)}
                      />
                    ) : (
                      <span className="absolute inset-0 bg-foreground/70" />
                    )
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
