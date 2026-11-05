"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { isNavItemActive } from "@storynest/ui/widgets/bottom-nav";
import {
  FullScreenMenu,
  fullScreenMenuItemStyle,
  fullScreenMenuLinkClass,
} from "@storynest/ui/widgets/full-screen-menu";
import { cn } from "@storynest/ui/lib/utils";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { FOLLOWING_HREF } from "../../author/index.ts";
import { homeHref, rootCategories, useCategories } from "../../discovery/index.ts";
import { rankingHref } from "../../ranking/index.ts";
import { settingsText, ThemeSwitch } from "../../settings/index.ts";
import { shellText } from "../strings.ts";
import { LanguageSwitcher } from "./language-switcher.tsx";

const RANKING_HREF = rankingHref();

/**
 * Mobile menu (below md, Lucian 045): a header button that opens a full-screen navigation with what the bottom nav
 * has no room for: Rankings, Following (members) and the categories, the same destinations and labels as the
 * desktop navigation row (DesktopNav), plus the day/night switch and the language switch (which leaves the header
 * on phones to make room for the menu button). Answers Q-SHELL-01 for phones.
 */
export function MobileMenu({ pathname, className }: { pathname: string; className?: string }) {
  const [open, setOpen] = useState(false);

  // Any navigation (a link here, or back/forward) closes it.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className={className}>
      <FullScreenMenu
        open={open}
        onOpenChange={setOpen}
        title={shellText.mobileMenu.title}
        openLabel={shellText.mobileMenu.open}
        closeLabel={shellText.mobileMenu.close}
        footer={
          <>
            <div className="flex items-center gap-2 text-sm">
              <ThemeSwitch />
              <span aria-hidden>{settingsText.theme.darkSwitch}</span>
            </div>
            <LanguageSwitcher className="ml-auto h-11 px-4 text-sm" />
          </>
        }
      >
        <MenuLinks pathname={pathname} onNavigate={() => setOpen(false)} />
      </FullScreenMenu>
    </div>
  );
}

function MenuLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const auth = useAuth();
  const categories = useCategories();
  const roots = categories.data ? rootCategories(categories.data) : [];

  const links = [
    { href: RANKING_HREF, label: shellText.desktopNav.ranking },
    ...(auth.status === "authenticated" ? [{ href: FOLLOWING_HREF, label: shellText.desktopNav.following }] : []),
  ];

  return (
    <>
      <nav aria-label={shellText.mainNavigation}>
        <ul className="flex flex-col">
          {links.map((link, index) => (
            <li key={link.href}>
              <AppLink
                href={link.href}
                aria-current={isNavItemActive(link, pathname) ? "page" : undefined}
                className={fullScreenMenuLinkClass()}
                style={fullScreenMenuItemStyle(index)}
                onClick={onNavigate}
              >
                <span aria-hidden className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {link.label}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
      <section
        aria-label={shellText.mobileMenu.browse}
        className="flex flex-col gap-3 motion-safe:animate-menu-link-rise"
        style={fullScreenMenuItemStyle(links.length)}
      >
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {shellText.mobileMenu.browse}
        </h2>
        <ul className="flex flex-wrap gap-2">
          <li>
            <AppLink href={homeHref()} className={chipClass()} onClick={onNavigate}>
              {shellText.desktopNav.allStories}
            </AppLink>
          </li>
          {categories.isPending
            ? [0, 1, 2].map((row) => (
                <li key={row} aria-hidden>
                  <Skeleton className="h-9 w-24 rounded-full" />
                </li>
              ))
            : null}
          {roots.map((category) => (
            <li key={category.slug}>
              <AppLink href={homeHref({ categorySlug: category.slug })} className={chipClass()} onClick={onNavigate}>
                {category.name}
              </AppLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function chipClass() {
  return cn(
    "touch-target inline-flex items-center rounded-full border px-4 text-sm font-medium outline-none",
    "transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
  );
}
