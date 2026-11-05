"use client";

import { useEffect, useRef } from "react";
import { AppLink } from "../../_shared/platform.tsx";
import type { Category } from "../model/categories.ts";
import { homeHref } from "../model/home-href.ts";
import { discoveryText } from "../strings.ts";

const CHIP =
  "touch-target inline-flex shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors";

/**
 * Category filter as plain links (`/?category=slug`): shareable URL, no client-side state, works with SSR. A tag filter
 * stays on. When the row is wider than the screen, the active chip is scrolled to the middle of it (on load and when
 * the category changes), only sideways, so a chip far down the list is never hidden off the edge.
 */
export function CategoryChips({
  categories,
  activeSlug,
  tagSlug,
}: {
  categories: readonly Category[];
  activeSlug?: string | undefined;
  tagSlug?: string | undefined;
}) {
  const row = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const nav = row.current;
    const active = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    // scrollLeft, not scrollIntoView: that would also scroll the page vertically.
    const left = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollLeft = left - (nav.clientWidth - active.offsetWidth) / 2;
  }, [activeSlug]);

  const chip = (href: string, label: string, active: boolean) => (
    <li key={href} className="shrink-0">
      <AppLink
        href={href}
        aria-current={active ? "page" : undefined}
        className={`${CHIP} ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
      >
        {label}
      </AppLink>
    </li>
  );

  return (
    <nav ref={row} aria-label={discoveryText.categoriesLabel} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2">
        {chip(homeHref({ tagSlug }), discoveryText.allCategories, !activeSlug)}
        {categories.map((c) => chip(homeHref({ categorySlug: c.slug, tagSlug }), c.name, c.slug === activeSlug))}
      </ul>
    </nav>
  );
}
