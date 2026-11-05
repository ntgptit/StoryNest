/* Lucian UX/UI Prompt #006, #074 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#006 */ // token-check-ignore: element numbers in the required license line, not colours
"use client";

import { Bell, BellRing } from "lucide-react";

import { cn } from "../lib/utils.ts";

/**
 * Bell icon that swings once each time `rings` goes up (0 = never: nothing moves on first render). The caller decides
 * what rings it, usually with `useTriggerCount`: following turned on, or the unread count went up. `active` shows the
 * ringing variant of the icon (e.g. "following"). Decorative: the control holding it carries the label.
 */
export function RingingBellIcon({
  rings,
  active = false,
  className,
}: {
  rings: number;
  active?: boolean;
  className?: string;
}) {
  const Icon = active ? BellRing : Bell;
  return (
    <span
      key={rings}
      data-slot="ringing-bell"
      aria-hidden
      className={cn("inline-flex size-4 shrink-0 origin-top", rings > 0 && "animate-bell-ring", className)}
    >
      <Icon className="size-full" />
    </span>
  );
}
