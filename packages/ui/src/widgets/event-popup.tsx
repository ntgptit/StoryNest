/* Lucian UX/UI Prompt #311 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#311 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Gift } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** Time each slide stays before the next one slides in (the element's 2.8 s). */
const INTERVAL_MS = 2800;
/** How long the card takes to shrink into the gift button (the element's 0.52 s). */
const SHRINK_MS = 520;
/** How far a drag must go to change slide. */
const SWIPE_PX = 40;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export interface EventPopupSlide {
  id: string;
  title: string;
  body?: string | null | undefined;
  /** A short line at the top of the slide, e.g. the dates. */
  eyebrow?: string | null | undefined;
  href?: string | null | undefined;
}

export interface EventPopupLabels {
  /** Accessible name of the dialog, e.g. "Events". */
  dialog: string;
  dontShowToday: string;
  close: string;
  /** The gift button that opens the popup again. */
  reopen: string;
  /** Shown next to the gift after "Don't show today". */
  seeYouTomorrow: string;
  /** "2 / 3" */
  position: (index: number, count: number) => string;
  /** The link on a slide, e.g. "View details". */
  open: string;
}

/**
 * The event popup of the home page (Lucian 311): a card in the middle with sliding banners (they move on by
 * themselves, follow a drag or the arrow keys; the dots and "1 / 3" follow along). "Don't show today" and "Close"
 * shrink the card into a gift button in the bottom corner, which opens it again; after "Don't show today" a "See you
 * tomorrow" note shows next to it for a moment. The host decides what "today" means and remembers it.
 *
 * The card animates only when it opens or closes (never on first render of the page), and the slides only when they
 * change. Under reduced motion nothing slides by itself and the card simply closes. `renderLink` renders a slide's link.
 */
