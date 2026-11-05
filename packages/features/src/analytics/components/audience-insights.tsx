"use client";

// Audience insights of batch 4 on the story statistics screen: weekly cohorts (Lucian 161), signed-in versus guest
// reads (326), what readers say (399) and where readers come from (153). Each section loads its own author-only RPC;
// all of them are aggregates, small groups come back hidden from the server and are drawn as hidden.
import type { ReactNode } from "react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { CohortGrid, type CohortRow } from "@storynest/ui/widgets/cohort-grid";
import { DateRangeCalendar } from "@storynest/ui/widgets/date-range-calendar";
import { FlowSankey, type FlowSource } from "@storynest/ui/widgets/flow-sankey";
import { WaffleChart } from "@storynest/ui/widgets/waffle-chart";
import { WordCloud, type CloudPeriod } from "@storynest/ui/widgets/word-cloud";
import { AUDIENCE_LIMITS } from "@storynest/validation";
import { formatCount } from "@storynest/utils";
import { useCommentTerms, useReaderCohorts, useReaderSplit, useReadSources } from "../hooks/use-analytics.ts";
import { COHORT_WEEKS, rangeBounds, TERM_MONTHS, type DayRange } from "../model/insights.ts";
import { analyticsText } from "../strings.ts";

const t = analyticsText;

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      <p className="text-xs text-muted-foreground">{note}</p>
    </section>
  );
}

const shortDay = (day: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );

/** The calendar of a custom range, bounded to what the server accepts. */
export function CustomRangePicker({
  value,
  onApply,
  locale,
}: {
  value: DayRange | null;
  onApply: (range: DayRange) => void;
  locale: string;
}) {
  const { min, max } = rangeBounds();
  return (
    <div className="flex flex-col gap-2">
      <DateRangeCalendar
        value={value}
        min={min}
        max={max}
        maxSpanDays={AUDIENCE_LIMITS.maxRangeDays}
        locale={locale}
        text={t.custom.calendar}
        onApply={onApply}
      />
      <p className="text-xs text-muted-foreground">{t.custom.note}</p>
    </div>
  );
}

export function ReaderCohorts({ storyId, locale }: { storyId: string; locale: string }) {
  const cohorts = useReaderCohorts(storyId, COHORT_WEEKS);
  const rows: CohortRow[] = (cohorts.data ?? []).map((cohort) => {
    const label = shortDay(cohort.week, locale);
    return {
      key: cohort.week,
      label,
      sizeText: cohort.suppressed ? t.cohorts.hiddenSize : t.cohorts.size(cohort.size ?? 0),
      cells: cohort.shares,
      suppressed: cohort.suppressed,
    };
  });
  const anyone = (cohorts.data ?? []).some((cohort) => cohort.suppressed || (cohort.size ?? 0) > 0);
  return (
    <Section title={t.cohorts.title} note={t.cohorts.note}>
      {cohorts.isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" aria-busy />
      ) : !anyone ? (
        <p className="text-sm text-muted-foreground">{t.cohorts.empty}</p>
      ) : (
        <CohortGrid
          rows={rows}
          weeks={COHORT_WEEKS}
          text={{
            label: t.cohorts.label,
            week: t.cohorts.week,
            idle: t.cohorts.idle,
            cell: (row, offset, percent) => t.cohorts.cell(row.label, offset, percent, row.sizeText),
            hidden: (row) => t.cohorts.hidden(row.label),
          }}
        />
      )}
    </Section>
  );
}

export function ReaderSplit({ storyId, days, locale }: { storyId: string; days: number; locale: string }) {
  const split = useReaderSplit(storyId, days);
  const data = split.data;
  return (
    <Section title={t.split.title} note={t.split.note}>
      {!data ? (
        <Skeleton className="h-56 w-full max-w-md rounded-xl" aria-busy />
      ) : (
        <>
          <WaffleChart
            segments={[
              { key: "signed-in", label: t.split.signedIn, value: data.signedInReads, tone: 1 },
              { key: "anonymous", label: t.split.anonymous, value: data.anonymousReads, tone: 2 },
            ]}
            text={{
              label: t.split.label(days),
              legend: t.split.legend,
              share: (segment, percent) => t.split.share(segment.label, percent, formatCount(segment.value, locale)),
              empty: t.split.empty,
            }}
          />
          {data.signedInReads + data.anonymousReads > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.split.readers(formatCount(data.signedInReaders, locale), formatCount(data.anonymousReaders, locale))}
            </p>
          ) : null}
        </>
      )}
    </Section>
  );
}

export function CommentTerms({ storyId, locale }: { storyId: string; locale: string }) {
  const terms = useCommentTerms(storyId, TERM_MONTHS);
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const periods: CloudPeriod[] = (terms.data ?? []).map((month) => ({
    key: month.month,
    label: monthName.format(new Date(`${month.month}T00:00:00Z`)),
    words: month.terms.map((term) => ({ term: term.term, count: term.mentions })),
  }));
  return (
    <Section title={t.terms.title} note={t.terms.note}>
      {terms.isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" aria-busy />
      ) : (
        <WordCloud
          periods={periods}
          text={{
            periods: t.terms.periods,
            cloud: (period) => t.terms.cloud(period.label),
            word: (word, change) => t.terms.word(word.term, word.count, change),
            idle: t.terms.idle,
            empty: t.terms.empty,
          }}
        />
      )}
    </Section>
  );
}

export function ReadSourcesFlow({ storyId, days }: { storyId: string; days: number }) {
  const sources = useReadSources(storyId, days);
  const data = sources.data;
  const flow: FlowSource[] = (data?.shown ?? []).map((source) => ({
    key: source.source,
    label: t.sources.names[source.source],
    entered: source.readers,
    middle: source.continued,
    outcome: source.followed,
  }));
  return (
    <Section title={t.sources.title} note={t.sources.note}>
      {!data ? (
        <Skeleton className="h-56 w-full rounded-xl" aria-busy />
      ) : flow.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.sources.empty}</p>
      ) : (
        <FlowSankey
          sources={flow}
          text={{
            stages: t.sources.stages,
            sources: t.sources.picker,
            all: t.sources.all,
            one: (source, percent) =>
              t.sources.one(source.label, source.entered, source.middle, source.outcome, percent),
          }}
        />
      )}
      {data && data.hidden > 0 ? (
        <p className="text-sm text-muted-foreground">{t.sources.hidden(data.hidden)}</p>
      ) : null}
    </Section>
  );
}
