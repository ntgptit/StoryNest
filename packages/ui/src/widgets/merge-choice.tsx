/* Lucian UX/UI Prompt #149 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#149 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check } from "lucide-react";
import { useId, type ReactNode } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export interface MergeOption<Side extends string> {
  side: Side;
  /** Who this version is from ("Mine", "On the server"); read before the content. */
  label: string;
  content: ReactNode;
}

/**
 * One place where two versions of a text disagree: both versions stacked as buttons, the author presses the one to
 * keep. Once a side is picked the other folds away and the kept one is marked; pressing it again undoes the choice.
 * The kept version dips in when it is picked (never on first render).
 */
export function MergeChoice<Side extends string>({
  label,
  options,
  chosen,
  onChoose,
  className,
}: {
  /** Name of the group ("Paragraph 3"). */
  label: string;
  options: readonly MergeOption<Side>[];
  chosen: Side | undefined;
  onChoose: (side: Side | undefined) => void;
  className?: string;
}) {
  const picks = useTriggerCount(chosen, (previous, next) => next !== undefined && previous !== next);
  const baseId = useId();
  return (
    <div role="group" aria-label={label} data-slot="merge-choice" className={cn("flex flex-col gap-1.5", className)}>
      {options.map((option) => {
        const selected = chosen === option.side;
        const id = `${baseId}-${option.side}`;
        return (
          <button
            key={option.side}
            type="button"
            aria-pressed={selected}
            // Named "Mine: <text>": who it is from, then the version itself.
            aria-labelledby={`${id}-label ${id}-content`}
            hidden={chosen !== undefined && !selected}
            onClick={() => onChoose(selected ? undefined : option.side)}
            className={cn(
              "flex min-h-12 w-full flex-col items-start gap-0.5 rounded-xs border-l-2 px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected ? "border-primary bg-transparent" : "border-input bg-muted hover:bg-accent",
              selected && picks > 0 && "animate-merge-pick",
            )}
          >
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <span id={`${id}-label`}>
                {option.label}
                <span className="sr-only">:</span>
              </span>
              {selected ? <Check aria-hidden className="size-3.5 text-primary" /> : null}
            </span>
            <span
              id={`${id}-content`}
              className="font-reader text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap"
            >
              {option.content}
            </span>
          </button>
        );
      })}
    </div>
  );
}
