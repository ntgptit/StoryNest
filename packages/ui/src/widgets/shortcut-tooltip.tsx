/* Lucian UX/UI Prompt #076 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#076 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { ReactElement, ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip.tsx";
import { cn } from "../lib/utils.ts";

/** Rest on a button this long before its tooltip rises (Lucian 076: 450 ms). */
export const TOOLTIP_DELAY_MS = 450;
/** After a tooltip closes, the next one within this window opens at once (moving along a toolbar). */
export const TOOLTIP_SKIP_MS = 300;

/** A key combination in a platform-neutral form: "Mod" is Cmd on Apple devices and Ctrl elsewhere. */
export type Shortcut = readonly string[];

const MAC_KEYS: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥" };
const OTHER_KEYS: Record<string, string> = { Mod: "Ctrl", Shift: "Shift", Alt: "Alt" };

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** ["Mod", "Shift", "S"] -> "Ctrl+Shift+S", or "⌘⇧S" on Apple devices. */
export function formatShortcut(keys: Shortcut, apple = isApplePlatform()): string {
  const names = keys.map((key) => (apple ? (MAC_KEYS[key] ?? key) : (OTHER_KEYS[key] ?? key)).toUpperCase());
  return apple ? names.join("") : names.map((name) => (name.length > 1 ? capitalize(name) : name)).join("+");
}

function capitalize(name: string): string {
  return name.charAt(0) + name.slice(1).toLowerCase();
}

/**
 * One provider for a row of buttons, so their tooltips behave as one (Lucian 076): the first waits
 * TOOLTIP_DELAY_MS, moving on to the next button shows its tooltip at once and without the rise animation, so it
 * seems to glide along. Esc closes it (Radix), touch never opens it (the label is still the button's aria-label).
 */
export function ToolbarTooltips({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS} skipDelayDuration={TOOLTIP_SKIP_MS}>
      {children}
    </TooltipProvider>
  );
}

/**
 * A tooltip with the button's name and, when there is one, its keyboard shortcut in a key cap. The trigger keeps
 * its own aria-label; the tooltip only adds the shortcut as its description for screen readers.
 * Put it inside ToolbarTooltips (or any TooltipProvider).
 */
export function ShortcutTooltip({
  label,
  shortcut,
  side = "bottom",
  children,
}: {
  label: string;
  shortcut?: Shortcut | undefined;
  side?: "top" | "bottom" | "left" | "right";
  /** The button; it must accept a ref and pointer/focus handlers (asChild). */
  children: ReactElement;
}) {
  const keys = shortcut ? formatShortcut(shortcut) : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        collisionPadding={8}
        aria-label={keys ?? label}
        className={cn("flex items-center gap-2 py-1.5 data-[state=instant-open]:animate-none", keys && "pr-1.5")}
      >
        <span>{label}</span>
        {keys ? (
          <kbd className="inline-flex h-5 items-center rounded-sm bg-background/15 px-1.5 font-sans text-[0.7rem] font-semibold">
            {keys}
          </kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
