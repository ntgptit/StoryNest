/* Lucian UX/UI Prompt #288 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#288 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

// useLayoutEffect warns during server rendering; the first measure only matters in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Long text clamped to a few lines with a fade at the bottom and a "Show more / Show less" toggle. Pressing it grows
 * the box to the text's real height while the fade lifts; collapsing shrinks it again and, if the start of the text
 * has scrolled away, brings it back into view so the reader keeps their place. The toggle only appears when the text
 * really overflows (measured, and re-measured when the width changes). The whole text is always in the DOM, so search
 * engines and screen readers get all of it. Nothing animates on first render.
 */
export function ExpandableText({
  children,
  lines = 6,
  moreLabel,
  lessLabel,
  className,
}: {
  children: ReactNode;
  /** Lines shown while collapsed. */
  lines?: number;
  moreLabel: string;
  lessLabel: string;
  /** Text styles (size, leading, whitespace): applied to the clamped box, so the clamp follows its line height. */
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const measure = useCallback(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const height = content.offsetHeight;
    setFullHeight(height);
    // Only judged while collapsed: expanded, the box is as tall as the text by design.
    if (!expandedRef.current) setOverflows(height > box.clientHeight + 1);
  }, []);

  useBrowserLayoutEffect(() => {
    measure();
  }, [measure, children, lines]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) return;
    const root = rootRef.current;
    if (root && root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  const maxHeight = expanded && fullHeight > 0 ? `${fullHeight}px` : `${lines}lh`;

  return (
    <div ref={rootRef} data-slot="expandable-text" className="flex scroll-mt-20 flex-col items-start gap-1">
      <div
        ref={boxRef}
        id={id}
        data-state={expanded ? "expanded" : "collapsed"}
        className={cn("relative w-full overflow-hidden [transition:max-height_0.65s_var(--ease-unfold)]", className)}
        style={{ maxHeight } as CSSProperties}
      >
        <div ref={contentRef}>{children}</div>
        <div
          aria-hidden
          data-part="fade"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-[2lh] bg-linear-to-b from-transparent to-background transition-opacity duration-400",
            overflows && !expanded ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      {overflows ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 py-1 has-[>svg]:px-0"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={toggle}
        >
          {expanded ? lessLabel : moreLabel}
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform duration-350", expanded && "rotate-180")}
          />
        </Button>
      ) : null}
    </div>
  );
}