export function EventPopup({
  slides,
  open,
  onHide,
  onReopen,
  giftVisible,
  labels,
  renderLink,
  interval = INTERVAL_MS,
}: {
  slides: readonly EventPopupSlide[];
  open: boolean;
  /** Called after the card has shrunk away; `today` is true for "Don't show today". */
  onHide: (today: boolean) => void;
  onReopen: () => void;
  /** Whether the gift button shows while the card is closed. */
  giftVisible: boolean;
  labels: EventPopupLabels;
  renderLink?: (slide: EventPopupSlide, children: ReactNode, className: string) => ReactNode;
  interval?: number;
}) {
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [changes, setChanges] = useState(0);
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);
  const [held, setHeld] = useState(false);
  const [shrink, setShrink] = useState<{ x: number; y: number } | null>(null);
  const [note, setNote] = useState(false);
  /** The gift pops in (with a bump) only after the reader closed the card, never when the page loads with it. */
  const [giftPops, setGiftPops] = useState(false);
  const [reduced, setReduced] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const giftRef = useRef<HTMLButtonElement>(null);
  const hiding = useRef(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  const current = count === 0 ? 0 : Math.min(active, count - 1);
  const go = (index: number) => {
    if (count < 2) return;
    setActive(((index % count) + count) % count);
    setChanges((n) => n + 1);
  };

  // Auto-advance while the card is open and nobody is holding or dragging it.
  useEffect(() => {
    if (!open || reduced || count < 2 || held || drag !== null || shrink !== null) return;
    const timer = window.setTimeout(() => {
      setActive((index) => (index + 1) % count);
      setChanges((n) => n + 1);
    }, interval);
    return () => window.clearTimeout(timer);
  }, [open, reduced, count, held, drag, shrink, active, interval]);

  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(false), 2200);
    return () => window.clearTimeout(timer);
  }, [note]);

  const hide = (today: boolean) => {
    if (hiding.current) return;
    hiding.current = true;
    setGiftPops(true);
    const finish = () => {
      hiding.current = false;
      setShrink(null);
      onHide(today);
      if (today) setNote(true);
    };
    const card = cardRef.current?.getBoundingClientRect();
    const gift = giftRef.current?.getBoundingClientRect();
    if (reduced || !card || !gift) {
      finish();
      return;
    }
    setShrink({
      x: gift.left + gift.width / 2 - (card.left + card.width / 2),
      y: gift.top + gift.height / 2 - (card.top + card.height / 2),
    });
    window.setTimeout(finish, SHRINK_MS);
  };

  if (count === 0) return null;

  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) hide(false);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-scrim transition-opacity duration-350 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
              shrink ? "opacity-0" : "",
            )}
          />
          <DialogPrimitive.Content
            ref={cardRef}
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 z-50 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border bg-background shadow-2xl outline-none data-[state=open]:animate-popup-up"
            style={
              shrink
                ? {
                    transform: `translate(${shrink.x}px, ${shrink.y}px) scale(0.08)`,
                    opacity: 0,
                    transition: "transform 0.55s var(--ease-pour), opacity 0.4s 0.15s",
                    pointerEvents: "none",
                  }
                : undefined
            }
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              hide(false);
            }}
            onPointerDownOutside={(event) => {
              event.preventDefault();
              hide(false);
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              giftRef.current?.focus({ preventScroll: true });
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") go(current + 1);
              if (event.key === "ArrowLeft") go(current - 1);
            }}
          >
            <DialogPrimitive.Title className="sr-only">{labels.dialog}</DialogPrimitive.Title>
            <div
              className="relative h-72 touch-pan-y overflow-hidden select-none"
              onPointerEnter={() => setHeld(true)}
              onPointerLeave={() => setHeld(false)}
              onFocus={() => setHeld(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
              }}
              onPointerDown={(event) => {
                if (count < 2 || event.button !== 0) return;
                setDrag({ startX: event.clientX, dx: 0 });
                try {
                  event.currentTarget.setPointerCapture(event.pointerId);
                } catch {
                  // capture is a nicety: the drag still works inside the card
                }
              }}
              onPointerMove={(event) => {
                if (drag) setDrag({ ...drag, dx: event.clientX - drag.startX });
              }}
              onPointerUp={() => {
                if (!drag) return;
                if (drag.dx < -SWIPE_PX) go(current + 1);
                else if (drag.dx > SWIPE_PX) go(current - 1);
                setDrag(null);
              }}
              onPointerCancel={() => setDrag(null)}
            >
              <ul
                className={cn(
                  "flex h-full",
                  drag === null && changes > 0 && !reduced ? "transition-transform duration-500 ease-slide" : "",
                )}
                style={{
                  transform: `translateX(calc(${-current * 100}% + ${drag ? drag.dx : 0}px))`,
                }}
              >
                {slides.map((slide, index) => (
                  <li
                    key={slide.id}
                    aria-hidden={index !== current}
                    inert={index !== current}
                    className="relative flex h-full w-full flex-none flex-col overflow-hidden bg-primary px-6 pt-6 pb-10 text-primary-foreground"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-8 bottom-10 size-36 rotate-[18deg] rounded-[2.5rem] bg-primary-foreground/15"
                    />
                    {slide.eyebrow ? (
                      <small className="text-xs font-extrabold tracking-wide opacity-85">{slide.eyebrow}</small>
                    ) : null}
                    <b className="mt-1.5 line-clamp-3 text-2xl leading-tight font-black tracking-tight">
                      {slide.title}
                    </b>
                    {slide.body ? (
                      <p className="mt-2 line-clamp-4 text-sm font-semibold opacity-90">{slide.body}</p>
                    ) : null}
                    {slide.href && renderLink ? (
                      <span className="relative mt-auto">
                        {renderLink(
                          slide,
                          labels.open,
                          "inline-flex h-9 items-center rounded-full bg-primary-foreground px-4 text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground",
                        )}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {count > 1 ? (
                <>
                  <span
                    aria-live="polite"
                    className="absolute right-3 bottom-3 rounded-full bg-scrim px-2 py-0.5 text-[0.65rem] font-extrabold text-on-scrim tabular-nums"
                  >
                    {labels.position(current + 1, count)}
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1"
                  >
                    {slides.map((slide, index) => (
                      <i
                        key={slide.id}
                        className={cn(
                          "block h-1.5 rounded-full transition-[width,background-color] duration-300",
                          index === current ? "w-4.5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50",
                        )}
                      />
                    ))}
                  </span>
                </>
              ) : null}
            </div>
            <div className="flex border-t">
              <button
                type="button"
                className="h-12 flex-1 text-xs font-extrabold text-muted-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                onClick={() => hide(true)}
              >
                {labels.dontShowToday}
              </button>
              <button
                type="button"
                className="h-12 flex-1 border-l text-xs font-extrabold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                onClick={() => hide(false)}
              >
                {labels.close}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Fixed corner above the phone's bottom navigation. Kept in the DOM (scaled away) so the card knows where to go. */}
      <div className="pointer-events-none fixed right-4 bottom-20 z-40 flex items-center gap-2 md:bottom-4">
        <div
          role="status"
          className={cn(
            "rounded-lg bg-foreground px-3 py-1.5 text-xs font-extrabold whitespace-nowrap text-background transition-[opacity,transform] duration-300",
            note ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
          )}
        >
          {note ? labels.seeYouTomorrow : ""}
        </div>
        <button
          ref={giftRef}
          type="button"
          aria-label={labels.reopen}
          tabIndex={giftVisible && !open ? 0 : -1}
          aria-hidden={!(giftVisible && !open)}
          className={cn(
            "pointer-events-auto grid size-13 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            giftPops ? "transition-transform delay-450 duration-450 ease-gift" : "",
            giftVisible && !open ? "scale-100" : "pointer-events-none scale-0",
            giftPops && giftVisible && !open && !reduced ? "animate-gift-bump" : "",
          )}
          style={{ animationDelay: giftPops ? "0.52s" : undefined } as CSSProperties}
          onClick={() => {
            setNote(false);
            setActive(0);
            setChanges(0);
            onReopen();
          }}
        >
          <Gift className="size-6" aria-hidden />
        </button>
      </div>
    </>
  );
}
