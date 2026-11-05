/* Lucian UX/UI Prompt #258 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#258 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { blurhashAverageColor, decodeBlurhash, isBlurhash } from "@storynest/utils";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "../lib/utils.ts";

/** Size the hash is painted at: a few pixels are enough, the browser scales and the blur hides the steps. */
const PAINT_WIDTH = 20;
const PAINT_HEIGHT = 30;

/**
 * Blur-up image (Lucian 258): while the picture loads, a tiny blurred preview made from its BlurHash fills the box
 * (its average colour first, then the decoded preview); once the picture has arrived the blur lifts and it settles
 * from 1.15x to its size (0.8 s / 1 s, ease-soft). A picture that is already in the cache when the component mounts
 * shows at once, without the transition, so returning to a page never replays it. Without a valid hash it simply
 * fades in over the muted box. Decorative: the preview has no text alternative; `alt` belongs to the picture.
 */
export function BlurUpImage({
  src,
  hash,
  alt = "",
  eager = false,
  className,
}: {
  src: string;
  hash?: string | null;
  alt?: string;
  eager?: boolean;
  className?: string;
}) {
  const preview = typeof hash === "string" && isBlurhash(hash) ? hash : null;
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement>(null);
  // "instant": it was ready on mount, show it without a transition.
  const [state, setState] = useState<"loading" | "loaded" | "instant">("loading");

  // Before paint, so a cached picture never flashes the hidden state.
  useLayoutEffect(() => {
    const img = image.current;
    setState(img?.complete && img.naturalWidth > 0 ? "instant" : "loading");
  }, [src]);

  useEffect(() => {
    if (preview === null || !canvas.current) return;
    let context: CanvasRenderingContext2D | null;
    try {
      context = canvas.current.getContext("2d");
    } catch {
      return; // no canvas (tests, very old browsers): the average colour stays
    }
    if (!context) return;
    const pixels = decodeBlurhash(preview, PAINT_WIDTH, PAINT_HEIGHT);
    const data = context.createImageData(PAINT_WIDTH, PAINT_HEIGHT);
    data.data.set(pixels);
    context.putImageData(data, 0, 0);
  }, [preview]);

  const shown = state !== "loading";
  return (
    <div
      className={cn("relative size-full overflow-hidden bg-muted", className)}
      style={preview === null ? undefined : { backgroundColor: blurhashAverageColor(preview) ?? undefined }}
    >
      {preview !== null ? (
        <canvas
          ref={canvas}
          aria-hidden
          width={PAINT_WIDTH}
          height={PAINT_HEIGHT}
          className={cn(
            "absolute inset-0 size-full scale-110 blur-md transition-opacity duration-700",
            shown && "opacity-0",
          )}
        />
      ) : null}
      <img
        ref={image}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setState((current) => (current === "loading" ? "loaded" : current))}
        data-state={state}
        className={cn(
          "relative size-full object-cover",
          state === "instant" ? "transition-none" : "transition-[opacity,filter,scale] duration-1000 ease-soft",
          shown ? "blur-none" : "scale-115 opacity-0 blur-md",
        )}
      />
    </div>
  );
}
