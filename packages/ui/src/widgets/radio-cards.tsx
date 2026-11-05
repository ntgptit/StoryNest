/* Lucian UX/UI Prompt #015 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#015 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useLayoutEffect, useRef, useState, type ComponentProps, type ComponentType } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description?: string | undefined;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }> | undefined;
}

type Frame = { top: number; height: number };

/**
 * A choice of one option shown as stacked cards (Lucian 015): each card has a radio dot, an icon, a label and a
 * description, and a highlighted frame slides to the chosen card. Radix RadioGroup underneath, so it is a real radio
 * group: Tab enters at the chosen card, the arrow keys move and choose, and it works inside a form (`name`).
 * The frame is placed without motion on first render (and whenever it is not measured, e.g. jsdom) and only slides
 * when the value changes; the dot pops in the same way.
 * Extra props (id, aria-describedby, aria-invalid from FormControl, aria-label) go to the group element.
 */
export function RadioCards<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroupPrimitive.Root>, "value" | "onValueChange" | "defaultValue"> & {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly RadioCardOption<T>[];
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const changed = useTriggerCount(value, (previous, next) => previous !== next);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const measure = () => {
      const checked = group.querySelector<HTMLElement>('[role="radio"][data-state="checked"]');
      const next =
        checked && checked.offsetHeight > 0 ? { top: checked.offsetTop, height: checked.offsetHeight } : null;
      setFrame((current) => (current?.top === next?.top && current?.height === next?.height ? current : next));
    };
    measure();
    const resizes = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    resizes?.observe(group);
    return () => resizes?.disconnect();
  }, [value]);

  return (
    <RadioGroupPrimitive.Root
      ref={groupRef}
      data-slot="radio-cards"
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={cn("relative flex flex-col gap-2.5", className)}
      {...props}
    >
      {frame ? (
        <span
          aria-hidden
          data-part="frame"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent to-70% shadow-[0_0_0_2px_var(--primary)]",
            changed > 0 && "transition-[translate,height] duration-550 ease-spring",
          )}
          style={{ translate: `0 ${frame.top}px`, height: frame.height }}
        />
      ) : null}
      {options.map((option) => {
        const Icon = option.icon;
        const checked = option.value === value;
        return (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            className={cn(
              "group relative flex w-full items-center gap-3.5 rounded-xl border bg-card p-4 text-left text-card-foreground outline-none transition-[transform,border-color] duration-400 ease-spring hover:border-foreground/25 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              // Without a measured frame (first paint, jsdom) the chosen card keeps its own outline.
              !frame && checked && "border-primary",
            )}
          >
            <span
              aria-hidden
              className="relative size-5 shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--border)] group-data-[state=checked]:shadow-[inset_0_0_0_2px_var(--primary)]"
            >
              <RadioGroupPrimitive.Indicator
                key={changed}
                className={cn("absolute inset-[4px] rounded-full bg-primary", changed > 0 && "animate-check-pop")}
              />
            </span>
            {Icon ? (
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground"
              >
                <Icon aria-hidden className="size-5" />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{option.label}</span>
              {option.description ? <span className="text-sm text-muted-foreground">{option.description}</span> : null}
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
