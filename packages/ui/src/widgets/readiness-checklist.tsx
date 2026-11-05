/* Lucian UX/UI Prompt #014 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#014 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check } from "lucide-react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export interface ReadinessItem {
  id: string;
  label: string;
  done: boolean;
  /** What to do about it, shown under the label while the item is not done. */
  hint?: string | undefined;
}

export interface ReadinessStateLabels {
  done: string;
  todo: string;
}

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * A read-only checklist of conditions the host computes (Lucian 014): each row is a circle that fills with a drawn
 * check when its condition holds, and a progress ring in the header counts them, turning into a check mark when all
 * are met. The host decides what the items are; this only shows them. Nothing animates on first render: an item pops
 * and draws its check only when it turns done, the ring only moves when the count changes.
 * Screen readers get each item's state after its label (`stateLabels`) and the `summary` in a polite live region.
 */
export function ReadinessChecklist({
  id,
  title,
  summary,
  items,
  stateLabels,
  className,
}: {
  /** id of the root, e.g. for aria-describedby on the action it explains. */
  id?: string | undefined;
  title: string;
  /** Short status under the title ("2 of 3 ready", "Ready to publish"); announced politely when it changes. */
  summary: string;
  items: readonly ReadinessItem[];
  /** Visually hidden state after each item's label. */
  stateLabels: ReadinessStateLabels;
  className?: string | undefined;
}) {
  const doneCount = items.filter((item) => item.done).length;
  const all = items.length > 0 && doneCount === items.length;
  const moved = useTriggerCount(doneCount, (previous, next) => previous !== next);

  return (
    <div
      id={id}
      data-slot="readiness-checklist"
      data-complete={all || undefined}
      className={cn("flex flex-col", className)}
    >
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p aria-live="polite" className={cn("text-xs text-muted-foreground", all && "font-medium text-primary")}>
            {summary}
          </p>
        </div>
        <div aria-hidden className="relative size-10 shrink-0">
          <svg viewBox="0 0 48 48" className="size-full -rotate-90">
            <circle cx="24" cy="24" r={RING_RADIUS} className="fill-none stroke-muted" strokeWidth={5} />
            <circle
              cx="24"
              cy="24"
              r={RING_RADIUS}
              data-part="ring"
              className={cn(
                "fill-none stroke-primary",
                moved > 0 && "[transition:stroke-dashoffset_0.7s_var(--ease-spring)]",
              )}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - (items.length === 0 ? 0 : doneCount / items.length))}
            />
          </svg>
          {all ? (
            <span
              key={moved}
              className={cn(
                "absolute inset-2 grid place-items-center rounded-full bg-primary text-primary-foreground",
                moved > 0 && "animate-check-pop",
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : (
            <span className="absolute inset-0 grid place-items-center text-[0.65rem] font-semibold tabular-nums">
              {doneCount}/{items.length}
            </span>
          )}
        </div>
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <ChecklistRow key={item.id} item={item} stateLabels={stateLabels} />
        ))}
      </ul>
    </div>
  );
}

function ChecklistRow({ item, stateLabels }: { item: ReadinessItem; stateLabels: ReadinessStateLabels }) {
  const turnedDone = useTriggerCount(item.done, (previous, next) => !previous && next);
  return (
    <li data-item={item.id} data-done={item.done || undefined} className="flex items-start gap-3 border-t py-2.5">
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
          item.done ? "text-primary-foreground" : "shadow-[inset_0_0_0_2px_var(--border)]",
        )}
      >
        {item.done ? (
          <span key={turnedDone} className="absolute inset-0 grid place-items-center">
            <span className={cn("absolute inset-0 rounded-full bg-primary", turnedDone > 0 && "animate-check-pop")} />
            <svg viewBox="0 0 20 20" className="relative size-full">
              <path
                d="M5.8 10.4l2.9 2.9 5.6-6.1"
                pathLength={1}
                strokeDasharray={1}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(turnedDone > 0 && "animate-draw-in [animation-delay:0.12s]")}
              />
            </svg>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("text-sm", item.done ? "text-muted-foreground" : "font-medium")}>
          {item.label}
          <span className="sr-only"> ({item.done ? stateLabels.done : stateLabels.todo})</span>
        </span>
        {!item.done && item.hint ? <span className="text-xs text-muted-foreground">{item.hint}</span> : null}
      </span>
    </li>
  );
}
