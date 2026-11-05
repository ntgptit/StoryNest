/* Lucian UX/UI Prompt #069 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#069 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/dialog.tsx";
import {
  CROP_DEFAULT_MAX_ZOOM,
  cropAreaOf,
  cropImageLayout,
  initialCropView,
  panCropView,
  zoomCropView,
  type CropArea,
  type CropImage,
  type CropView,
} from "../lib/crop-math.ts";
import { cn } from "../lib/utils.ts";

export type { CropArea } from "../lib/crop-math.ts";

export interface ImageCropLabels {
  title: string;
  description: string;
  /** Accessible name of the frame; should say that arrows move and +/− zoom. */
  frame: string;
  zoom: string;
  confirm: string;
  cancel: string;
}

/** Keyboard step, as a fraction of the frame (the element's 6 px and 20 px with Shift on a 280 px frame). */
const KEY_STEP = 0.02;
const KEY_STEP_LARGE = 0.07;
const KEY_ZOOM_STEP = 0.1;
/** Wheel zoom factor per notch, as in the element. */
const WHEEL_IN = 1.06;
const WHEEL_OUT = 0.94;

type Point = { x: number; y: number };

/**
 * Crop dialog for a picked picture: the picture fills a fixed-aspect frame (a round mask for an avatar, a plain
 * rectangle for a cover); drag (mouse, touch, pen) to move it, zoom with the slider, the wheel or a pinch; with the
 * keyboard, arrows move it and +/− zoom. The view is clamped, so the frame never shows an empty area. Rule-of-thirds
 * guides appear while dragging. "Confirm" emits the kept rectangle in source pixels; the caller encodes it.
 *
 * Pure presentation: the caller passes the picture's object URL and its size (read with the same decoder that will
 * crop it, so the coordinates match) and owns opening and closing. Rendered only while a picture is being cropped.
 */
export function ImageCropDialog({
  imageUrl,
  imageWidth,
  imageHeight,
  aspect,
  shape = "rect",
  maxZoom = CROP_DEFAULT_MAX_ZOOM,
  labels,
  onConfirm,
  onCancel,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Width / height of the frame and of the result (1 = square, 2/3 = a cover). */
  aspect: number;
  /** "round" dims everything outside the inscribed circle (the result is still the square). */
  shape?: "round" | "rect";
  maxZoom?: number;
  labels: ImageCropLabels;
  onConfirm: (area: CropArea) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onCancel())}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {/* Keyed by the picture: a new picture starts again from the centred, unzoomed view. */}
        <CropBody
          key={imageUrl}
          imageUrl={imageUrl}
          image={{ width: imageWidth, height: imageHeight, aspect }}
          shape={shape}
          maxZoom={maxZoom}
          labels={labels}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

