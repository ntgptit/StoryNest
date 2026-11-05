/* Lucian UX/UI Prompt #020 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#020 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

export interface SwatchOption<T extends string> {
  value: T;
  /** Accessible and visible name ("Sepia"). */
  label: string;
  /** Classes that paint the swatch (token colours only), e.g. "bg-paper-sepia text-ink-sepia". */
  className: string;
  /** Drawn inside the swatch, e.g. "Aa" in the theme's ink. */
  content?: ReactNode;
}

/** Swatch and gap of the row (size-11, gap-3): the ring glides by whole steps of their sum. */
const STEP = "(var(--size-touch) + 0.75rem)";

/**
 * A row of colour swatches picked like radio buttons (adapted from Lucian 020): the selection ring glides to the pick
 * and the picked name rolls over beside the label. Arrow keys move and pick (roving tabindex, one tab stop).
 * `onChange` also gets the pressed swatch, e.g. to start a transition from it. Nothing moves on first render.
 */
export function SwatchPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly SwatchOption<T>[];
  value: T;
  onChange: (value: T, swatch: HTMLElement) => void;
  className?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[index];
  // The ring and the name only animate after the first paint.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const [seen, setSeen] = useState(value);
  const [rolls, setRolls] = useState(0);
  if (seen !== value) {
    setSeen(value);
    setRolls((n) => n + 1);
  }

  const pick = (i: number, focus: boolean) => {
    const option = options[i];
    const button = buttons.current[i];
    if (!option || !button) return;
    if (focus) button.focus();
    if (option.value !== value) onChange(option.value, button);
  };
  const onKeyDown = (event: KeyboardEvent, i: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    pick((i + delta + options.length) % options.length, true);
  };

  return (
    <div data-slot="swatch-picker" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span aria-hidden className="relative block min-w-0 flex-1 overflow-hidden text-muted-foreground">
          <span key={rolls} className={cn("block truncate", rolls > 0 && "motion-safe:animate-label-roll")}>
            {current?.label}
          </span>
        </span>
      </div>
      <div role="radiogroup" aria-label={label} className="relative flex w-fit gap-3">
        <span
          aria-hidden
          data-slot="swatch-ring"
          className={cn(
            "pointer-events-none absolute top-0 left-0 size-11 rounded-full border-2 border-foreground",
            settled && "[transition:transform_0.55s_var(--ease-spring)]",
          )}
          style={{ transform: `translateX(calc(${index} * ${STEP}))` }}
        />
        {options.map((option, i) => {
          const checked = i === index;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              tabIndex={checked ? 0 : -1}
              onClick={() => pick(i, false)}
              onKeyDown={(event) => onKeyDown(event, i)}
              className="group grid size-11 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-semibold shadow-[inset_0_0_0_1px_var(--border)] group-hover:scale-110 group-active:scale-90 [transition:scale_0.4s_var(--ease-spring)]",
                  option.className,
                )}
              >
                {option.content}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
