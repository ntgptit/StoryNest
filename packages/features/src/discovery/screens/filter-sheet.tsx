"use client";

// Filter drawer with live result count (adapted from Lucian UX/UI Prompt 305, MIT (c) 2026 Seokwoooo,
// lucianlabs.dev/uxui-prompt).

import { SlidersHorizontal, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@storynest/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@storynest/ui/components/sheet";
import { cn } from "@storynest/ui/lib/utils";
import { RollingNumber } from "@storynest/ui/widgets/rolling-number";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { usePopularTags, useStoryCount } from "../hooks/use-latest-stories.ts";
import { rootCategories, type Category } from "../model/categories.ts";
import { homeHref } from "../model/home-href.ts";
import { discoveryText } from "../strings.ts";

const t = discoveryText.filters;

const CHIP =
  "touch-target inline-flex shrink-0 items-center rounded-full border px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";
const IDLE = "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const ACTIVE = "border-primary bg-primary text-primary-foreground";

type Draft = { categorySlug: string | undefined; tagSlug: string | undefined };

/**
 * The home feed's filters on a phone: a "Filters" button (with how many are on) and the active filters as chips that
 * remove themselves, and a bottom sheet to pick a category and a tag. While choosing, the button at the bottom says
 * how many stories the choice would list (a head-only count on the feed's own query) and applies it by going to the
 * filtered address. From `sm` up the chip rows are shown instead (DiscoverScreen).
 */
export function DiscoverFilterBar({
  categories,
  categorySlug,
  tagSlug,
}: {
  categories: readonly Category[] | undefined;
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
}) {
  const navigation = useNavigation();
  const popular = usePopularTags();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ categorySlug, tagSlug });
  const categoryHeading = useId();
  const tagHeading = useId();

  const roots = categories ? rootCategories(categories) : [];
  const categoryName = (slug: string) => categories?.find((c) => c.slug === slug)?.name ?? slug;
  const tags = popular.data ?? [];
  const tagName = (slug: string) => tags.find((tag) => tag.slug === slug)?.name ?? slug;
  // An active tag that is not among the popular ones is still offered, so it can be kept or dropped.
  const tagChoices =
    draft.tagSlug && !tags.some((tag) => tag.slug === draft.tagSlug)
      ? [{ slug: draft.tagSlug, name: draft.tagSlug }, ...tags]
      : tags;

  const count = useStoryCount(draft, categories, open);
  const activeCount = Number(Boolean(categorySlug)) + Number(Boolean(tagSlug));

  const onOpenChange = (next: boolean) => {
    if (next) setDraft({ categorySlug, tagSlug }); // start from what the feed shows
    setOpen(next);
  };
  const apply = () => {
    setOpen(false);
    navigation.push(homeHref(draft));
  };

  const choice = (label: string, active: boolean, onClick: () => void) => (
    <li key={label} className="shrink-0">
      <button type="button" aria-pressed={active} onClick={onClick} className={cn(CHIP, active ? ACTIVE : IDLE)}>
        {label}
      </button>
    </li>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:hidden">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="touch-target rounded-full">
            <SlidersHorizontal aria-hidden />
            {t.open}
            {activeCount > 0 ? (
              <span
                aria-hidden
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
              >
                {activeCount}
              </span>
            ) : null}
            {activeCount > 0 ? <span className="sr-only">{t.active(activeCount)}</span> : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[85dvh] gap-0 rounded-t-2xl pb-safe">
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              aria-label={t.close}
            >
              <X aria-hidden />
            </Button>
          </SheetClose>
          <SheetHeader className="pr-12">
            <SheetTitle>{t.title}</SheetTitle>
            <SheetDescription>{t.description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-2">
            <section aria-labelledby={categoryHeading} className="flex flex-col gap-2">
              <h3 id={categoryHeading} className="text-sm font-medium">
                {t.category}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {choice(discoveryText.allCategories, !draft.categorySlug, () =>
                  setDraft((d) => ({ ...d, categorySlug: undefined })),
                )}
                {roots.map((category) =>
                  choice(category.name, draft.categorySlug === category.slug, () =>
                    setDraft((d) => ({ ...d, categorySlug: category.slug })),
                  ),
                )}
              </ul>
            </section>
            {tagChoices.length > 0 ? (
              <section aria-labelledby={tagHeading} className="flex flex-col gap-2">
                <h3 id={tagHeading} className="text-sm font-medium">
                  {t.tag}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {choice(t.anyTag, !draft.tagSlug, () => setDraft((d) => ({ ...d, tagSlug: undefined })))}
                  {tagChoices.map((tag) =>
                    choice(`#${tag.name}`, draft.tagSlug === tag.slug, () =>
                      setDraft((d) => ({ ...d, tagSlug: d.tagSlug === tag.slug ? undefined : tag.slug })),
                    ),
                  )}
                </ul>
              </section>
            ) : null}
          </div>
          <SheetFooter className="flex-row gap-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={!draft.categorySlug && !draft.tagSlug}
              onClick={() => setDraft({ categorySlug: undefined, tagSlug: undefined })}
            >
              {t.reset}
            </Button>
            <Button type="button" size="lg" className="flex-1" disabled={count.data === 0} onClick={apply}>
              {count.data === undefined ? (
                t.counting
              ) : count.data === 0 ? (
                t.none
              ) : (
                <RollingNumber value={count.data} format={t.show} live />
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {categorySlug ? (
        <AppLink
          href={homeHref({ tagSlug })}
          aria-label={t.removeCategory(categoryName(categorySlug))}
          className={cn(CHIP, ACTIVE, "gap-1 pr-2")}
        >
          {categoryName(categorySlug)}
          <X aria-hidden className="size-3.5" />
        </AppLink>
      ) : null}
      {tagSlug ? (
        <AppLink
          href={homeHref({ categorySlug })}
          aria-label={t.removeTag(tagName(tagSlug))}
          className={cn(CHIP, ACTIVE, "gap-1 pr-2")}
        >
          #{tagName(tagSlug)}
          <X aria-hidden className="size-3.5" />
        </AppLink>
      ) : null}
    </div>
  );
}
