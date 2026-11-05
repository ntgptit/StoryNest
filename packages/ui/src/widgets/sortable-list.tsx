/* Lucian UX/UI Prompt #255 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#255 */ // token-check-ignore: element number in the required license line, not a colour
/* Lucian UX/UI Prompt #317 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#317 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "../lib/utils.ts";

// useLayoutEffect warns during server rendering; measuring only matters in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** Rows glide to their new place (Lucian 317: 0.6 s on --ease-glide); the dropped one settles in 0.28 s (Lucian 255). */
const FLIP_MS = 600;
const LAND_MS = 280;
/** Distance from the top or bottom of the screen at which a drag starts scrolling the page. */
const EDGE_PX = 72;
/** Without a new answer from the caller (its list never changed), the dropped order is let go after this long. */
const HOLD_MS = 4000;

export type SortableLayout = "list" | "grid";

export interface SlotRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const moveTo = (order: readonly string[], id: string, index: number): string[] => {
  const rest = order.filter((other) => other !== id);
  rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id);
  return rest;
};

/**
 * The order while `draggedId` is held at `pointer`. `rects` are the slots as laid out now, in the current `order`.
 * - list: the dragged row goes after every other row whose middle is above the pointer (stable: moving past a row
 *   shifts that row by the dragged one's height, which keeps its middle on the same side of the pointer);
 * - grid: it takes the place of the card under the pointer, and stays put over a gap.
 */
export function orderAtPointer(
  layout: SortableLayout,
  order: readonly string[],
  draggedId: string,
  rects: readonly SlotRect[],
  pointer: { x: number; y: number },
): string[] {
  if (!order.includes(draggedId)) return [...order];
  if (layout === "list") {
    const above = rects.filter((rect) => rect.id !== draggedId && rect.top + rect.height / 2 < pointer.y).length;
    return moveTo(order, draggedId, above);
  }
  const over = rects.find(
    (rect) =>
      pointer.x >= rect.left &&
      pointer.x <= rect.left + rect.width &&
      pointer.y >= rect.top &&
      pointer.y <= rect.top + rect.height,
  );
  if (!over || over.id === draggedId) return [...order];
  return moveTo(order, draggedId, order.indexOf(over.id));
}

const sameItems = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

interface Drag {
  id: string;
  order: string[];
  /** lift: following the pointer; land: settling into its slot after the drop. */
  phase: "lift" | "land";
}

interface Pointer {
  id: string;
  pointerId: number;
  grabX: number;
  grabY: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  /** The sticky header's height: the top scroll zone starts below it. */
  topInset: number;
  /** Set once the pointer really moved: a press that starts near an edge does not scroll the page by itself. */
  moved: boolean;
  startOrder: string[];
}

/** Pointer travel (px) before a press counts as a drag that may scroll the page. */
const MOVE_SLOP_PX = 6;

const headerInset = () => {
  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--app-header-offset"),
  );
  return Number.isFinite(value) ? value : 0;
};

const flipTimers = new WeakMap<HTMLElement, number>();

/** Plays the "flying row" from where the element was (dx, dy away) to where it is now. */
function playFlip(element: HTMLElement, dx: number, dy: number) {
  window.clearTimeout(flipTimers.get(element));
  element.style.transition = "none";
  element.style.transform = `translate(${dx}px, ${dy}px)`;
  // Rows moving up come toward the viewer, rows moving down recede, so crossing paths stay readable.
  element.dataset.flip = dy > 0 || (dy === 0 && dx > 0) ? "up" : "down";
  void element.offsetWidth; // commit the start position before the transition
  element.style.transition = `transform ${FLIP_MS}ms var(--ease-glide)`;
  element.style.transform = "";
  flipTimers.set(
    element,
    window.setTimeout(() => {
      element.style.transition = "";
      delete element.dataset.flip;
    }, FLIP_MS + 50),
  );
}

