"use client";

import { X } from "lucide-react";
import { AppLink } from "../../_shared/platform.tsx";
import { usePopularTags } from "../hooks/use-latest-stories.ts";
import { homeHref } from "../model/home-href.ts";
import { discoveryText } from "../strings.ts";

const CHIP = "touch-target inline-flex shrink-0 items-center rounded-full border px-3 text-sm transition-colors";
const IDLE = "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const ACTIVE = "border-primary bg-primary text-primary-foreground";

/**
 * Tag filters of the home feed: the active tag (with a link that removes it) and the most used tags as links. All of it
 * is shallow links, like the category chips, so a filtered view has its own URL. A category filter stays on.
 */
export function TagFilters({
  categorySlug,
  tagSlug,
}: {
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
}) {
  const popular = usePopularTags();
  const tags = popular.data ?? [];
  const activeName = tags.find((tag) => tag.slug === tagSlug)?.name ?? tagSlug;
  if (tags.length === 0 && !tagSlug) return null;

  return (
    <div className="flex flex-col gap-2">
      {tagSlug ? (
        <p className="flex items-center gap-2 text-sm">
          <span className="font-medium">{discoveryText.tagFilter.label(activeName ?? tagSlug)}</span>
          <AppLink
            href={homeHref({ categorySlug })}
            shallow
            className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:underline"
          >
            <X aria-hidden className="size-3.5" />
            {discoveryText.tagFilter.clear}
          </AppLink>
        </p>
      ) : null}
      {tags.length > 0 ? (
        <nav aria-label={discoveryText.popularTagsLabel} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {tags.map((tag) => {
              const active = tag.slug === tagSlug;
              return (
                <li key={tag.slug} className="shrink-0">
                  <AppLink
                    href={homeHref({ categorySlug, tagSlug: active ? undefined : tag.slug })}
                    shallow
                    aria-current={active ? "page" : undefined}
                    className={`${CHIP} ${active ? ACTIVE : IDLE}`}
                  >
                    #{tag.name}
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
