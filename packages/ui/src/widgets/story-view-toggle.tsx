/* Lucian UX/UI Prompt #308 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#308 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { LayoutGrid, List } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "../lib/utils.ts";
import type { StoryCardVariant } from "./story-card.tsx";

export interface StoryViewToggleLabels {
  /** Accessible name of the group, e.g. "Display". */
  label: string;
  grid: string;
  list: string;
}

/**
 * Grid / list switch for story lists (Lucian 308): two icon buttons in one segmented control, the chosen one pressed.
 * The caller morphs the cards (useFlip) and remembers the choice (useStoredView).
 */
export function StoryViewToggle({
  value,
  onChange,
  labels,
  className,
}: {
  value: StoryCardVariant;
  onChange: (value: StoryCardVariant) => void;
  labels: StoryViewToggleLabels;
  className?: string;
}) {
  const option = (view: StoryCardVariant, Icon: typeof List, label: string) => {
    const active = value === view;
    return (
      <button
        type="button"
        aria-pressed={active}
        title={label}
        onClick={() => {
          if (!active) onChange(view);
        }}
        className={cn(
          "touch-target inline-flex items-center justify-center rounded-md px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          active && "bg-background text-foreground shadow-sm dark:bg-input/30",
        )}
      >
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
    );
  };
  return (
    <div
      role="group"
      aria-label={labels.label}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-[3px]", className)}
    >
      {option("grid", LayoutGrid, labels.grid)}
      {option("list", List, labels.list)}
    </div>
  );
}

const isView = (value: unknown): value is StoryCardVariant => value === "grid" || value === "list";

/**
 * The reader's grid/list choice, kept in this browser only (localStorage, read after mount so the server render and
 * the first client render agree; any storage error just means "grid").
 */
export function useStoredView(storageKey: string): [StoryCardVariant, (view: StoryCardVariant) => void] {
  const [view, setView] = useState<StoryCardVariant>("grid");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (isView(stored)) setView(stored);
    } catch {
      // Private mode or blocked storage: keep the default.
    }
  }, [storageKey]);
  const choose = useCallback(
    (next: StoryCardVariant) => {
      setView(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Not remembered, still applied.
      }
    },
    [storageKey],
  );
  return [view, choose];
}