/**
 * Reorder by dragging, with rows that fly to their new places. `ids` is the order the caller shows (its source of
 * truth); `onReorder` gets the complete new order once, on drop, and only when it changed. While the caller saves it
 * the dropped order stays on screen, until `ids` changes (an optimistic update, the reload, or a rollback, which then
 * flies the rows back) or a few seconds pass.
 *
 * - Drag starts on a DragHandle only (mouse, pen or touch; the handle has `touch-action: none`, so the page does not
 *   scroll instead). The item lifts and follows the pointer; the others move aside (FLIP) to open the gap where it will
 *   land, and the slot it will land in is outlined. Near the top or bottom of the screen the page scrolls. Escape or a
 *   cancelled pointer puts everything back.
 * - Any change of the order (a drop, the caller's move up/down buttons, a reload) is animated the same way, so the
 *   eye can follow the moved row. Nothing animates on the first render, and with reduced motion rows just jump.
 * - The keyboard route is the caller's own move buttons: the handle is pointer-only and hidden from assistive tech.
 *
 * The list element (`listRef`) must be the items' offset parent (give it `relative`).
 */
export function useSortableList({
  ids,
  onReorder,
  disabled = false,
  layout = "list",
}: {
  ids: readonly string[];
  onReorder: (ids: string[]) => void;
  disabled?: boolean;
  layout?: SortableLayout;
}) {
  const listElement = useRef<HTMLElement | null>(null);
  const listRef = useCallback((element: HTMLElement | null) => {
    listElement.current = element;
  }, []);
  const slots = useRef(new Map<string, HTMLElement>());
  const floats = useRef(new Map<string, HTMLElement>());
  const slotRefs = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const floatRefs = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const pointer = useRef<Pointer | null>(null);
  const scrollFrame = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const idsKey = ids.join(" ");
  const [held, setHeld] = useState<{ order: string[]; base: string } | null>(null);
  if (held !== null && held.base !== idsKey) setHeld(null); // the caller answered: show its order from now on
  useEffect(() => {
    if (held === null) return;
    const timer = window.setTimeout(() => setHeld(null), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [held]);

  const candidate = drag?.order ?? held?.order ?? null;
  const order = candidate !== null && sameItems(candidate, ids) ? candidate : [...ids];
  const orderRef = useRef(order);
  orderRef.current = order;

  // ---- flying rows (FLIP) ---------------------------------------------------------------------------------------
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const previousKey = useRef<string | null>(null);
  const orderKey = order.join(" ");
  useBrowserLayoutEffect(() => {
    // Every commit: remember where each slot is laid out (offsets ignore running transforms), and when the order
    // changed since the last commit, fly each moved slot from its old place. The held item is left to the pointer.
    const animate = previousKey.current !== null && previousKey.current !== orderKey && !prefersReducedMotion();
    const seen = new Set<string>();
    for (const [id, element] of slots.current) {
      seen.add(id);
      const next = { x: element.offsetLeft, y: element.offsetTop };
      const previous = positions.current.get(id);
      positions.current.set(id, next);
      if (!animate || !previous || id === dragRef.current?.id) continue;
      const dx = previous.x - next.x;
      const dy = previous.y - next.y;
      if (dx !== 0 || dy !== 0) playFlip(element, dx, dy);
    }
    for (const id of positions.current.keys()) if (!seen.has(id)) positions.current.delete(id);
    previousKey.current = orderKey;
  });

  // ---- drag -------------------------------------------------------------------------------------------------------
  const layoutRects = useCallback((): SlotRect[] => {
    const list = listElement.current;
    if (!list) return [];
    const base = list.getBoundingClientRect();
    return orderRef.current.flatMap((id) => {
      const element = slots.current.get(id);
      return element
        ? [
            {
              id,
              left: base.left + element.offsetLeft,
              top: base.top + element.offsetTop,
              width: element.offsetWidth,
              height: element.offsetHeight,
            },
          ]
        : [];
    });
  }, []);

  /** Keeps the held item under the pointer, wherever its slot is now. */
  const follow = useCallback(() => {
    const held = pointer.current;
    if (!held) return;
    const float = floats.current.get(held.id);
    const slot = layoutRects().find((rect) => rect.id === held.id);
    if (!float || !slot) return;
    float.style.transform = `translate(${held.x - held.grabX - slot.left}px, ${held.y - held.grabY - slot.top}px)`;
  }, [layoutRects]);

  const retarget = useCallback(() => {
    const held = pointer.current;
    const current = dragRef.current;
    if (!held || !current || current.phase !== "lift") return;
    const next = orderAtPointer(layout, current.order, held.id, layoutRects(), held);
    if (next.join(" ") !== current.order.join(" ")) setDrag({ ...current, order: next });
  }, [layout, layoutRects]);

  // After the order under the pointer changed, the held item's slot moved: put the item back under the pointer.
  useBrowserLayoutEffect(() => {
    if (drag?.phase === "lift") follow();
  }, [drag, follow]);

  const stopScroll = () => {
    window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0;
  };

  const scrollStep = useCallback(() => {
    scrollFrame.current = 0;
    const held = pointer.current;
    if (!held?.moved) return;
    const top = held.topInset + EDGE_PX;
    const speed =
      held.y < top
        ? -Math.ceil((top - held.y) / 4)
        : held.y > window.innerHeight - EDGE_PX
          ? Math.ceil((held.y - (window.innerHeight - EDGE_PX)) / 4)
          : 0;
    if (speed === 0) return;
    window.scrollBy(0, speed);
    follow();
    retarget();
    scrollFrame.current = window.requestAnimationFrame(scrollStep);
  }, [follow, retarget]);

  /** Removes the window listeners of the drag in progress. */
  const detach = useRef<(() => void) | null>(null);

  const finish = useCallback(
    (commit: boolean) => {
      const held = pointer.current;
      const current = dragRef.current;
      pointer.current = null;
      detach.current?.();
      detach.current = null;
      stopScroll();
      document.documentElement.style.removeProperty("user-select");
      if (!held || !current) return;
      const finalOrder = commit ? current.order : held.startOrder;
      setDrag({ id: held.id, order: finalOrder, phase: "land" });
      const float = floats.current.get(held.id);
      if (float) {
        float.style.transition = `transform ${LAND_MS}ms var(--ease-rise)`;
        float.style.transform = "";
      }
      window.setTimeout(() => {
        if (float) float.style.transition = "";
        setDrag((now) => (now?.id === held.id && now.phase === "land" ? null : now));
      }, LAND_MS + 10);
      if (commit && finalOrder.join(" ") !== held.startOrder.join(" ")) {
        setHeld({ order: finalOrder, base: idsKey });
        onReorder(finalOrder);
      }
    },
    [idsKey, onReorder],
  );

  // Escape while dragging puts the item back where it was.
  useEffect(() => {
    if (drag?.phase !== "lift") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      finish(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drag?.phase, finish]);

  useEffect(
    () => () => {
      stopScroll();
      detach.current?.();
    },
    [],
  );

  const onPointerMove = (event: globalThis.PointerEvent) => {
    const held = pointer.current;
    if (!held || held.pointerId !== event.pointerId) return;
    held.x = event.clientX;
    held.y = event.clientY;
    if (Math.abs(held.x - held.startX) + Math.abs(held.y - held.startY) > MOVE_SLOP_PX) held.moved = true;
    follow();
    retarget();
    if (scrollFrame.current === 0) scrollFrame.current = window.requestAnimationFrame(scrollStep);
  };
  const onPointerEnd = (event: globalThis.PointerEvent) => {
    if (pointer.current?.pointerId === event.pointerId) finish(event.type === "pointerup");
  };
  // The listeners added on pointerdown always call this render's handlers.
  const live = useRef({ move: onPointerMove, end: onPointerEnd });
  live.current = { move: onPointerMove, end: onPointerEnd };

  const slotRef = (id: string) => {
    let ref = slotRefs.current.get(id);
    if (!ref) {
      ref = (element) => {
        if (element) slots.current.set(id, element);
        else slots.current.delete(id);
      };
      slotRefs.current.set(id, ref);
    }
    return ref;
  };

  const floatRef = (id: string) => {
    let ref = floatRefs.current.get(id);
    if (!ref) {
      ref = (element) => {
        if (element) floats.current.set(id, element);
        else floats.current.delete(id);
      };
      floatRefs.current.set(id, ref);
    }
    return ref;
  };

  const handleProps = (id: string) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      // Not the row's long-press menu or a text selection: this press is a drag.
      event.stopPropagation();
      if (disabled || dragRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      const slot = layoutRects().find((rect) => rect.id === id);
      if (!slot) return;
      event.preventDefault();
      pointer.current = {
        id,
        pointerId: event.pointerId,
        grabX: event.clientX - slot.left,
        grabY: event.clientY - slot.top,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        topInset: headerInset(),
        moved: false,
        startOrder: [...orderRef.current],
      };
      // On the window, not the handle: reordering moves the item's DOM node, which drops any pointer capture.
      const move = (next: globalThis.PointerEvent) => live.current.move(next);
      const end = (next: globalThis.PointerEvent) => live.current.end(next);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      detach.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      };
      document.documentElement.style.setProperty("user-select", "none");
      setDrag({ id, order: [...orderRef.current], phase: "lift" });
    },
    onContextMenu: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      // A long press on the handle is the start of a drag, not the row menu.
      event.preventDefault();
      event.stopPropagation();
    },
  });

  return {
    /** The ids in the order to render them (the drag preview while dragging, then the dropped order until saved). */
    order,
    draggingId: drag?.id ?? null,
    phase: drag?.phase ?? null,
    layout,
    disabled,
    listRef,
    slotRef,
    floatRef,
    handleProps,
  };
}

