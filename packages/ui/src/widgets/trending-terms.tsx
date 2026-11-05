/* Lucian UX/UI Prompt #322 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#322 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ArrowDown, ArrowUp, ChevronDown, Minus, TrendingUp } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { cn } from "../lib/utils.ts";

export interface TrendingTerm {
  term: string;
  rank: number;
  /** Places gained since the window before (positive = up), 0 = same place, null = new in the list. */
  change: number | null;
}

export interface TrendingTermsText {
  /** Caption before the rolling line ("Trending"). */
  title: string;
  /** Name of the button that opens the list. */
  open: string;
  close: string;
  /** Name of the list. */
  list: string;
  /** Marker text: "new", "up 2", "down 1", "same". */
  isNew: string;
  up: (places: number) => string;
  down: (places: number) => string;
  same: string;
  /** Name of a term's button ("Search for rồng lửa"). */
  pick: (term: string) => string;
}

const ROLL_MS = 2_500;

function Marker({ change, text }: { change: number | null; text: TrendingTermsText }) {
  if (change === null) {
    return (
      <span className="rounded bg-primary/15 px-1 text-xs font-semibold text-primary uppercase">{text.isNew}</span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center text-xs text-chart-2" aria-label={text.up(change)}>
        <ArrowUp aria-hidden className="size-3" />
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center text-xs text-destructive" aria-label={text.down(-change)}>
        <ArrowDown aria-hidden className="size-3" />
        {-change}
      </span>
    );
  }
  return <Minus aria-label={text.same} className="size-3 text-muted-foreground" />;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Trending searches (Lucian 322): one line that rolls through the top terms, each with its rank and an up, down or
 * new marker. Press the line to unfold the full list; when the list is refreshed, the terms whose place changed
 * flash once in their new places. Press a term to hand it to `onPick` (e.g. type it into the search box);
 * the list folds away. The line does not roll under reduced motion, while the list is open, or while it has focus
 * or the pointer.
 */
export function TrendingTerms({
  items,
  text,
  onPick,
  className,
}: {
  items: readonly TrendingTerm[];
  text: TrendingTermsText;
  onPick: (term: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [held, setHeld] = useState(false);
  const listId = useId();

  // A refreshed list: the rows whose place changed flash once (derived state; nothing flashes on the first render).
  const order = items.map((item) => item.term);
  const signature = order.join("|");
  const [drawn, setDrawn] = useState({ signature, order, moved: new Set<string>(), generation: 0 });
  if (drawn.signature !== signature) {
    const moved = new Set(order.filter((term, i) => drawn.order[i] !== term));
    setDrawn({ signature, order, moved, generation: drawn.generation + 1 });
  }

  useEffect(() => {
    if (open || held || items.length < 2 || reducedMotion()) return;
    const timer = window.setInterval(() => setCurrent((i) => (i + 1) % items.length), ROLL_MS);
    return () => window.clearInterval(timer);
  }, [open, held, items.length]);

  if (items.length === 0) return null;
  const shown = items[current % items.length] ?? items[0];

  return (
    <div
      data-slot="trending-terms"
      className={cn("w-full rounded-xl border bg-card", className)}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? text.close : text.open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
      >
        <TrendingUp aria-hidden className="size-4 shrink-0 text-primary" />
        <span className="shrink-0 font-semibold">{text.title}</span>
        <span aria-hidden className="relative h-5 flex-1 overflow-hidden">
          {shown ? (
            <span
              key={current}
              className={cn("absolute inset-0 flex items-center gap-2", current > 0 && "animate-trend-roll")}
            >
              <span className="font-semibold tabular-nums text-primary">{shown.rank}</span>
              <span className="truncate">{shown.term}</span>
              <Marker change={shown.change} text={text} />
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      <div
        id={listId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-450 ease-unfold",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <div className="overflow-hidden">
          <ol aria-label={text.list} className="flex flex-col gap-0.5 px-2 pb-2">
            {items.map((item) => (
              <li key={drawn.moved.has(item.term) ? `${item.term}-${drawn.generation}` : item.term}>
                <button
                  type="button"
                  aria-label={text.pick(item.term)}
                  onClick={() => {
                    onPick(item.term);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                    drawn.generation > 0 && drawn.moved.has(item.term) && "animate-trend-flash",
                  )}
                >
                  <span className="w-5 text-right font-semibold tabular-nums text-primary">{item.rank}</span>
                  <span className="flex-1 truncate">{item.term}</span>
                  <Marker change={item.change} text={text} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
