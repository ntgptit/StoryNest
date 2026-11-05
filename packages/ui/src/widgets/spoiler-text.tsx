/* Lucian UX/UI Prompt #396 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#396 */ // token-check-ignore: element number in the required license line, not a colour
/* Also Lucian UX/UI Prompt #138 (Document redaction) · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#138 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/**
 * A spoiler inside running text: covered by a block of drifting grains until it is pressed (tap, click, Enter or
 * Space), then the text fades in; pressing it again covers it again. While covered it is a button named `coverLabel`
 * ("Spoiler, tap to show"), so a screen reader does not read the hidden text out; once shown it reads as plain text
 * with `aria-expanded="true"`. Lines that wrap are covered line by line. The grains drift only with motion allowed.
 */
export function SpoilerText({ children, coverLabel }: { children: ReactNode; coverLabel: string }) {
  const [shown, setShown] = useState(false);
  const toggle = () => setShown((value) => !value);
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      data-slot="spoiler"
      data-state={shown ? "shown" : "covered"}
      aria-expanded={shown}
      aria-label={shown ? undefined : coverLabel}
      onClick={toggle}
      onKeyDown={onKeyDown}
      className={cn(
        "cursor-pointer rounded-sm px-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "[transition:color_0.5s_var(--ease-soft)_0.1s,background-color_0.35s_var(--ease-soft)]",
        shown ? "bg-muted" : "spoiler-cover motion-safe:animate-spoiler-grain",
      )}
    >
      {children}
    </span>
  );
}