function CropBody({
  imageUrl,
  image: imageProp,
  shape,
  maxZoom,
  labels,
  onConfirm,
  onCancel,
}: {
  imageUrl: string;
  image: CropImage;
  shape: "round" | "rect";
  maxZoom: number;
  labels: ImageCropLabels;
  onConfirm: (area: CropArea) => void;
  onCancel: () => void;
}) {
  const { width, height, aspect } = imageProp;
  const image = useMemo<CropImage>(() => ({ width, height, aspect }), [width, height, aspect]);
  const [view, setView] = useState<CropView>(() => initialCropView(image));
  const [dragging, setDragging] = useState(false);
  /** Only keyboard steps glide (the element's spring); drag, pinch, wheel and slider follow the hand directly. */
  const [glide, setGlide] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());

  /** A point of the viewport as fractions of the frame (centre when the frame has no size, e.g. in tests). */
  const fractionOf = (point: Point) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { fx: 0.5, fy: 0.5, rect: null };
    return { fx: (point.x - rect.left) / rect.width, fy: (point.y - rect.top) / rect.height, rect };
  };

  // The wheel needs a non-passive listener to keep the page (and the dialog) from scrolling.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const fx = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
      const fy = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
      setGlide(false);
      setView((current) =>
        zoomCropView(current, image, current.zoom * (event.deltaY < 0 ? WHEEL_IN : WHEEL_OUT), fx, fy, maxZoom),
      );
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [image, maxZoom]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setGlide(false);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const map = pointers.current;
    const previous = map.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    map.set(event.pointerId, next);
    const before = fractionOf(previous);
    const after = fractionOf(next);
    if (!after.rect) return;
    const other = [...map.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (!other) {
      const dx = after.fx - before.fx;
      const dy = after.fy - before.fy;
      setView((current) => panCropView(current, image, dx, dy, maxZoom));
      return;
    }
    // Pinch: zoom by the change of distance around the old midpoint, then follow the midpoint.
    const o = fractionOf(other);
    const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const was = distance(previous, other);
    const is = distance(next, other);
    if (was === 0) return;
    const mid0 = { fx: (before.fx + o.fx) / 2, fy: (before.fy + o.fy) / 2 };
    const mid1 = { fx: (after.fx + o.fx) / 2, fy: (after.fy + o.fy) / 2 };
    setView((current) =>
      panCropView(
        zoomCropView(current, image, current.zoom * (is / was), mid0.fx, mid0.fy, maxZoom),
        image,
        mid1.fx - mid0.fx,
        mid1.fy - mid0.fy,
        maxZoom,
      ),
    );
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    // As in the element, an arrow moves the view that way: ← shows more of the left (the picture moves right).
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    let update: ((current: CropView) => CropView) | null = null;
    const move = moves[event.key];
    if (move) update = (current) => panCropView(current, image, move[0], move[1], maxZoom);
    else if (event.key === "+" || event.key === "=")
      update = (current) => zoomCropView(current, image, current.zoom + KEY_ZOOM_STEP, 0.5, 0.5, maxZoom);
    else if (event.key === "-" || event.key === "_")
      update = (current) => zoomCropView(current, image, current.zoom - KEY_ZOOM_STEP, 0.5, 0.5, maxZoom);
    if (update === null) return;
    event.preventDefault();
    setGlide(true);
    setView(update);
  };

  const layout = cropImageLayout(view, image);
  const percent = Math.round(view.zoom * 100);
  const round = shape === "round";

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div
          ref={frameRef}
          tabIndex={0}
          role="application"
          aria-label={labels.frame}
          data-slot="image-crop-frame"
          data-dragging={dragging ? "true" : undefined}
          className={cn(
            "relative w-full cursor-grab touch-none overflow-hidden rounded-lg bg-muted outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[dragging=true]:cursor-grabbing",
            round ? "max-w-72" : "max-w-56",
          )}
          style={{ aspectRatio: aspect }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
        >
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className={cn(
              "pointer-events-none absolute top-0 left-0 h-auto max-w-none",
              glide && "transition-[width,transform] duration-300 ease-soft",
            )}
            style={{ width: `${layout.width}%`, transform: `translate(${layout.x}%, ${layout.y}%)` }}
          />
          {round ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_var(--color-scrim)]"
            />
          ) : null}
          <span
            aria-hidden
            data-slot="image-crop-guides"
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-250",
              round && "rounded-full",
              dragging && "opacity-100",
            )}
          >
            <span className="absolute inset-y-0 left-1/3 w-px bg-crop-guide/60" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-crop-guide/60" />
            <span className="absolute inset-x-0 top-1/3 h-px bg-crop-guide/60" />
            <span className="absolute inset-x-0 top-2/3 h-px bg-crop-guide/60" />
          </span>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 ring-2 ring-crop-guide ring-inset",
              round ? "rounded-full" : "rounded-lg",
            )}
          />
        </div>
        <div className="flex w-full max-w-72 items-center gap-3">
          <ZoomOut aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={100}
            max={Math.round(maxZoom * 100)}
            step={1}
            value={percent}
            aria-label={labels.zoom}
            aria-valuetext={`${percent}%`}
            className="h-7 min-w-0 flex-1 cursor-pointer accent-primary"
            onChange={(event) => {
              const zoom = Number(event.target.value) / 100;
              setGlide(false);
              setView((current) => zoomCropView(current, image, zoom, 0.5, 0.5, maxZoom));
            }}
          />
          <ZoomIn aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button type="button" onClick={() => onConfirm(cropAreaOf(view, image))}>
          {labels.confirm}
        </Button>
      </DialogFooter>
    </>
  );
}
