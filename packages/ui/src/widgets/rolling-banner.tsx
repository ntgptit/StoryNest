/* Lucian UX/UI Prompt #073 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#073 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Bell, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** Time each message stays before the next one rolls in (the element's 3.8 s). */
const INTERVAL_MS = 3800;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export interface RollingBannerItem {
  id: string;
  title: string;
  body?: string | null | undefined;
  href?: string | null | undefined;
}

export interface RollingBannerLabels {
  /** Accessible name of the strip, e.g. "Announcements". */
  region: string;
  /** Spoken role of the strip, e.g. "rotating banner". */
  roleDescription: string;
  /** Small tag at the start of the strip, e.g. "New". */
  tag: string;
  next: string;
  close: string;
  /** The bell that brings the strip back after it was closed. */
  reopen: string;
}

/**
 * A strip of short announcements at the top of the page (Lucian 073). The messages roll upward one after another while
 * a short bar per message fills with the time left; pointer over the strip or focus inside it pauses it, the arrow
 * moves on. × folds the strip away (the page below moves up) and, when `reopenable`, a small bell takes its place to
 * bring it back. Nothing moves on first render; under reduced motion it never rolls by itself.
 *
 * `renderLink` turns a message with an `href` into a link (the host's router link or an external anchor).
 */
export function RollingBanner({
  items,
  labels,
  closed,
  onClose,
  onReopen,
  reopenable = false,
  renderLink,
  interval = INTERVAL_MS,
  className,
}: {
  items: readonly RollingBannerItem[];
  labels: RollingBannerLabels;
  closed: boolean;
  onClose: () => void;
  onReopen?: () => void;
  reopenable?: boolean;
  renderLink?: (item: RollingBannerItem, children: ReactNode, className: string) => ReactNode;
  interval?: number;
  className?: string;
}) {
  const count = items.length;
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  /** How many times the message changed: 0 on load, so nothing rolls before the timer or the reader moves it. */
  const [changes, setChanges] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const userToggled = useRef(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  const current = count === 0 ? 0 : Math.min(active, count - 1);

  const show = (index: number) => {
    if (count < 2) return;
    setPrevious(current);
    setActive(((index % count) + count) % count);
    setChanges((n) => n + 1);
  };

  // After the reader closes or reopens, focus follows: the bell (once it has appeared) or the close button.
  useEffect(() => {
    if (!userToggled.current) return;
    userToggled.current = false;
    if (closed) {
      const timer = window.setTimeout(() => bellRef.current?.focus({ preventScroll: true }), 300);
      return () => window.clearTimeout(timer);
    }
    closeRef.current?.focus({ preventScroll: true });
  }, [closed]);

  if (count === 0) return null;
  const rolling = count > 1 && !reduced && !closed;

  return (
    <div className={cn("w-full", className)}>
      <div
        className="grid transition-[grid-template-rows] duration-500 ease-soft"
        style={{ gridTemplateRows: closed ? "0fr" : "1fr" }}
        inert={closed}
        data-state={closed ? "closed" : "open"}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={stripRef}
            role="region"
            aria-label={labels.region}
            aria-roledescription={labels.roleDescription}
            className="relative flex h-12 items-center gap-1.5 overflow-hidden bg-primary pr-1 pl-3 text-primary-foreground"
            onPointerEnter={() => setHeld(true)}
            onPointerLeave={() => setHeld(stripRef.current?.contains(document.activeElement) ?? false)}
            onFocus={() => setHeld(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-24 w-20 bg-linear-to-r from-transparent via-primary-foreground/25 to-transparent motion-safe:animate-banner-shine"
            />
            <span className="inline-flex h-5 flex-none items-center rounded-md bg-primary-foreground/20 px-1.5 text-[0.65rem] font-extrabold tracking-wider uppercase">
              {labels.tag}
            </span>
            <div className="relative h-full min-w-0 flex-1 overflow-hidden" aria-live={rolling ? "off" : "polite"}>
              {items.map((item, index) => {
                const isActive = index === current;
                const leaving = !isActive && index === previous && changes > 0;
                const content = (
                  <>
                    <b className="truncate text-sm font-extrabold tracking-tight">{item.title}</b>
                    {item.body ? <span className="truncate text-xs font-semibold opacity-80">{item.body}</span> : null}
                  </>
                );
                const boxClass = "flex h-full min-w-0 flex-col justify-center";
                return (
                  <div
                    key={item.id}
                    aria-hidden={!isActive}
                    inert={!isActive}
                    className={cn(
                      "absolute inset-0",
                      isActive
                        ? changes > 0
                          ? "animate-banner-roll-in"
                          : ""
                        : leaving
                          ? "animate-banner-roll-out"
                          : "invisible",
                    )}
                    onAnimationEnd={leaving ? () => setPrevious(null) : undefined}
                  >
                    {item.href && renderLink ? (
                      renderLink(
                        item,
                        content,
                        cn(
                          boxClass,
                          "underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-foreground",
                        ),
                      )
                    ) : (
                      <div className={boxClass}>{content}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {count > 1 ? (
              <span aria-hidden className="flex flex-none gap-0.5">
                {items.map((item, index) => (
                  <i key={item.id} className="block h-[3px] w-3 overflow-hidden rounded-sm bg-primary-foreground/30">
                    <i
                      // A new key restarts the bar whenever its message comes back.
                      key={index === current ? `run-${changes}` : "idle"}
                      className={cn(
                        "block h-full origin-left bg-primary-foreground",
                        index < current ? "scale-x-100" : "scale-x-0",
                        index === current && rolling ? "animate-banner-timer" : "",
                      )}
                      style={
                        {
                          "--banner-interval": `${interval}ms`,
                          animationPlayState: held ? "paused" : "running",
                        } as CSSProperties
                      }
                      onAnimationEnd={index === current ? () => show(current + 1) : undefined}
                    />
                  </i>
                ))}
              </span>
            ) : null}
            {count > 1 ? (
              <button
                type="button"
                aria-label={labels.next}
                className="grid size-8 flex-none place-items-center rounded-lg transition-[background-color,transform] duration-300 ease-spring hover:bg-primary-foreground/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-foreground active:scale-90"
                onClick={() => show(current + 1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            ) : null}
            <button
              ref={closeRef}
              type="button"
              aria-label={labels.close}
              className="grid size-8 flex-none place-items-center rounded-lg transition-[background-color,transform] duration-300 ease-spring hover:bg-primary-foreground/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-foreground active:scale-90"
              onClick={() => {
                userToggled.current = true;
                onClose();
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      {closed && reopenable && onReopen ? (
        <div className="flex justify-end px-3 py-1">
          <button
            ref={bellRef}
            type="button"
            aria-label={labels.reopen}
            className="grid size-8 place-items-center rounded-full bg-muted text-foreground transition-[opacity,transform] delay-250 duration-450 ease-spring starting:scale-50 starting:opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={() => {
              userToggled.current = true;
              onReopen();
              setActive(0);
              setPrevious(null);
            }}
          >
            <Bell className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
