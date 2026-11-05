/* Lucian UX/UI Prompt #354, #040 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#354 */ // token-check-ignore: element numbers in the required license line, not colours
"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/utils.ts";
import type { NavLinkComponent } from "./bottom-nav.tsx";

/** Delay before a hover-opened panel closes once the pointer has left the menu (lets it cross the gap). */
export const MEGA_NAV_CLOSE_DELAY_MS = 220;

export type MegaNavEntry =
  | { kind: "link"; key: string; href: string; label: string; active?: boolean }
  | {
      kind: "panel";
      key: string;
      label: string;
      /** The current page is one of this panel's destinations (styles the trigger like a current link). */
      active?: boolean;
      /** Rendered only while open. Links inside close the menu when followed. */
      panel: ReactNode;
    };

type OpenState = { key: string | null; from: string | null };

const ITEM =
  "touch-target inline-flex items-center gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors";

/** Class of a link inside a panel (category, tag, period...): the same look across panels. */
export function megaNavItemClass(active = false): string {
  return cn(
    "flex min-h-9 items-center rounded-md px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
    active ? "font-medium text-primary" : "text-foreground",
  );
}

/** A titled group of links inside a panel. */
export function MegaNavSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  return (
    <div className={cn("flex min-w-40 flex-col gap-1", className)}>
      <p id={titleId} className="px-2 text-xs font-semibold text-muted-foreground">
        {title}
      </p>
      <ul aria-labelledby={titleId} className="flex flex-col">
        {children}
      </ul>
    </div>
  );
}

/**
 * Desktop primary navigation row: plain links plus items that open a dropdown panel. One panel surface is shared:
 * moving from one item to another does not close and reopen it, the surface glides under the new item while changing
 * size, and the new content slides in from the side it came from (the first open only fades in). A small caret
 * follows the item. Hidden below md, where the bottom navigation takes over.
 *
 * Opening: hover with a mouse, or click / Enter / Space on the item (touch and keyboard never depend on hover). A
 * click pins a panel open; a hover-opened one closes shortly after the pointer leaves. Escape closes and returns
 * focus to the item; tabbing out, clicking outside or following a link closes it. The panel follows its item in the
 * tab order, so Tab walks straight into it.
 */
export function MegaNav({
  entries,
  label,
  LinkComponent,
  className,
}: {
  entries: readonly MegaNavEntry[];
  /** Accessible name of the navigation landmark (translated by the caller). */
  label: string;
  LinkComponent: NavLinkComponent;
  className?: string;
}) {
  const baseId = useId();
  const [state, setState] = useState<OpenState>({ key: null, from: null });
  const navRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pinned = useRef(false);

  const panelKeys = entries.filter((entry) => entry.kind === "panel").map((entry) => entry.key);
  const openKey = state.key !== null && panelKeys.includes(state.key) ? state.key : null;

  const cancelClose = () => clearTimeout(closeTimer.current);
  const open = (key: string) => {
    cancelClose();
    setState((current) => (current.key === key ? current : { key, from: current.key }));
  };
  const close = useCallback(() => {
    clearTimeout(closeTimer.current);
    pinned.current = false;
    setState({ key: null, from: null });
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Place the shared surface under the open item and size it to the content; follow later size changes (data loading).
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    const trigger = openKey ? triggers.current.get(openKey) : undefined;
    if (!frame || !content || !trigger) return;
    const place = () => {
      const frameBox = frame.getBoundingClientRect();
      const triggerBox = trigger.getBoundingClientRect();
      const width = content.offsetWidth;
      const center = triggerBox.left - frameBox.left + triggerBox.width / 2;
      const x = Math.max(0, Math.min(frame.clientWidth - width, center - width / 2));
      frame.style.setProperty("--mega-x", `${x}px`);
      frame.style.setProperty("--mega-w", `${width}px`);
      frame.style.setProperty("--mega-h", `${content.offsetHeight}px`);
      frame.style.setProperty("--mega-caret", `${center}px`);
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(content);
    return () => observer.disconnect();
  }, [openKey]);

  // A press anywhere outside the menu closes it.
  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey, close]);

  const onTriggerPointerEnter = (key: string) => (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (openKey !== key) pinned.current = false;
    open(key);
  };
  const onTriggerClick = (key: string) => () => {
    if (openKey === key && pinned.current) return close();
    pinned.current = true;
    open(key);
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !openKey || pinned.current) return;
    cancelClose();
    closeTimer.current = setTimeout(close, MEGA_NAV_CLOSE_DELAY_MS);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !openKey) return;
    event.preventDefault();
    const trigger = triggers.current.get(openKey);
    close();
    trigger?.focus();
  };
  // Tabbing to something outside closes it (a null relatedTarget is a click on plain content: handled above).
  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (openKey && next && !navRef.current?.contains(next)) close();
  };
  const onPanelClick = (event: MouseEvent) => {
    if ((event.target as Element).closest("a")) close();
  };

  const direction = (() => {
    if (!openKey || !state.from || !panelKeys.includes(state.from)) return 0;
    return panelKeys.indexOf(openKey) > panelKeys.indexOf(state.from) ? 1 : -1;
  })();

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={cn("hidden md:block", className)}
      onPointerEnter={cancelClose}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div ref={frameRef} className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
        <ul className="-mx-3 flex h-12 items-center gap-0.5">
          {entries.map((entry) => {
            if (entry.kind === "link") {
              return (
                <li key={entry.key}>
                  <LinkComponent
                    href={entry.href}
                    aria-current={entry.active ? "page" : undefined}
                    className={cn(
                      ITEM,
                      entry.active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {entry.label}
                  </LinkComponent>
                </li>
              );
            }
            const isOpen = openKey === entry.key;
            const panelId = `${baseId}-${entry.key}`;
            return (
              <li key={entry.key}>
                <button
                  ref={(element) => {
                    if (element) triggers.current.set(entry.key, element);
                    else triggers.current.delete(entry.key);
                  }}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? panelId : undefined}
                  data-active={entry.active ? "" : undefined}
                  onPointerEnter={onTriggerPointerEnter(entry.key)}
                  onClick={onTriggerClick(entry.key)}
                  className={cn(
                    ITEM,
                    isOpen
                      ? "bg-accent text-accent-foreground"
                      : entry.active
                        ? "text-primary hover:bg-accent"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {entry.label}
                  <ChevronDown
                    aria-hidden
                    className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen ? (
                  <div
                    ref={contentRef}
                    id={panelId}
                    data-slot="mega-nav-panel"
                    onClick={onPanelClick}
                    className={cn(
                      "absolute top-full left-0 z-20 mt-2 w-max max-w-[calc(100%-2rem)] translate-x-(--mega-x) p-3",
                      direction === 0
                        ? "animate-mega-fade"
                        : direction > 0
                          ? "animate-mega-from-end"
                          : "animate-mega-from-start",
                    )}
                  >
                    {entry.panel}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {openKey ? (
          <>
            {/* One surface for every panel: it keeps its element while switching, so width, height and position glide. */}
            <div
              aria-hidden
              data-slot="mega-nav-surface"
              className="pointer-events-none absolute top-full left-0 z-10 mt-2 h-(--mega-h) w-(--mega-w) translate-x-(--mega-x) animate-mega-fade rounded-xl border bg-popover shadow-lg transition-[translate,width,height] duration-450 ease-glide"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-full left-(--mega-caret) z-20 mt-0.5 size-3 -translate-x-1/2 rotate-45 animate-mega-fade rounded-tl-sm border-t border-l bg-popover transition-[left] duration-450 ease-glide"
            />
          </>
        ) : null}
      </div>
    </nav>
  );
}