export type SortableList = ReturnType<typeof useSortableList>;

type SortableItemProps<T extends ElementType> = {
  sortable: SortableList;
  id: string;
  as?: T;
  /** Classes of the visible item (border, background, padding): the part that lifts and moves. */
  className?: string;
  /** Classes of the slot itself (grid placement and the like). */
  slotClassName?: string;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
} & Omit<ComponentPropsWithoutRef<T>, "className" | "children">;

/**
 * One item of a sortable list: the slot (an `li` by default) stays in the layout and shows a dashed outline where the
 * item will land; inside it, the item itself follows the pointer and lifts (tilted a little, Lucian 255). Extra props
 * and the ref go to the slot, so it can also be a Radix `asChild` target (a context menu, say).
 */
export function SortableItem<T extends ElementType = "li">({
  sortable,
  id,
  as,
  className,
  slotClassName,
  children,
  ref,
  ...rest
}: SortableItemProps<T>) {
  const Tag: ElementType = as ?? "li";
  const slotRef = sortable.slotRef(id);
  const state = sortable.draggingId === id ? sortable.phase : undefined;
  return (
    <Tag
      {...rest}
      ref={(element: HTMLElement | null) => {
        slotRef(element);
        if (typeof ref === "function") ref(element);
        else if (ref) (ref as { current: HTMLElement | null }).current = element;
      }}
      data-dragging={state}
      className={cn(
        "group/sortable relative rounded-xl data-[dragging=lift]:z-30 data-[dragging=land]:z-30 data-[flip=up]:z-10 data-[dragging=lift]:bg-primary/5 data-[dragging=lift]:outline-2 data-[dragging=lift]:outline-primary/50 data-[dragging=lift]:outline-dashed",
        slotClassName,
      )}
    >
      <div ref={sortable.floatRef(id)} className="h-full">
        <div
          className={cn(
            "h-full transition-[transform,box-shadow,opacity] duration-200 group-data-[dragging=lift]/sortable:shadow-xl group-data-[flip=down]/sortable:opacity-90 group-data-[flip=up]/sortable:shadow-lg",
            sortable.layout === "grid"
              ? "group-data-[dragging=lift]/sortable:scale-[1.04] group-data-[dragging=lift]/sortable:rotate-3"
              : "group-data-[dragging=lift]/sortable:scale-[1.02] group-data-[dragging=lift]/sortable:rotate-1",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </Tag>
  );
}

/** The grip that starts a drag. Pointer-only (the move buttons are the keyboard route), so hidden from assistive tech. */
export function DragHandle({ sortable, id, className }: { sortable: SortableList; id: string; className?: string }) {
  return (
    <span
      aria-hidden
      data-part="drag-handle"
      data-disabled={sortable.disabled || undefined}
      {...sortable.handleProps(id)}
      className={cn(
        "flex touch-target shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground select-none hover:bg-accent hover:text-foreground active:cursor-grabbing data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
        className,
      )}
    >
      <GripVertical className="size-4" />
    </span>
  );
}
