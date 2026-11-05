/* Lucian UX/UI Prompt #220 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#220 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "../lib/utils.ts";

/** Where the selected text is on screen (viewport coordinates, as getBoundingClientRect gives them). */
export interface SelectionRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

/** Text selected inside exactly one block of a container. */
export interface BlockSelection {
  /** Value of the block's id attribute. */
  blockId: string;
  text: string;
  /**
   * Where `text` (trimmed) sits in the block's own text, in UTF-16 code units: [start, end). Text inside
   * `[data-marks-skip]` elements of the block (buttons after the text) is not counted.
   */
  start: number;
  end: number;
  rect: SelectionRect;
}

/** Gap between the selection and the toolbar; on touch screens the toolbar goes below, clear of the native handles. */
const GAP_PX = 8;
const TOUCH_GAP_PX = 28;
/** Do not put the toolbar higher than this (sticky header and toolbars): it flips below the selection instead. */
const MIN_TOP_PX = 120;
const EDGE_PX = 8;
/** Selection events arrive in bursts while a handle is dragged: wait for a short pause before reading it. */
const SETTLE_MS = 120;

/** Text length of `block` before the boundary (`node`, `offset`), leaving out `[data-marks-skip]` parts. */
function textOffset(block: Element, node: Node, offset: number): number {
  const before = document.createRange();
  before.setStart(block, 0);
  before.setEnd(node, offset);
  let passed = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current.parentElement?.closest("[data-marks-skip], svg")) continue;
    const text = current as Text;
    if (text === node) return passed + offset;
    if (!before.intersectsNode(text)) break;
    passed += text.data.length;
  }
  return passed;
}

function blockOf(node: Node | null, attribute: string): Element | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return element?.closest(`[${attribute}]`) ?? null;
}

/**
 * The current text selection when it lies inside one block (an element carrying `attribute`) of `containerRef`, or
 * null. It is read once the selection settles: after the mouse button is released, or a short pause in touch or
 * keyboard selection. It follows scrolling, ends with Esc, and is kept while the pointer is inside `keepRef` (the
 * toolbar), whose buttons would otherwise clear it on press. `clear()` drops it and the page selection.
 */
export function useBlockSelection(
  containerRef: RefObject<Element | null>,
  keepRef: RefObject<Element | null>,
  attribute = "data-block-id",
): { selection: BlockSelection | null; clear: () => void } {
  const [selection, setSelection] = useState<BlockSelection | null>(null);
  const keeping = useRef(false);

  const clear = useCallback(() => {
    keeping.current = false;
    setSelection(null);
    try {
      document.getSelection()?.removeAllRanges();
    } catch {
      // nothing selected
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pointerDown = false;
    let frame = 0;

    const read = () => {
      const current = document.getSelection();
      if (!current || current.isCollapsed || current.rangeCount === 0) {
        if (!keeping.current) setSelection(null);
        return;
      }
      const block = blockOf(current.anchorNode, attribute);
      const text = current.toString().trim();
      if (
        !block ||
        block !== blockOf(current.focusNode, attribute) ||
        !containerRef.current?.contains(block) ||
        text === ""
      ) {
        setSelection(null);
        return;
      }
      const range = current.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const raw = range.toString();
      const lead = raw.length - raw.trimStart().length;
      const start = textOffset(block, range.startContainer, range.startOffset) + lead;
      setSelection({
        blockId: block.getAttribute(attribute) ?? "",
        text,
        start,
        end: start + text.length,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!pointerDown) timer = setTimeout(read, SETTLE_MS);
    };
    const onPointerDown = (event: PointerEvent) => {
      keeping.current = keepRef.current?.contains(event.target as Node) ?? false;
      if (!keeping.current) pointerDown = true;
    };
    const onPointerUp = () => {
      if (!pointerDown) return;
      pointerDown = false;
      schedule();
    };
    const onScroll = () => {
      if (frame === 0)
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          setSelection((current) => {
            if (current === null) return null;
            const range = document.getSelection()?.rangeCount ? document.getSelection()?.getRangeAt(0) : undefined;
            if (!range) return current;
            const rect = range.getBoundingClientRect();
            return { ...current, rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width } };
          });
        });
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };

    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      clearTimeout(timer);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [attribute, containerRef, keepRef]);

  return { selection, clear };
}

function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Small floating toolbar for selected text: it pops up over the selection (below it on touch screens, where the
 * system's own selection menu sits above, and when there is no room above), stays inside the screen edges and follows
 * the selection while the page scrolls. `rect` null hides it. Esc inside it calls `onDismiss`. It appears only after
 * the reader selects something, so nothing moves on first render.
 */
export function SelectionToolbar({
  rect,
  label,
  onDismiss,
  toolbarRef,
  children,
  className,
}: {
  rect: SelectionRect | null;
  /** Accessible name of the toolbar, e.g. "Quote tools". */
  label: string;
  onDismiss: () => void;
  /** The toolbar element, for useBlockSelection's `keepRef`. */
  toolbarRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = toolbarRef.current;
    if (!node) return;
    const next = { width: node.offsetWidth, height: node.offsetHeight };
    setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
  }, [rect, toolbarRef]);

  if (!rect) return null;

  // Only read in the browser: there is never a selection while rendering on the server.
  const coarse = isCoarsePointer();
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const half = size.width / 2;
  const centre = rect.left + rect.width / 2;
  const left = Math.min(Math.max(centre, half + EDGE_PX), Math.max(half + EDGE_PX, viewportWidth - half - EDGE_PX));
  const above = !coarse && rect.top - GAP_PX - size.height >= MIN_TOP_PX;
  const top = above ? rect.top - GAP_PX - size.height : rect.bottom + (coarse ? TOUCH_GAP_PX : GAP_PX);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onDismiss();
    }
  };

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={label}
      data-slot="selection-toolbar"
      data-side={above ? "top" : "bottom"}
      onKeyDown={onKeyDown}
      // Keeps the text selected when a button is pressed with the mouse.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "fixed z-40 flex items-center gap-0.5 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-selection-tools-in",
        above ? "origin-bottom" : "origin-top",
        className,
      )}
      style={{ left: left - half, top }}
    >
      {children}
    </div>
  );
}
