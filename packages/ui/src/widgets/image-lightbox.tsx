/* Lucian UX/UI Prompt #061 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#061 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/utils.ts";

export const LIGHTBOX_MAX_ZOOM = 4;
/** Zoom level of a double tap / double click on the photo (pressing again goes back to fit). */
export const LIGHTBOX_TAP_ZOOM = 2.5;
/** Dragging the photo down further than this (px) and letting go closes the viewer. */
export const LIGHTBOX_DISMISS_PX = 110;
/** Grow-from-thumbnail and shrink-back duration (the element's 520ms on `--ease-soft`). */
const MORPH_MS = 520;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 6;

export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}

/**
 * Pan offset after zooming from `zoom` to `next` around `point` (all relative to the centre of the view), so that the
 * spot under the fingers or the pointer stays where it is.
 */
export function zoomAbout(pan: Point, zoom: number, next: number, point: Point): Point {
  const k = next / zoom;
  return { x: point.x - (point.x - pan.x) * k, y: point.y - (point.y - pan.y) * k };
}

/** Keeps a zoomed photo covering the view: it can be moved only as far as it overflows, and is centred otherwise. */
export function clampPan(pan: Point, zoom: number, image: Size, view: Size): Point {
  const maxX = Math.max(0, (image.width * zoom - view.width) / 2);
  const maxY = Math.max(0, (image.height * zoom - view.height) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, pan.x)), y: Math.min(maxY, Math.max(-maxY, pan.y)) };
}

export const clampZoom = (zoom: number) => Math.min(LIGHTBOX_MAX_ZOOM, Math.max(1, zoom));

