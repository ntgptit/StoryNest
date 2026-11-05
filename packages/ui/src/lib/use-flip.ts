"use client";

// Grid-to-list morph (adapted from Lucian UX/UI Prompt 308, MIT (c) 2026 Seokwoooo, lucianlabs.dev/uxui-prompt).

import { useLayoutEffect, useRef, type RefObject } from "react";

/** Elements that keep their identity across the layout change carry this attribute with a stable value. */
export const FLIP_KEY_ATTRIBUTE = "data-flip-key";
/** Set on the container while the morph plays, so card text can fade back in (`animate-morph-fade`). */
export const MORPHING_ATTRIBUTE = "data-morphing";

const STAGGER_MS = 25;
const MAX_STAGGER_STEPS = 12;
const DURATION_MS = 560;

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * FLIP between two layouts of the same items: call `capture()` right before the change (e.g. in the toggle's click
 * handler); after React has drawn the new layout, every `[data-flip-key]` element inside `containerRef` starts where
 * it was and glides (translate + scale) to where it is now, a little apart from each other. Nothing moves on the first
 * render or when `capture()` was not called, and nothing moves under reduced motion. The curve and duration are the
 * element's (`ease-morph`, 560ms), applied as Tailwind classes so they stay tokens.
 */
export function useFlip(containerRef: RefObject<HTMLElement | null>): () => void {
  const snapshot = useRef<Map<string, DOMRect> | null>(null);

  useLayoutEffect(() => {
    const before = snapshot.current;
    const container = containerRef.current;
    snapshot.current = null;
    if (!before || !container) return;
    const moved: HTMLElement[] = [];
    container.querySelectorAll<HTMLElement>(`[${FLIP_KEY_ATTRIBUTE}]`).forEach((el) => {
      const first = before.get(el.getAttribute(FLIP_KEY_ATTRIBUTE) ?? "");
      if (!first) return;
      const last = el.getBoundingClientRect();
      if (last.width === 0 || last.height === 0) return;
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / last.width;
      const sy = first.height / last.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      el.style.transformOrigin = "top left";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      el.style.transitionDelay = `${Math.min(moved.length, MAX_STAGGER_STEPS) * STAGGER_MS}ms`;
      moved.push(el);
    });
    if (moved.length === 0) return;
    container.setAttribute(MORPHING_ATTRIBUTE, "true");
    // Commit the inverted positions, then let the transition carry every element home.
    void container.offsetWidth;
    const transition = ["transition-transform", "duration-560", "ease-morph"];
    moved.forEach((el) => {
      el.classList.add(...transition);
      el.style.transform = "";
    });
    // Not cleared on re-render: a render during the morph must not leave the transition classes behind.
    window.setTimeout(
      () => {
        container.removeAttribute(MORPHING_ATTRIBUTE);
        moved.forEach((el) => {
          el.classList.remove(...transition);
          el.style.transformOrigin = "";
          el.style.transitionDelay = "";
        });
      },
      DURATION_MS + MAX_STAGGER_STEPS * STAGGER_MS + 50,
    );
  });

  return () => {
    const container = containerRef.current;
    if (!container || reducedMotion()) return;
    const rects = new Map<string, DOMRect>();
    container.querySelectorAll<HTMLElement>(`[${FLIP_KEY_ATTRIBUTE}]`).forEach((el) => {
      const key = el.getAttribute(FLIP_KEY_ATTRIBUTE);
      if (key) rects.set(key, el.getBoundingClientRect());
    });
    snapshot.current = rects;
  };
}
