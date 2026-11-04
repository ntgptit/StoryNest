"use client";

import { ArrowLeft, FileQuestion, Lock } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { formatCount } from "@storynest/utils";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { DailyChart } from "../components/daily-chart.tsx";
import { useChapterStats, useDailyStats } from "../hooks/use-analytics.ts";
import {
  barPercent,
  DEFAULT_RANGE,
  formatRetention,
  isRangeDays,
  RANGE_DAYS,
  sumDaily,
  type RangeDays,
} from "../model/stats.ts";
import { analyticsText } from "../strings.ts";

const t = analyticsText;

/** Audience figures of one story for its owner and co-authors: totals, days, and chapter by chapter. */
export function StoryStatsScreen({ storyId, locale = "vi" }: { storyId: string; locale?: string }) {
  const auth = useAuth();
  if (auth.status === "loading") return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" aria-busy />;
  if (auth.status === "unauthenticated") {
    return (
      <p className="text-sm text-muted-foreground">
        {t.signIn}{" "}
        <AppLink
          href={`/login?next=${encodeURIComponent(`/studio/story/${storyId}/stats`)}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.signInLink}
        </AppLink>
      </p>
    );
  }
  return <Stats storyId={storyId} locale={locale} />;
}

function Stats({ storyId, locale }: { storyId: string; locale: string }) {
  const [days, setDays] = useState<RangeDays>(DEFAULT_RANGE);
  const chapters = useChapterStats(storyId);
  const daily = useDailyStats(storyId, days);

  const failure = chapters.error ?? daily.error;
  if (failure?.kind === "forbidden") {
    return <EmptyState icon={Lock} title={t.noAccess.title} description={t.noAccess.description} />;
  }
  if (failure?.kind === "notFound") {
    return <EmptyState icon={FileQuestion} title={t.notFound.title} description={t.notFound.description} />;
  }

  const totals = sumDaily(daily.data ?? []);
  const rows = chapters.data ?? [];
  const maxReads = Math.max(0, ...rows.map((row) => row.reads));

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      <AppLink
        href="/studio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t.back}
      </AppLink>

      {failure ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => {
            void chapters.refetch();
            void daily.refetch();
          }}
        />
      ) : (
        <>
          <section aria-label={t.totals.title} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t.totals.title}</h2>
              <Tabs
                value={String(days)}
                onValueChange={(value) => {
                  const next = Number(value);
                  if (isRangeDays(next)) setDays(next);
                }}
              >
                <TabsList aria-label={t.range.label}>
                  {RANGE_DAYS.map((option) => (
                    <TabsTrigger key={option} value={String(option)}>
                      {t.range.options[option]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {daily.isPending ? (
              <Skeleton className="h-20 w-full rounded-xl" aria-busy />
            ) : (
              <dl className="grid grid-cols-3 gap-3">
                {(
                  [
                    [t.totals.reads, totals.reads],
                    [t.totals.votes, totals.votes],
                    [t.totals.comments, totals.comments],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{formatCount(value, locale)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section aria-label={t.daily.title} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t.daily.title}</h2>
            {daily.data ? (
              <DailyChart points={daily.data} locale={locale} />
            ) : (
              <Skeleton className="h-32 w-full rounded-lg" aria-busy />
            )}
            <p className="text-xs text-muted-foreground">{t.daily.note}</p>
          </section>

          <section aria-label={t.chapters.title} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t.chapters.title}</h2>
            {chapters.isPending ? (
              <Skeleton className="h-40 w-full rounded-xl" aria-busy />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.chapters.empty}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t.chapters.columns.chapter}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t.chapters.columns.reads}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t.chapters.columns.votes}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t.chapters.columns.comments}
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        {t.chapters.columns.retention}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.chapterId}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          <span className="block text-xs text-muted-foreground">
                            {t.chapters.chapterLabel(row.number)}
                          </span>
                          <span className="block max-w-56 truncate">{row.title}</span>
                        </th>
                        <td className="px-3 py-2 tabular-nums">
                          <span className="block">{formatCount(row.reads, locale)}</span>
                          <span
                            aria-hidden
                            className="mt-1 block h-1.5 rounded-full bg-primary/70"
                            style={{ width: `${barPercent(row.reads, maxReads)}%` }}
                          />
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatCount(row.votes, locale)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCount(row.comments, locale)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatRetention(row.retention)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t.chapters.note}</p>
          </section>
        </>
      )}
    </div>
  );
}
