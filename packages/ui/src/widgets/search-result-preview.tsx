/* Lucian UX/UI Prompt #249 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#249 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs.tsx";
import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

export interface SearchResultPreviewLabels {
  /** Accessible name of the whole preview. */
  region: string;
  searchTab: string;
  shareTab: string;
  /** "123 / 160": how much of the description limit the text uses. */
  descriptionLength: (used: number, limit: number) => string;
}

type View = "search" | "share";

/**
 * How a page will look as a search result and as a link-share card, following the form as the author types
 * (Lucian 249). The host passes the text exactly as the page metadata will carry it (the description already cut by
 * the same helper the page uses), so the preview never disagrees with the real tags. A bar under the cards shows how
 * much of the description limit the source text uses; it turns to the warning colour when the text is longer than
 * the limit and will be cut. `note` adds one line under it (e.g. "not shown in search engines").
 * The other card rises in when its tab is picked; nothing moves on first render.
 */
export function SearchResultPreview({
  siteName,
  url,
  title,
  description,
  sourceLength,
  limit,
  imageUrl,
  note,
  labels,
  className,
}: {
  siteName: string;
  /** Full address as text (e.g. "storynest.app/story/…"). */
  url: string;
  title: string;
  description: string;
  /** Length of the text the description is cut from (to fill the bar). */
  sourceLength: number;
  /** Where the description is cut. */
  limit: number;
  imageUrl?: string | null | undefined;
  note?: string | null | undefined;
  labels: SearchResultPreviewLabels;
  className?: string | undefined;
}) {
  const [view, setView] = useState<View>("search");
  const swapped = useTriggerCount(view, (previous, next) => previous !== next);
  const ratio = limit > 0 ? sourceLength / limit : 0;
  const over = ratio > 1;
  const host = url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  const crumbs = url
    .replace(/^https?:\/\//, "")
    .split("/")
    .filter(Boolean)
    .join(" › ");
  const swapClass = swapped > 0 ? "motion-safe:animate-preview-swap" : undefined;

  return (
    <section
      aria-label={labels.region}
      data-slot="search-result-preview"
      className={cn("flex min-w-0 flex-col gap-2", className)}
    >
      <Tabs value={view} onValueChange={(next) => setView(next as View)}>
        <TabsList>
          <TabsTrigger value="search">{labels.searchTab}</TabsTrigger>
          <TabsTrigger value="share">{labels.shareTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className={swapClass}>
          <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3.5 text-card-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-6 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/40" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">{siteName}</span>
                <span className="truncate text-xs text-muted-foreground">{crumbs}</span>
              </span>
            </div>
            <p data-part="title" className="mt-1 truncate text-lg leading-snug text-primary">
              {title}
            </p>
            <p data-part="description" className="line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="share" className={swapClass}>
          <div className="flex min-h-28 min-w-0 overflow-hidden rounded-xl border bg-muted/40">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-24 shrink-0 object-cover sm:w-28" />
            ) : (
              <span aria-hidden className="w-24 shrink-0 bg-gradient-to-br from-primary to-primary/30 sm:w-28" />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
              <span className="line-clamp-2 text-sm font-semibold">{title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
              <span className="mt-auto truncate text-xs font-medium text-muted-foreground">{host}</span>
            </span>
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex flex-col gap-1">
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
          <span
            data-part="length-bar"
            className={cn(
              "block h-full rounded-full transition-[width,background-color] duration-200",
              over ? "bg-destructive" : ratio > 0.85 ? "bg-primary/70" : "bg-primary",
            )}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>
        <p className={cn("text-xs tabular-nums text-muted-foreground", over && "text-destructive")}>
          {labels.descriptionLength(sourceLength, limit)}
        </p>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
    </section>
  );
}
