/* Lucian UX/UI Prompt #010 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#010 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu.tsx";
import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export interface SplitButtonOption {
  /** Stable key (also used in tests). */
  id: string;
  label: string;
  /** Second line under the label. */
  description?: string | undefined;
  icon?: ReactNode;
  disabled?: boolean | undefined;
  onSelect: () => void;
}

/**
 * The main action and its alternatives in one control (Lucian 010): the left part runs `label`, the arrow on the right
 * opens a menu of `options` (Radix menu: arrow keys, Enter, Esc returns focus to the arrow). While `busy`, the main
 * part shows `busyLabel` (rolled in from below) and a bar fills along its bottom edge. Nothing moves on first render:
 * the roll only plays when the label changes.
 * `disabled` locks both parts; `busy` locks them as well, so a double click cannot run the action twice.
 */
export function SplitButton({
  label,
  busyLabel,
  busy = false,
  disabled = false,
  onClick,
  menuLabel,
  options,
  className,
  describedBy,
}: {
  label: string;
  /** Shown while `busy` (defaults to `label`). */
  busyLabel?: string | undefined;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Accessible name of the arrow (e.g. "More publish options"). */
  menuLabel: string;
  options: readonly SplitButtonOption[];
  className?: string | undefined;
  /** id of an element that explains the state (e.g. why the action is disabled). */
  describedBy?: string | undefined;
}) {
  const shown = busy ? (busyLabel ?? label) : label;
  const roll = useTriggerCount(shown, (previous, next) => previous !== next);
  const locked = disabled || busy;

  return (
    <div
      data-slot="split-button"
      data-state={busy ? "busy" : "idle"}
      className={cn(
        "inline-flex h-9 max-w-full items-stretch rounded-md bg-primary text-primary-foreground shadow-xs",
        locked && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={locked}
        aria-busy={busy || undefined}
        aria-describedby={describedBy}
        className="relative inline-flex min-w-0 flex-1 items-center overflow-hidden rounded-l-md px-4 text-sm font-medium outline-none transition-transform duration-450 ease-spring focus-visible:ring-[3px] focus-visible:ring-ring/50 enabled:hover:bg-primary-foreground/10 enabled:active:scale-[0.97] disabled:cursor-not-allowed data-[busy=true]:cursor-progress"
        data-busy={busy || undefined}
      >
        <span className="relative block overflow-hidden">
          <span key={roll} className={cn("block truncate", roll > 0 && "motion-safe:animate-label-roll")}>
            {shown}
          </span>
        </span>
        {busy ? (
          <span
            aria-hidden
            data-part="progress"
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-primary-foreground/70 animate-split-fill"
          />
        ) : null}
      </button>
      <span aria-hidden className="my-2 w-px bg-primary-foreground/25" />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={locked}
          aria-label={menuLabel}
          className="group inline-flex w-10 shrink-0 items-center justify-center rounded-r-md outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 enabled:hover:bg-primary-foreground/10 disabled:cursor-not-allowed"
        >
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform duration-500 ease-spring group-data-[state=open]:rotate-180"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)] rounded-xl p-1.5">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.id}
              data-option={option.id}
              disabled={option.disabled}
              onSelect={option.onSelect}
              className="items-start gap-3 rounded-lg p-2.5"
            >
              {option.icon ? (
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground [&_svg]:size-4"
                >
                  {option.icon}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                ) : null}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
