/* Lucian UX/UI Prompt #018 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#018 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Minus, Plus } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** Head-shake at either end (the existing error shake). */
const SHAKE = "animate-shake";

/**
 * − value + stepper for a short list of named steps (adapted from Lucian 018): the value's name rolls up when it goes
 * up and down when it goes down, and pressing a button that cannot go further shakes the stepper's head instead of
 * doing nothing. The end buttons stay focusable (aria-disabled), so the shake also answers a keyboard press; arrow keys
 * step too. The value is announced politely. Nothing moves on first render.
 */
export function RollingStepper({
  label,
  valueText,
  position,
  canDecrease,
  canIncrease,
  onStep,
  decreaseLabel,
  increaseLabel,
  className,
}: {
  /** Group name, e.g. "Text size". */
  label: string;
  /** Name of the current step, e.g. "Large". */
  valueText: string;
  /** Index of the current step: tells the roll which way to go. */
  position: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onStep: (direction: 1 | -1) => void;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}) {
  // Roll: counts changes of position and remembers their direction ("adjust state while rendering", no effect).
  const [seen, setSeen] = useState(position);
  const [roll, setRoll] = useState({ count: 0, up: true });
  if (seen !== position) {
    setSeen(position);
    setRoll((r) => ({ count: r.count + 1, up: position > seen }));
  }
  // The shake restarts on the same element (no remount), so the pressed button keeps focus.
  const row = useRef<HTMLDivElement>(null);
  const shake = () => {
    const element = row.current;
    if (!element) return;
    element.classList.remove(SHAKE);
    void element.offsetWidth;
    element.classList.add(SHAKE);
  };

  const step = (direction: 1 | -1) => {
    if (direction === 1 ? canIncrease : canDecrease) onStep(direction);
    else shake();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const direction =
      event.key === "ArrowUp" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowDown" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (direction === 0) return;
    event.preventDefault();
    step(direction);
  };

  return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      data-slot="rolling-stepper"
      className={cn("flex flex-col gap-2", className)}
    >
      <span className="text-sm font-medium">{label}</span>
      <div
        ref={row}
        data-slot="rolling-stepper-row"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.classList.remove(SHAKE);
        }}
        className="flex w-fit items-center gap-3"
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={decreaseLabel}
          aria-disabled={!canDecrease}
          className="aria-disabled:opacity-50"
          onClick={() => step(-1)}
        >
          <Minus aria-hidden className="size-4" />
        </Button>
        <output aria-live="polite" className="block min-w-20 overflow-hidden text-center text-sm">
          <span
            key={roll.count}
            className={cn(
              "block truncate",
              roll.count > 0 && (roll.up ? "motion-safe:animate-label-roll" : "motion-safe:animate-label-drop"),
            )}
          >
            {valueText}
          </span>
        </output>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={increaseLabel}
          aria-disabled={!canIncrease}
          className="aria-disabled:opacity-50"
          onClick={() => step(1)}
        >
          <Plus aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}
