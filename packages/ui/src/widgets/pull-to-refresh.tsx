/* Lucian UX/UI Prompt #085 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#085 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** Pull distance (px, after the rubber band) at which letting go refreshes. */
export const PULL_THRESHOLD = 70;
/** The furthest the page follows the finger. */
const PULL_MAX = 120;
/** How heavy the band gets: the element's 140 px. */
const PULL_STIFFNESS = 140;

/** Finger travel → pull distance: follows at first, then gets heavier and stops at PULL_MAX. */
export function rubberBand(distance: number): number {
  return distance <= 0 ? 0 : PULL_MAX * (1 - Math.exp(-distance / PULL_STIFFNESS));
}

type Phase = "idle" | "pulling" | "refreshing" | "settling";

/**
 * Pull-to-refresh for a whole page on touch screens. When `enabled` and the page is scrolled to the top, dragging down
 * pulls the content like a rubber band while an arrow circle under the header draws itself; past the threshold it
 * fills and says "Release to refresh"; letting go spins it until `onRefresh` settles, then everything springs back.
 *
 * Only for places without a browser pull-to-refresh of their own (an installed app, the Capacitor shell): in a
 * browser tab the two would fight, so the caller keeps it disabled there. Disabled, it only renders its children and
 * listens to nothing. It is a touch shortcut: every page it wraps must keep its normal way to reload (focus, retry).
 */
export function PullToRefresh({
  enabled,
  onRefresh,
  labels,
  children,
}: {
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
  labels: { pull: string; release: string; refreshing: string };
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  const state = useRef({ startY: 0, tracking: false, pull: 0, busy: false });

  useEffect(() => {
    if (!enabled) return;
    const current = state.current;
    const onStart = (event: TouchEvent) => {
      if (current.busy || event.touches.length !== 1 || window.scrollY > 0) return;
      current.tracking = true;
      current.startY = event.touches[0]?.clientY ?? 0;
      current.pull = 0;
    };
    const onMove = (event: TouchEvent) => {
      if (!current.tracking) return;
      const distance = (event.touches[0]?.clientY ?? 0) - current.startY;
      if (distance <= 0 || window.scrollY > 0) {
        if (current.pull > 0) {
          current.pull = 0;
          setPull(0);
          setPhase("idle");
        }
        return;
      }
      // We own this gesture now: keep the page from scrolling or bouncing under the finger.
      if (event.cancelable) event.preventDefault();
      current.pull = rubberBand(distance);
      setPull(current.pull);
      setPhase("pulling");
    };
    const onEnd = () => {
      if (!current.tracking) return;
      current.tracking = false;
      if (current.pull < PULL_THRESHOLD) {
        current.pull = 0;
        setPull(0);
        setPhase("settling");
        return;
      }
      current.busy = true;
      setPull(PULL_THRESHOLD);
      setPhase("refreshing");
      refresh
        .current()
        .catch(() => undefined) // a failed reload is reported by the page itself (its error state)
        .finally(() => {
          current.busy = false;
          current.pull = 0;
          setPull(0);
          setPhase("settling");
        });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  const ready = pull >= PULL_THRESHOLD;
  const refreshing = phase === "refreshing";
  const springing = phase === "settling" || refreshing;
  const vars = { "--pull": pull.toFixed(1) } as CSSProperties;
  const message = refreshing ? labels.refreshing : ready ? labels.release : labels.pull;

  return (
    // Always the same wrapper element, so turning it on or off never remounts the page below.
    <div style={enabled ? vars : undefined} className={enabled ? "relative" : "contents"}>
      {enabled ? (
        <>
          <span
            aria-hidden
            className={cn(
              "fixed top-below-header left-1/2 z-20 -ml-5 grid size-10 place-items-center rounded-full border shadow-md",
              ready && !refreshing ? "bg-primary text-primary-foreground" : "bg-card text-primary",
              springing && "transition-[transform,opacity,background-color] duration-500 ease-spring",
            )}
            style={{
              opacity: refreshing ? 1 : "min(1, calc(var(--pull) / 30))",
              transform: refreshing
                ? "translateY(20px)"
                : "translateY(calc(min(var(--pull), 90) * 1px - 50px)) rotate(calc(var(--pull) * 3deg))",
            }}
          >
            <svg viewBox="0 0 24 24" className={cn("size-6 -rotate-90", refreshing && "animate-ptr-spin")}>
              <circle
                cx="12"
                cy="12"
                r="8"
                pathLength={100}
                className="fill-none stroke-current"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="100"
                style={{ strokeDashoffset: refreshing ? 30 : "calc(100 - min(1, var(--pull) / 70) * 82)" }}
              />
              <path
                d="M12 1.6l3.4 2.6L12 6.8z"
                className="fill-current"
                style={{ opacity: refreshing ? 0 : "min(1, calc(var(--pull) / 70))" }}
              />
            </svg>
          </span>
          <span
            aria-hidden
            className={cn(
              "fixed top-below-header inset-x-0 z-20 text-center text-xs font-semibold text-muted-foreground",
              springing && "transition-[transform,opacity] duration-500 ease-spring",
            )}
            style={{
              opacity: refreshing ? 0 : "min(1, calc((var(--pull) - 30) / 30))",
              transform: "translateY(calc(min(var(--pull), 90) * 1px - 4px))",
            }}
          >
            {message}
          </span>
          <span role="status" className="sr-only">
            {refreshing ? labels.refreshing : ""}
          </span>
        </>
      ) : null}
      <div
        className={cn(enabled ? "block" : "contents", springing && "transition-transform duration-500 ease-spring")}
        style={enabled && pull > 0 ? { transform: "translateY(calc(var(--pull) * 1.3px))" } : undefined}
        onTransitionEnd={() => {
          if (phase === "settling") setPhase("idle");
        }}
      >
        {children}
      </div>
    </div>
  );
}
