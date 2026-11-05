"use client";

// Empty search that loosens filters (adapted from Lucian UX/UI Prompt 092, MIT (c) 2026 Seokwoooo,
// lucianlabs.dev/uxui-prompt).

import { X } from "lucide-react";
import { formatCount } from "@storynest/utils";
import { AppLink } from "../../_shared/platform.tsx";
import { usePopularTags, useStoryCount } from "../hooks/use-latest-stories.ts";
import type { Category } from "../model/categories.ts";
import { homeHref } from "../model/home-href.ts";
import { discoveryText } from "../strings.ts";

const t = discoveryText.loosen;

/**
 * Shown when a filtered home feed is empty: one-tap ways out, each dropping one filter ("Remove tag #x", "Remove
 * category y") and saying how many stories that would list (a head-only count). They are links, like every other
 * filter, so the address stays the source of truth.
 */
export function LoosenFilters({
  categories,
  categorySlug,
  tagSlug,
  locale,
}: {
  categories: readonly Category[] | undefined;
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
  locale: string;
}) {
  const popular = usePopularTags();
  const categoryName = categorySlug ? (categories?.find((c) => c.slug === categorySlug)?.name ?? categorySlug) : "";
  const tagName = tagSlug ? (popular.data?.find((tag) => tag.slug === tagSlug)?.name ?? tagSlug) : "";
  const withoutTag = { categorySlug, tagSlug: undefined };
  const withoutCategory = { categorySlug: undefined, tagSlug };
  const tagCount = useStoryCount(withoutTag, categories, Boolean(tagSlug));
  const categoryCount = useStoryCount(withoutCategory, categories, Boolean(categorySlug));
  if (!categorySlug && !tagSlug) return null;

  const chip = (href: string, label: string, count: number | undefined) => (
    <li>
      <AppLink
        href={href}
        className="touch-target inline-flex items-center gap-1.5 rounded-full border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X aria-hidden className="size-3.5" />
        {label}
        {count === undefined ? null : (
          <span className="text-muted-foreground">· {t.count(formatCount(count, locale))}</span>
        )}
      </AppLink>
    </li>
  );

  return (
    <nav aria-label={t.label} className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      <ul className="flex flex-wrap justify-center gap-2">
        {tagSlug ? chip(homeHref(withoutTag), t.withoutTag(tagName), tagCount.data) : null}
        {categorySlug ? chip(homeHref(withoutCategory), t.withoutCategory(categoryName), categoryCount.data) : null}
      </ul>
    </nav>
  );
}
