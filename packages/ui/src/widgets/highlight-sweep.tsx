/* Lucian UX/UI Prompt #281 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#281 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useState, type ReactNode } from "react";

/** How long the stroke stays on the text: the sweep, a pause and the fade (`--animate-highlight-sweep`). */
export const HIGHLIGHT_SWEEP_MS = 2800;

/**
 * Inline wrapper that sweeps a highlighter across its text once each time `play` goes up, line by line, holds it and
 * fades it out, so the eye finds the spot (a deep-link target, the place a reader left off). `play` 0 (the default)
 * draws nothing, so nothing moves on first render; the parent bumps it when the reader lands on the paragraph. Under
 * reduced motion the stroke is a static tint for the same time. Purely visual: no role, no announcement.
 */
export function HighlightSweep({ play = 0, children }: { play?: number; children: ReactNode }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (play <= 0) {
      setActive(0);
      return;
    }
    setActive(play);
    const timer = setTimeout(() => setActive(0), HIGHLIGHT_SWEEP_MS);
    return () => clearTimeout(timer);
  }, [play]);

  return active > 0 ? (
    // The key restarts the animation when the same paragraph is landed on again while it is still running.
    <span key={active} data-slot="highlight-sweep" className="highlight-sweep rounded-xs">
      {children}
    </span>
  ) : (
    <span data-slot="highlight-sweep">{children}</span>
  );
}
