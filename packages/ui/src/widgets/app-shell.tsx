/* Lucian UX/UI Prompt #212 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#212 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useHideOnScroll } from "../lib/use-hide-on-scroll.ts";
import { cn } from "../lib/utils.ts";

/** Lets a page inside the shell switch the hide-on-scroll header on while it is mounted. */
const AutoHideHeaderContext = createContext<((pageWantsIt: boolean) => void) | null>(null);

/**
 * Ask the surrounding AppShell to tuck its header away while the reader scrolls down and bring it back on scroll-up,
 * for as long as the calling page is mounted. Sticky bars of that page should use `top-below-header` so they sit
 * right below the header while it shows and move up to the top when it hides. Outside an AppShell it does nothing.
 */
export function useAutoHideHeader(enabled = true): void {
  const request = useContext(AutoHideHeaderContext);
  useEffect(() => {
    if (!request || !enabled) return;
    request(true);
    return () => request(false);
  }, [request, enabled]);
}

/**
 * Page frame: sticky header (below the status bar), optional desktop navigation row inside it, centred content
 * column, optional bottom navigation. Safe areas come from the design-token utilities, so the same shell works in the
 * browser and in Capacitor.
 *
 * The space the header currently covers is published as the CSS variable --app-header-offset (its height while it
 * shows, only the safe-area strip while a page tucked it away with `useAutoHideHeader`).
 */
export function AppShell({
  header,
  navigation,
  bottomNav,
  children,
  className,
}: {
  header?: ReactNode;
  /** Second header row, e.g. the desktop primary navigation (it hides itself where it does not apply). */
  navigation?: ReactNode;
  /** Rendered fixed at the bottom on mobile; the content gets matching bottom padding. */
  bottomNav?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [autoHide, setAutoHide] = useState(false);
  const { hidden: tucked, reveal } = useHideOnScroll(autoHide);
  const requestAutoHide = useCallback((pageWantsIt: boolean) => setAutoHide(pageWantsIt), []);

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;
    const measure = () => setHeaderHeight(element.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [header]);

  const offset = tucked ? "env(safe-area-inset-top)" : headerHeight === null ? undefined : `${headerHeight}px`;
  const style = offset ? ({ "--app-header-offset": offset } as CSSProperties) : undefined;

  return (
    <AutoHideHeaderContext value={requestAutoHide}>
      <div className="flex min-h-dvh flex-col px-safe" style={style}>
        {header ? (
          <header
            ref={headerRef}
            data-tucked={tucked ? "" : undefined}
            // A keyboard user tabbing into the tucked header must see where the focus is.
            onFocus={reveal}
            className={cn(
              "sticky top-0 z-30 border-b bg-background/95 pt-safe backdrop-blur",
              "transition-transform duration-380 ease-soft motion-reduce:transition-none",
              tucked && "header-tucked",
            )}
          >
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">{header}</div>
            {navigation}
          </header>
        ) : null}
        <main
          className={cn(
            "mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6",
            bottomNav ? "pb-24 md:pb-6" : "",
            className,
          )}
        >
          {children}
        </main>
        {bottomNav}
      </div>
    </AutoHideHeaderContext>
  );
}
