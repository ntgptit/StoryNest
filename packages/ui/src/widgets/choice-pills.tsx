/* Lucian UX/UI Prompt #271 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#271 */ // token-check-ignore: element number in the required license line, not a colour
/* Lucian UX/UI Prompt #295 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#295 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export interface ChoicePillOption<T extends string> {
  value: T;
  label: string;
  /** A small number after the label (e.g. how many rows the filter keeps). */
  count?: number | undefined;
}

type Frame = { left: number; top: number; width: number; height: number };

/**
 * A choice of one option shown as pills on a track (the type chips of Lucian 271 and the request type of Lucian 295):
 * a raised pill slides to the chosen option, and the pills wrap onto more rows on a narrow screen (the pill follows
 * them there too). Radix RadioGroup underneath, so it is a real radio group: Tab enters at the chosen pill, the arrow
 * keys move and choose. `value` may be "" for "nothing chosen yet" (a required choice the person has not made).
 * The pill is placed without motion on first render and only slides when the value changes.
 * Extra props (id, aria-label, aria-labelledby, aria-describedby) go to the group element.
 */
export function ChoicePills<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroupPrimitive.Root>, "value" | "onValueChange" | "defaultValue"> & {
  value: T | "";
  onValueChange: (value: T) => void;
  options: readonly ChoicePillOption<T>[];
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const changed = useTriggerCount(value, (previous, next) => previous !== "" && previous !== next);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const measure = () => {
      const checked = group.querySelector<HTMLElement>('[role="radio"][data-state="checked"]');
      const next =
        checked && checked.offsetWidth > 0
          ? {
              left: checked.offsetLeft,
              top: checked.offsetTop,
              width: checked.offsetWidth,
              height: checked.offsetHeight,
            }
          : null;
      setFrame((current) =>
        current !== null &&
        next !== null &&
        current.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    };
    measure();
    const resizes = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    resizes?.observe(group);
    return () => resizes?.disconnect();
  }, [value, options]);

  return (
    <RadioGroupPrimitive.Root
      ref={groupRef}
      data-slot="choice-pills"
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={cn("relative flex w-fit max-w-full flex-wrap gap-0.5 rounded-2xl bg-muted p-[3px]", className)}
      {...props}
    >
      {frame ? (
        <span
          aria-hidden
          data-part="pill"
          className={cn(
            "pointer-events-none absolute top-0 left-0 rounded-full bg-background shadow-sm ring-1 ring-border dark:bg-input/40",
            changed > 0 && "transition-[translate,width,height] duration-400 ease-pill",
          )}
          style={{ translate: `${frame.left}px ${frame.top}px`, width: frame.width, height: frame.height }}
        />
      ) : null}
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "relative inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors duration-250 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:text-foreground pointer-coarse:min-h-11",
            // Without a measured pill (first paint, jsdom) the chosen option keeps its own background.
            !frame && option.value === value && "bg-background shadow-sm",
          )}
        >
          {option.label}
          {option.count === undefined ? null : (
            <>
              {/* The space keeps label and number apart in the accessible name ("Replies 5"). */}{" "}
              <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
            </>
          )}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
