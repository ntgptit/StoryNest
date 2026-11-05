"use client";

// Story length filter of the home feed (Lucian 024, histogram range filter): bars of how many stories fall in each
// length bucket, two thumbs to pick a range, the count of stories inside rolling as they move.
import { ChevronDown, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@storynest/ui/components/button";
import { cn } from "@storynest/ui/lib/utils";
import { RangeHistogram, type HistogramBucket } from "@storynest/ui/widgets/range-histogram";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { currentLocale } from "../../_shared/i18n.ts";
import { useLengthHistogram } from "../hooks/use-latest-stories.ts";
import type { Category } from "../model/categories.ts";
import { homeHref } from "../model/home-href.ts";
import { bucketsToRange, formatWords, rangeToBuckets, type WordRange } from "../model/story-length.ts";
import { discoveryText } from "../strings.ts";

const t = discoveryText.length;

/** "2k – 30k words" for a range, "Any length" for none. */
export function lengthLabel(range: WordRange | undefined, locale: string): string {
  if (!range) return t.any;
  return t.range(formatWords(range.min, locale), range.max === null ? null : formatWords(range.max, locale));
}

/** The histogram and its thumbs for the other filters; `value` and `onChange` are the draft length. */
export function LengthHistogram({
  categories,
  categorySlug,
  tagSlug,
  value,
  onChange,
  enabled = true,
  locale = currentLocale(),
}: {
  categories: readonly Category[] | undefined;
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
  value: WordRange | undefined;
  onChange: (range: WordRange | undefined) => void;
  enabled?: boolean;
  locale?: string;
}) {
  const histogram = useLengthHistogram({ categorySlug, tagSlug }, categories, enabled);
  const rows = histogram.data ?? [];
  if (rows.length === 0) return null;
  const buckets: HistogramBucket[] = rows.map((row) => {
    const from = formatWords(row.minWords, locale);
    const to = row.maxWords === null ? null : formatWords(row.maxWords, locale);
    return { key: String(row.minWords), label: t.bucket(from, to), edge: from, count: row.stories };
  });
  const counts = new Intl.NumberFormat(locale);
  return (
    <RangeHistogram
      buckets={buckets}
      value={rangeToBuckets(value)}
      onChange={([lo, hi]) => onChange(bucketsToRange(lo, hi) ?? undefined)}
      text={{
        minThumb: t.minThumb,
        maxThumb: t.maxThumb,
        range: (from, to) => {
          const [lo, hi] = [buckets.indexOf(from), buckets.indexOf(to)];
          return lengthLabel(bucketsToRange(lo, hi) ?? undefined, locale);
        },
        results: (n) => t.results(counts.format(n)),
      }}
    />
  );
}

/**
 * From `sm` up: a "Length" button that unfolds the histogram; Apply goes to the filtered address (the length lives in
 * the URL like the category and the tag), the cross removes it.
 */
export function LengthFilter({
  categories,
  categorySlug,
  tagSlug,
  words,
  className,
  locale = currentLocale(),
}: {
  categories: readonly Category[] | undefined;
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
  words?: WordRange | undefined;
  className?: string;
  locale?: string;
}) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WordRange | undefined>(words);
  const panelId = useId();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setDraft(words);
            setOpen((o) => !o);
          }}
        >
          {words ? t.active(lengthLabel(words, locale)) : t.open}
          <ChevronDown aria-hidden className={cn("transition-transform duration-300", open && "rotate-180")} />
        </Button>
        {words ? (
          <AppLink
            href={homeHref({ categorySlug, tagSlug })}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            <X aria-hidden className="size-3.5" />
            {t.clear}
          </AppLink>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} className="flex max-w-md flex-col gap-3 rounded-xl border p-4">
          <LengthHistogram
            categories={categories}
            categorySlug={categorySlug}
            tagSlug={tagSlug}
            value={draft}
            onChange={setDraft}
            locale={locale}
          />
          <p className="text-xs text-muted-foreground">{t.note}</p>
          <Button
            type="button"
            size="sm"
            className="self-end"
            onClick={() => {
              setOpen(false);
              navigation.push(homeHref({ categorySlug, tagSlug, words: draft }));
            }}
          >
            {t.apply}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