/** The photo's size at "fit": as large as the view allows (small photos are scaled up), keeping its aspect ratio. */
export function fitSize(natural: Size, view: Size): Size {
  if (!(natural.width > 0 && natural.height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(view.width / natural.width, view.height / natural.height);
  return { width: Math.round(natural.width * scale), height: Math.round(natural.height * scale) };
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Transform that puts a box laid out at `to` exactly over `from` (same aspect ratio). */
function flip(from: DOMRect, to: { cx: number; cy: number; width: number }): string {
  const scale = to.width > 0 ? from.width / to.width : 1;
  return `translate(${from.left + from.width / 2 - to.cx}px, ${from.top + from.height / 2 - to.cy}px) scale(${scale})`;
}

interface View {
  zoom: number;
  pan: Point;
}
const FIT: View = { zoom: 1, pan: { x: 0, y: 0 } };

interface Gesture {
  pointers: Map<number, Point>;
  mode: "none" | "wait" | "pan" | "down" | "pinch";
  start: Point;
  startView: View;
  startDistance: number;
  startMid: Point;
  lastTap: { time: number; at: Point } | null;
}

/**
 * A photo inside running content that opens full screen when pressed: it grows from its place on the page, can be
 * zoomed (pinch, double tap or double click, the mouse wheel, + and -) and moved around while zoomed (drag, arrow keys),
 * and closes with Esc, the close button, a tap beside the photo or a drag down, shrinking back into place. It is a
 * Radix dialog: focus moves to the close button, stays inside while open, and returns to the photo on the page.
 * `children` is the photo as shown on the page (an <img>); the viewer shows `src` at up to the screen's size.
 */
export function ImageLightbox({
  src,
  alt,
  openLabel,
  closeLabel,
  title,
  hint,
  children,
  className,
}: {
  src: string;
  alt: string;
  /** Accessible name of the photo on the page, e.g. "Open image full screen". */
  openLabel: string;
  closeLabel: string;
  /** Accessible name of the viewer. */
  title: string;
  /** How to zoom and close, read out when the viewer opens. */
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [view, setView] = useState<View>(FIT);
  const [dragY, setDragY] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  // Explicit size: a photo without intrinsic size (an SVG) would otherwise collapse inside the centring box.
  const [fit, setFit] = useState<Size | null>(null);
  const morphed = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const morph = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const closingRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const gesture = useRef<Gesture>({
    pointers: new Map(),
    mode: "none",
    start: { x: 0, y: 0 },
    startView: FIT,
    startDistance: 1,
    startMid: { x: 0, y: 0 },
    lastTap: null,
  });

  const thumbnail = () => trigger.current?.querySelector("img") ?? trigger.current;
  /** Where the photo sits at fit size: centred in the viewport (layout size, unaffected by transforms). */
  const fitBox = (img: HTMLImageElement) => ({
    cx: window.innerWidth / 2,
    cy: window.innerHeight / 2,
    width: img.offsetWidth,
  });

  const setClamped = (next: View) => {
    const img = image.current;
    if (!img) return;
    const zoom = clampZoom(next.zoom);
    const pan = clampPan(
      next.pan,
      zoom,
      { width: img.offsetWidth, height: img.offsetHeight },
      {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    );
    setView({ zoom, pan: zoom === 1 ? { x: 0, y: 0 } : pan });
  };

  /** Relative to the centre of the viewport. */
  const fromCentre = (x: number, y: number): Point => ({ x: x - window.innerWidth / 2, y: y - window.innerHeight / 2 });

  const zoomTo = (next: number, at: Point = { x: 0, y: 0 }) => {
    const current = viewRef.current;
    const zoom = clampZoom(next);
    setClamped({ zoom, pan: zoomAbout(current.pan, current.zoom, zoom, at) });
  };

  const measureFit = () => {
    const img = image.current;
    if (!img) return;
    setFit(
      fitSize(
        { width: img.naturalWidth, height: img.naturalHeight },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  };

  const morphIn = () => {
    const node = morph.current;
    const img = image.current;
    const from = thumbnail();
    if (!node || !img || !from || prefersReducedMotion() || img.offsetWidth === 0) return;
    node.style.transition = "none";
    node.style.transform = flip(from.getBoundingClientRect(), fitBox(img));
    void node.getBoundingClientRect(); // commit the start position before transitioning away from it
    node.style.transition = `transform ${MORPH_MS}ms var(--ease-soft)`;
    node.style.transform = "";
  };

  const finishClose = () => {
    closingRef.current = false;
    setClosing(false);
    setOpen(false);
  };

  const requestClose = () => {
    if (closingRef.current) return;
    const node = morph.current;
    const img = image.current;
    const to = thumbnail();
    setView(FIT);
    setDragY(0);
    if (!node || !img || !to || prefersReducedMotion() || img.offsetWidth === 0) {
      finishClose();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    node.style.transition = `transform ${MORPH_MS}ms var(--ease-soft)`;
    node.style.transform = flip(to.getBoundingClientRect(), fitBox(img));
    const timer = setTimeout(done, MORPH_MS + 80);
    function done() {
      clearTimeout(timer);
      node?.removeEventListener("transitionend", onEnd);
      if (closingRef.current) finishClose();
    }
    function onEnd(event: TransitionEvent) {
      if (event.target === node) done();
    }
    node.addEventListener("transitionend", onEnd);
  };

  useLayoutEffect(() => {
    if (!open) {
      morphed.current = false;
      setFit(null);
      return;
    }
    if (fit && !morphed.current) {
      morphed.current = true;
      morphIn();
    }
    // morphIn only reads refs and window
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fit]);

  // Keep the fit size right when the window turns or resizes.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measureFit);
    return () => window.removeEventListener("resize", measureFit);
  }, [open]);

  // The wheel must be able to cancel the page scroll, which React's passive wheel listener cannot.
  useEffect(() => {
    if (!content) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (closingRef.current) return;
      zoomTo(viewRef.current.zoom * (event.deltaY < 0 ? 1.12 : 0.89), fromCentre(event.clientX, event.clientY));
    };
    content.addEventListener("wheel", onWheel, { passive: false });
    return () => content.removeEventListener("wheel", onWheel);
    // zoomTo only reads refs and window, so the listener does not need to be re-attached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (closingRef.current || (event.target as Element).closest("button")) return;
    const g = gesture.current;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    g.startView = viewRef.current;
    if (g.pointers.size === 1) {
      g.mode = "wait";
      g.start = { x: event.clientX, y: event.clientY };
    } else if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()] as [Point, Point];
      g.mode = "pinch";
      g.startDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      g.startMid = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      setInteracting(true);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.pointers.has(event.pointerId)) return;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (g.mode === "pinch" && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()] as [Point, Point];
      const mid = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const zoom = clampZoom((g.startView.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.startDistance);
      const pan = zoomAbout(g.startView.pan, g.startView.zoom, zoom, g.startMid);
      setClamped({ zoom, pan: { x: pan.x + mid.x - g.startMid.x, y: pan.y + mid.y - g.startMid.y } });
      return;
    }
    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    if (g.mode === "wait" && Math.hypot(dx, dy) > TAP_SLOP_PX) {
      g.mode = g.startView.zoom > 1 ? "pan" : dy > Math.abs(dx) ? "down" : "none";
      if (g.mode !== "none") setInteracting(true);
    }
    if (g.mode === "pan") {
      setClamped({ zoom: g.startView.zoom, pan: { x: g.startView.pan.x + dx, y: g.startView.pan.y + dy } });
    } else if (g.mode === "down") {
      setDragY(Math.max(0, dy));
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.pointers.delete(event.pointerId)) return;
    const mode = g.mode;
    if (g.pointers.size > 0) {
      // One finger of a pinch lifted: wait for the other one rather than starting a pan from here.
      g.mode = "none";
      return;
    }
    g.mode = "none";
    setInteracting(false);
    if (mode === "down") {
      if (event.clientY - g.start.y > LIGHTBOX_DISMISS_PX) requestClose();
      else setDragY(0);
      return;
    }
    if (mode !== "wait") return;
    // A tap: twice on the photo zooms in or back out; once beside the photo (not zoomed) closes.
    const at = { x: event.clientX, y: event.clientY };
    const onPhoto = event.target === image.current;
    const last = g.lastTap;
    if (
      onPhoto &&
      last &&
      event.timeStamp - last.time < DOUBLE_TAP_MS &&
      Math.hypot(at.x - last.at.x, at.y - last.at.y) < 30
    ) {
      g.lastTap = null;
      if (viewRef.current.zoom > 1) setView(FIT);
      else zoomTo(LIGHTBOX_TAP_ZOOM, fromCentre(at.x, at.y));
      return;
    }
    g.lastTap = { time: event.timeStamp, at };
    if (!onPhoto && viewRef.current.zoom === 1) requestClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = viewRef.current;
    const step = 60;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    if (event.key === "+" || event.key === "=") zoomTo(current.zoom * 1.5);
    else if (event.key === "-") zoomTo(current.zoom / 1.5);
    else if (event.key === "0") setView(FIT);
    else if (moves[event.key] && current.zoom > 1) {
      const move = moves[event.key] as Point;
      setClamped({ zoom: current.zoom, pan: { x: current.pan.x + move.x, y: current.pan.y + move.y } });
    } else return;
    event.preventDefault();
  };

  const backdrop = closing ? 0 : Math.max(0.2, 1 - dragY / 300);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setView(FIT);
          setDragY(0);
          setOpen(true);
        } else requestClose();
      }}
    >
      <DialogPrimitive.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-label={openLabel}
          className={cn(
            "block w-full cursor-zoom-in rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:opacity-0",
            className,
          )}
        >
          {children}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-lightbox [transition:opacity_0.45s_var(--ease-soft)] data-[state=open]:animate-in data-[state=open]:fade-in-0"
          style={{ opacity: backdrop }}
        />
        <DialogPrimitive.Content
          ref={setContent}
          data-slot="image-lightbox"
          className="fixed inset-0 z-50 flex touch-none items-center justify-center overflow-hidden outline-none select-none"
          onOpenAutoFocus={() => {
            if (image.current?.complete) measureFit();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{hint}</DialogPrimitive.Description>
          <div ref={morph} className="shrink-0">
            <div
              className={cn(!interacting && "[transition:transform_0.4s_var(--ease-spring)]")}
              style={{ transform: dragY > 0 ? `translateY(${dragY}px) scale(${1 - dragY / 1600})` : undefined }}
            >
              <img
                ref={image}
                src={src}
                alt={alt}
                draggable={false}
                onLoad={measureFit}
                className={cn(
                  "block max-w-none object-contain",
                  !interacting && "[transition:transform_0.45s_var(--ease-soft)]",
                  view.zoom > 1 ? "cursor-grab" : "cursor-zoom-in",
                )}
                style={{
                  width: fit?.width,
                  height: fit?.height,
                  visibility: fit ? undefined : "hidden",
                  transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})`,
                }}
              />
            </div>
          </div>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-[calc(env(safe-area-inset-top)+1.25rem)] left-1/2 -translate-x-1/2 rounded-full bg-lightbox px-2.5 py-1 text-xs font-semibold text-lightbox-foreground tabular-nums [transition:opacity_0.3s_var(--ease-soft)]",
              view.zoom > 1 && !closing ? "opacity-100" : "opacity-0",
            )}
          >
            {`${Math.round(view.zoom * 10) / 10}×`}
          </span>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className={cn(
              "absolute top-[calc(env(safe-area-inset-top)+1rem)] right-4 grid size-11 place-items-center rounded-full bg-lightbox text-lightbox-foreground outline-none ring-1 ring-lightbox-foreground/25 focus-visible:ring-[3px] focus-visible:ring-lightbox-foreground active:scale-90 [transition:transform_0.3s_var(--ease-spring),opacity_0.3s_var(--ease-soft)]",
              closing && "opacity-0",
            )}
          >
            <XIcon aria-hidden className="size-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
