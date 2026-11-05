"use client";

import { SyncedSmallMultiples, type SmallMultipleDay } from "@storynest/ui/widgets/synced-small-multiples";
import {
  alignDaily,
  formatDay,
  publishedByDay,
  RANGE_DAYS,
  sumDaily,
  type DailyPoint,
  type PublishedChapter,
} from "../model/stats.ts";
import { analyticsText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/** Bar slots per chart: the longest range, so switching ranges morphs the bars instead of replacing them. */
const SLOTS = Math.max(...RANGE_DAYS);

/**
 * Reads, likes and comments per day as three small multiples sharing one cursor (pointer, touch, ←/→), with the days
 * chapters were first published flagged when the chapter list is known. The same figures are offered as a table.
 */
export function DailyChart({
  points,
  published = [],
  locale = currentLocale(),
}: {
  points: readonly DailyPoint[];
  /** Published chapters with their first publication time; omit when unknown (no flags are drawn). */
  published?: readonly PublishedChapter[];
  locale?: string;
}) {
  const t = analyticsText.daily;
  const totals = sumDaily(points);
  if (totals.reads + totals.votes + totals.comments === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  }

  const series = alignDaily(points);
  const flags = publishedByDay(series.days, published);
  const exact = new Intl.NumberFormat(locale);
  const signed = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  const days: SmallMultipleDay[] = series.days.map((day) => {
    const chapters = flags[day];
    return {
      key: day,
      label: formatDay(day, locale, "long"),
      short: formatDay(day, locale, "short"),
      note: chapters ? t.published(chapters) : undefined,
    };
  });

  return (
    <SyncedSmallMultiples
      days={days}
      slots={SLOTS}
      series={[
        { key: "reads", label: t.series.reads, values: series.reads, tone: 1 },
        { key: "votes", label: t.series.votes, values: series.votes, tone: 2 },
        { key: "comments", label: t.series.comments, values: series.comments, tone: 3 },
      ]}
      formatValue={(value) => exact.format(value)}
      formatDelta={(delta) => signed.format(delta)}
      describeDay={(index) =>
        t.readout(
          days[index]?.label ?? "",
          series.reads[index] ?? 0,
          series.votes[index] ?? 0,
          series.comments[index] ?? 0,
          days[index]?.note ?? null,
        )
      }
      summary={t.chartLabel(series.days.length, totals.reads, totals.votes, totals.comments)}
      text={{
        chartLabel: t.seriesChart,
        hint: t.hint,
        latest: t.latest,
        average: t.average,
        showTable: t.showTable,
        hideTable: t.hideTable,
        tableCaption: t.tableCaption(series.days.length),
        dayColumn: t.dayColumn,
        noteColumn: t.publishedColumn,
      }}
    />
  );
}
