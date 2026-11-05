/* Lucian UX/UI Prompt #082 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#082 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/**
 * A picture that is being uploaded (Lucian 082, indeterminate): while `busy` a dark veil lies over it with a turning
 * ring in the middle, and each time `done` goes up the picture hops once as the veil lifts. The upload reports no
 * byte progress, so the ring only says "working"; there is no pause. The veil is decoration: the caller keeps its own
 * busy text (the button label) and aria-busy. `done` is a counter bumped after each success, so a first render or a
 * remount never hops. `className` sets the shape (e.g. rounded-full for an avatar); the veil is clipped to it.
 */
export function UploadVeil({
  busy,
  done = 0,
  children,
  className,
}: {
  busy: boolean;
  done?: number;
  children: ReactNode;
  className?: string;
}) {
  // The hop is a class switched on per success and off when it ends, so the picture inside is never remounted.
  const [seen, setSeen] = useState(done);
  const [hopping, setHopping] = useState(false);
  if (done !== seen) {
    setSeen(done);
    if (done > seen) setHopping(true);
  }
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!hopping || element === null) return;
    // The spinner inside also fires animation events: only the hop of this element ends it.
    const end = (event: Event) => {
      if (event.target === element) setHopping(false);
    };
    element.addEventListener("animationend", end);
    return () => element.removeEventListener("animationend", end);
  }, [hopping]);
  return (
    <span
      ref={root}
      data-slot="upload-veil"
      data-busy={busy ? "true" : undefined}
      data-hopping={hopping ? "true" : undefined}
      className={cn("relative inline-flex shrink-0 overflow-hidden", hopping && "animate-upload-hop", className)}
    >
      {children}
      <span
        aria-hidden
        data-part="veil"
        className={cn(
          "pointer-events-none absolute inset-0 grid place-items-center bg-scrim transition-opacity duration-500",
          busy ? "opacity-100" : "opacity-0",
        )}
      >
        {busy ? (
          <span className="grid size-10 place-items-center rounded-full bg-scrim shadow-[0_0_0_3px_var(--color-on-scrim)]">
            <svg viewBox="0 0 24 24" fill="none" className="size-6 animate-spin">
              <circle cx="12" cy="12" r="9" strokeWidth="3" className="stroke-on-scrim/30" />
              <path d="M12 3a9 9 0 0 1 9 9" strokeWidth="3" strokeLinecap="round" className="stroke-on-scrim" />
            </svg>
          </span>
        ) : null}
      </span>
    </span>
  );
}
