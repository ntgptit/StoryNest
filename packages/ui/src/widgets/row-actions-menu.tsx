/* Lucian UX/UI Prompt #038 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#038 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Fragment, useRef, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";

import { Button } from "../components/button.tsx";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../components/context-menu.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/dropdown-menu.tsx";
import { cn } from "../lib/utils.ts";

/** One thing that can be done to a row. The same list feeds the row's context menu and its "..." button. */
export interface RowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Draws a separator above this action (to set the destructive ones apart). */
  separated?: boolean;
}

/** Keys that open a context menu from the keyboard: Shift+F10 everywhere, and the dedicated menu key. */
export const isContextMenuKey = (event: { key: string; shiftKey: boolean }) =>
  event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA");

/** How long after a handled menu key the browser's own `contextmenu` for that key is swallowed. */
const NATIVE_ECHO_MS = 600;

function Items({ actions, kind }: { actions: readonly RowAction[]; kind: "context" | "dropdown" }) {
  const Item = kind === "context" ? ContextMenuItem : DropdownMenuItem;
  const Separator = kind === "context" ? ContextMenuSeparator : DropdownMenuSeparator;
  return actions.map((action) => {
    const Icon = action.icon;
    return (
      <Fragment key={action.id}>
        {action.separated ? <Separator /> : null}
        <Item
          variant={action.destructive ? "destructive" : "default"}
          disabled={action.disabled}
          onSelect={action.onSelect}
        >
          {Icon ? <Icon aria-hidden /> : null}
          {action.label}
        </Item>
      </Fragment>
    );
  });
}

/**
 * Gives a list row a context menu with its actions: right-click, a long press on touch (Radix waits 700 ms), or
 * Shift+F10 / the menu key while anything in the row has focus. The menu blooms from the point that was pressed (from
 * the focused control for the keyboard), puts focus on its first item when opened from the keyboard and gives it back
 * on close. The row gets `data-state="open"` while its menu is open, so it can stay highlighted. Text fields inside the
 * row keep the browser's own menu. Nothing here replaces the row's visible buttons: it is a faster route to the same
 * actions, and RowActionsButton is the touch- and keyboard-discoverable one.
 */
export function RowActionsMenu({
  actions,
  label,
  children,
}: {
  actions: readonly RowAction[];
  /** Names the menu (and is shown at its top), e.g. the row's title. */
  label: string;
  /** The row element. It must accept a ref and spread props (Radix `asChild`). */
  children: ReactElement;
}) {
  const handledAt = useRef(0);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isContextMenuKey(event) || isEditable(event.target) || !(event.target instanceof HTMLElement)) return;
    event.preventDefault();
    handledAt.current = Date.now();
    const rect = event.target.getBoundingClientRect();
    // Radix opens at the event's point: hand it one at the focused control's bottom left.
    event.target.dispatchEvent(
      new window.MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left,
        clientY: rect.bottom,
      }),
    );
  };

  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    // Some browsers still fire their own contextmenu for the key handled above; opening twice would move the menu.
    if (event.nativeEvent.isTrusted && Date.now() - handledAt.current < NATIVE_ECHO_MS) event.preventDefault();
    if (isEditable(event.target)) event.preventDefault();
  };

  if (actions.length === 0) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onKeyDown={onKeyDown} onContextMenu={onContextMenu}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent aria-label={label} collisionPadding={8}>
        <ContextMenuLabel aria-hidden className="max-w-64">
          {label}
        </ContextMenuLabel>
        <Items actions={actions} kind="context" />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** The "..." button with the same actions as the row's context menu; on phones it stands in for the hidden buttons. */
export function RowActionsButton({
  actions,
  label,
  menuLabel,
  className,
}: {
  actions: readonly RowAction[];
  /** Accessible name of the button, e.g. "More actions: Chapter 3". */
  label: string;
  /** Shown at the top of the menu (the row's title). */
  menuLabel?: string;
  className?: string;
}) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label={label} className={cn("shrink-0", className)}>
          <MoreHorizontal aria-hidden className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="min-w-48">
        {menuLabel ? (
          <DropdownMenuLabel aria-hidden className="max-w-64 truncate text-xs text-muted-foreground">
            {menuLabel}
          </DropdownMenuLabel>
        ) : null}
        <Items actions={actions} kind="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
