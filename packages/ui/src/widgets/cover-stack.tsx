/* Lucian UX/UI Prompt #369 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#369 */ // token-check-ignore: element number in the required license line, not a colour
import type { CSSProperties } from "react";

import { cn } from "../lib/utils.ts";

export interface StackCover {
  /** Public image URL, or null for a story without a cover (a blank card stands in). */
  url: string | null;
}

// Resting tilt by depth (front card first), like a hand-made pile; fixed so server and client render the same.
const TILT = [-2, 5, -7];

/**
 * Up to three covers piled up as a thumbnail (e.g. of a reading list). Hovering or focusing the surrounding `group`
 * (the row's link) fans them out a little; the fan is decorative, so it only moves when motion is allowed, and the
 * pile itself is `aria-hidden` (the row's text names the list). An empty list shows one blank card.
 */
export function CoverStack({ covers, className }: { covers: readonly StackCover[]; className?: string }) {
  const shown = covers.slice(0, 3);
  const pile = shown.length === 0 ? [{ url: null }] : shown;
  // Back to front: the first cover of the list ends up on top.
  const layers = [...pile].reverse();
  return (
    <span aria-hidden className={cn("relative block h-14 w-12 shrink-0", className)}>
      {layers.map((cover, index) => {
        const depth = index - (layers.length - 1); // 0 for the front card, negative behind it
        const style = {
          "--rest": `translate(${depth * 1.5}px, ${depth * -1.5}px) rotate(${TILT[-depth] ?? 0}deg)`,
          "--fan": `translate(${depth * 6}px, ${depth * -2}px) rotate(${depth * 9 + 2}deg)`,
          transitionDelay: `${(layers.length - 1 - index) * 30}ms`,
        } as CSSProperties;
        return (
          <span
            key={index}
            style={style}
            className="absolute inset-x-1 inset-y-0 overflow-hidden rounded-sm border bg-muted shadow-sm [transform:var(--rest)] transition-transform duration-700 ease-rise motion-safe:group-hover:[transform:var(--fan)] motion-safe:group-focus-visible:[transform:var(--fan)]"
          >
            {cover.url ? <img src={cover.url} alt="" loading="lazy" className="size-full object-cover" /> : null}
          </span>
        );
      })}
    </span>
  );
}
