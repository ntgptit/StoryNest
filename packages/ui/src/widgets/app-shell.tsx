import type { ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/**
 * Page frame: sticky header (below the status bar), centred content column, optional bottom navigation.
 * Safe areas come from the design-token utilities, so the same shell works in the browser and in Capacitor.
 */
export function AppShell({
  header,
  bottomNav,
  children,
  className,
}: {
  header?: ReactNode;
  /** Rendered fixed at the bottom on mobile; the content gets matching bottom padding. */
  bottomNav?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-safe">
      {header ? (
        <header className="sticky top-0 z-30 border-b bg-background/95 pt-safe backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">{header}</div>
        </header>
      ) : null}
      <main
        className={cn("mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6", bottomNav ? "pb-24 md:pb-6" : "", className)}
      >
        {children}
      </main>
      {bottomNav}
    </div>
  );
}
