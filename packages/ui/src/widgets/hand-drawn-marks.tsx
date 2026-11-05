/* Lucian UX/UI Prompt #392 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#392 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "../lib/utils.ts";

export const PEN_STYLES = ["underline", "circle", "box", "strike"] as const;
export type PenStyle = (typeof PEN_STYLES)[number];

export interface PenMark {
  id: string;
  /** Half-open range [start, end) of UTF-16 code units of the host's text (what `textContent` counts). */
  start: number;
  end: number;
  style: PenStyle;
}

export interface PenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A small seeded random generator (mulberry32): the same mark wobbles the same way on every redraw. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fix = (n: number) => n.toFixed(1);

/**
 * The SVG path of one pen stroke around `rect` (one line of the marked words), as the element draws them: a sagging
 * underline, a strike a little above the middle, a box of four wobbly corners, or a loose loop that overshoots its
 * start. `pass` 1 is the second, slightly different stroke that makes it look hand-drawn.
 */
export function penPath(rect: PenRect, style: PenStyle, pass: 0 | 1, random: () => number): string {
  const j = (n: number) => (random() - 0.5) * 2 * n;
  const { x, y, w, h } = rect;
  const s = pass ? 1.6 : 1;
  switch (style) {
    case "underline":
      return `M${fix(x - 2)} ${fix(y + h - 1 + j(1.5))} Q${fix(x + w / 2)} ${fix(y + h + 3 * s + j(2))} ${fix(x + w + 3)} ${fix(y + h - 2 + j(1.5))}`;
    case "strike":
      return `M${fix(x - 3)} ${fix(y + h * 0.55 + j(2))} Q${fix(x + w / 2)} ${fix(y + h * 0.45 + j(3))} ${fix(x + w + 3)} ${fix(y + h * 0.52 + j(2))}`;
    case "box": {
      const points = [
        [x - 4 + j(1.5), y - 1 + j(1.5)],
        [x + w + 4 + j(1.5), y - 2 + j(1.5)],
        [x + w + 3 + j(1.5), y + h + 2 + j(1.5)],
        [x - 3 + j(1.5), y + h + 1 + j(1.5)],
        [x - 4 + j(1), y - 3 + j(1)],
      ];
      return `M${points.map(([px, py]) => `${fix(px ?? 0)} ${fix(py ?? 0)}`).join(" L")}`;
    }
    case "circle": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2 + 9;
      const ry = h / 2 + 5;
      const a0 = -2.2 + j(0.3);
      const out: string[] = [];
      for (let i = 0; i <= 26; i += 1) {
        const a = a0 + (i / 26) * (Math.PI * 2 + 0.6);
        const k = 1 + j(0.05) + i * 0.004 * s;
        out.push(`${fix(cx + Math.cos(a) * rx * k)} ${fix(cy + Math.sin(a) * ry * k)}`);
      }
      return `M${out.join(" L")}`;
    }
  }
}

/** Rough length of a stroke in px, for its drawing time (the element's 380 ms + 1.4 ms per px). */
export function penLength(rect: PenRect, style: PenStyle): number {
  if (style === "box") return 2 * (rect.w + rect.h) + 16;
  if (style === "circle") return Math.PI * (rect.w / 2 + 9 + rect.h / 2 + 5) * 1.1;
  return rect.w + 5;
}

/** Text nodes of `host` in order, leaving out anything inside `[data-marks-skip]` (buttons after the text). */
function textNodes(host: Element): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent?.closest("[data-marks-skip], svg")) continue;
    nodes.push(node as Text);
  }
  return nodes;
}

/** The host's text node and offset at text position `at`. */
function locate(nodes: readonly Text[], at: number): { node: Text; offset: number } | null {
  let passed = 0;
  for (const node of nodes) {
    const length = node.data.length;
    if (at <= passed + length) return { node, offset: at - passed };
    passed += length;
  }
  return null;
}

/** One box per line that the range [start, end) covers, relative to the host. */
function lineRects(host: Element, start: number, end: number): PenRect[] {
  const nodes = textNodes(host);
  const from = locate(nodes, start);
  const to = locate(nodes, end);
  if (!from || !to || typeof document.createRange !== "function") return [];
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  if (typeof range.getClientRects !== "function") return [];
  const origin = host.getBoundingClientRect();
  const lines: PenRect[] = [];
  for (const r of Array.from(range.getClientRects())) {
    if (r.width < 1) continue;
    const box = { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    const same = lines.find((line) => Math.abs(line.y - box.y) < box.h / 2);
    if (same) {
      const right = Math.max(same.x + same.w, box.x + box.w);
      same.x = Math.min(same.x, box.x);
      same.w = right - same.x;
    } else lines.push(box);
  }
  // Keep the strokes on the letters, not on the whole line box (the element's +4 / -8 at its size).
  return lines.map((line) => ({ x: line.x, y: line.y + line.h * 0.12, w: line.w, h: line.h * 0.76 }));
}

interface Stroke {
  key: string;
  d: string;
  second: boolean;
  draw: boolean;
  duration: number;
  delay: number;
}

/**
 * Hand-drawn marks over text (Lucian 392): underline, circle, box or strike-through drawn twice, a little wobbly, like
 * a pen. Put it inside the element that holds the text (which must be `position: relative`); each mark is a text range
 * of that element. Marks listed in `drawIds` are drawn stroke by stroke, one line after another (a mark the reader just
 * made); the others simply appear, so nothing moves on first render, and reduced motion shows them at once. The marks
 * follow the text when it reflows (font size, width). Decorative: the screen says what is marked in its own words.
 */
export function HandDrawnMarks({
  marks,
  drawIds = [],
  className,
}: {
  marks: readonly PenMark[];
  drawIds?: readonly string[];
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const signature = marks.map((m) => `${m.id}:${m.start}:${m.end}:${m.style}`).join("|");
  const drawing = drawIds.join("|");

  useLayoutEffect(() => {
    const host = svgRef.current?.parentElement;
    if (!host) return;
    const measure = () => {
      const next: Stroke[] = [];
      for (const mark of marks) {
        const draw = drawIds.includes(mark.id);
        lineRects(host, mark.start, mark.end).forEach((rect, line) => {
          ([0, 1] as const).forEach((pass) => {
            const random = seededRandom(`${mark.id}:${mark.style}:${line}:${pass}`);
            next.push({
              key: `${mark.id}-${mark.style}-${line}-${pass}`,
              d: penPath(rect, mark.style, pass, random),
              second: pass === 1,
              draw,
              duration: Math.round(380 + penLength(rect, mark.style) * 1.4),
              delay: line * 420 + pass * 200,
            });
          });
        });
      }
      setStrokes(next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
    // `signature` and `drawing` stand for `marks` and `drawIds`, which callers rebuild on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, drawing]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible text-pen", className)}
    >
      {strokes.map((stroke) => (
        <path
          key={stroke.key}
          d={stroke.d}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={stroke.second ? 1.6 : 2.4}
          opacity={stroke.second ? 0.7 : 1}
          pathLength={stroke.draw ? 1 : undefined}
          strokeDasharray={stroke.draw ? 1 : undefined}
          className={stroke.draw ? "motion-safe:animate-pen-draw" : undefined}
          style={
            stroke.draw
              ? ({
                  "--pen-length": 1,
                  "--pen-duration": `${stroke.duration}ms`,
                  "--pen-delay": `${stroke.delay}ms`,
                } as CSSProperties)
              : undefined
          }
        />
      ))}
    </svg>
  );
}
