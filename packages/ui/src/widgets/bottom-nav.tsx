import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** The app injects its router link (shared code must not import next/* or a router), see PlatformProvider. */
export type NavLinkComponent = ComponentType<{
  href: string;
  className?: string;
  "aria-current"?: "page";
  children?: ReactNode;
}>;

export interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Overrides the default match (exact for "/", otherwise path equals href or is nested below it). */
  match?: (pathname: string) => boolean;
}

export function isNavItemActive(item: Pick<BottomNavItem, "href" | "match">, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Mobile bottom navigation: touch-sized targets, respects the home-indicator safe area, hidden from md up. */
export function BottomNav({
  items,
  pathname,
  LinkComponent,
  label,
  className,
}: {
  items: readonly BottomNavItem[];
  pathname: string;
  LinkComponent: NavLinkComponent;
  /** Accessible name of the navigation landmark (translated by the caller). */
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur md:hidden",
        className,
      )}
    >
      {/* Fixed row height (--size-bottom-nav), so bars that sit above the nav (StickyActionBar) line up with it. */}
      <ul className="mx-auto flex min-h-(--size-bottom-nav) max-w-xl items-stretch justify-around">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <LinkComponent
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "touch-target flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span>{item.label}</span>
              </LinkComponent>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
