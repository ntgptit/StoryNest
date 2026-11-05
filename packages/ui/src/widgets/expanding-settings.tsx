/* Lucian UX/UI Prompt #023 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#023 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Label } from "../components/label.tsx";
import { Switch } from "../components/switch.tsx";
import { cn } from "../lib/utils.ts";

/** Delay between two switches going off with "Turn all off" (the element's 120 ms). */
const STAGGER_MS = 120;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export interface ExpandingSetting {
  id: string;
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  /** Finer options that unfold below the row while it is switched on. */
  details?: ReactNode;
}

/**
 * A list of switches whose finer options unfold below them while they are on (Lucian 023). A switched-off row's icon
 * fades to gray; the badge counts the rows that are on. "Turn all off" switches the rows off one by one from the top
 * (all at once under reduced motion) and then calls `onTurnAllOff` once, so the host saves a single change.
 * Nothing moves on first render: the details of a row that starts on are simply open.
 */
export function ExpandingSettings({
  items,
  summary,
  turnAllOff,
  className,
}: {
  items: readonly ExpandingSetting[];
  /** Badge text from the number of rows that are on, e.g. (n) => n ? `${n} on` : "All off". */
  summary?: ((on: number) => string) | undefined;
  turnAllOff?: { label: string; onTurnAllOff: () => void; disabled?: boolean | undefined } | undefined;
  className?: string;
}) {
  const baseId = useId();
  /** Rows already shown as off while "Turn all off" runs down the list. */
  const [goingOff, setGoingOff] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef<number[]>([]);
  /** Rows the reader switched on here: only their details rise in (a row that starts on is simply open). */
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  // Once the host's values say off, the temporary overrides are no longer needed.
  const anyOn = items.some((item) => item.checked);
  useEffect(() => {
    if (!anyOn) setGoingOff(new Set());
  }, [anyOn]);

  const shown = (item: ExpandingSetting) => item.checked && !goingOff.has(item.id);
  const onCount = items.filter(shown).length;

  const runTurnAllOff = () => {
    if (!turnAllOff) return;
    const on = items.filter((item) => item.checked && !item.disabled);
    if (prefersReducedMotion() || on.length < 2) {
      turnAllOff.onTurnAllOff();
      return;
    }
    on.forEach((item, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setGoingOff((current) => new Set(current).add(item.id));
          if (index === on.length - 1) turnAllOff.onTurnAllOff();
        }, index * STAGGER_MS),
      );
    });
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {summary ? (
        <div className="flex justify-end pb-2">
          <span
            aria-live="polite"
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums transition-colors duration-300",
              onCount > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {summary(onCount)}
          </span>
        </div>
      ) : null}
      {items.map((item) => {
        const on = shown(item);
        const switchId = `${baseId}-${item.id}`;
        const detailsId = `${switchId}-details`;
        const open = on && item.details !== undefined && item.details !== null;
        return (
          <div key={item.id} className="border-t first:border-t-0">
            <div className="flex items-center gap-3 py-3">
              <span
                aria-hidden
                className={cn(
                  "grid size-10 flex-none place-items-center rounded-xl bg-primary text-primary-foreground transition-[filter,opacity] duration-500 ease-soft [&_svg]:size-5",
                  on ? "" : "opacity-45 grayscale",
                )}
              >
                {item.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Label htmlFor={switchId}>{item.label}</Label>
                <p id={`${switchId}-description`} className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <Switch
                id={switchId}
                checked={on}
                disabled={item.disabled}
                aria-describedby={`${switchId}-description`}
                aria-controls={item.details ? detailsId : undefined}
                aria-expanded={item.details ? open : undefined}
                onCheckedChange={(checked) => {
                  if (checked) setUnfolded((current) => new Set(current).add(item.id));
                  item.onCheckedChange(checked);
                }}
              />
            </div>
            {item.details ? (
              <div
                id={detailsId}
                className="grid transition-[grid-template-rows] duration-550 ease-soft"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                inert={!open}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={cn(
                      "mb-3 ml-13 rounded-xl bg-muted p-3",
                      open ? (unfolded.has(item.id) ? "animate-details-rise" : "") : "opacity-0",
                    )}
                  >
                    {item.details}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {turnAllOff ? (
        <button
          type="button"
          className="mt-2 h-11 rounded-xl bg-muted text-sm font-semibold text-muted-foreground transition-[background-color,color,transform] duration-300 ease-spring hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-98 disabled:opacity-50"
          disabled={turnAllOff.disabled || onCount === 0}
          onClick={runTurnAllOff}
        >
          {turnAllOff.label}
        </button>
      ) : null}
    </div>
  );
}
