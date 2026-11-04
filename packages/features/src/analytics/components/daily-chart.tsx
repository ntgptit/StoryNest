"use client";

import { formatCount } from "@storynest/utils";
import { barPercent, sumDaily, type DailyPoint } from "../model/stats.ts";
import { analyticsText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = analyticsText.daily;

/** One bar per day, as tall as that day's reads relative to the busiest day. The figures are also in the label. */
export function DailyChart({ points, locale = currentLocale() }: { points: readonly DailyPoint[]; locale?: string }) {
  const totals = sumDaily(points);
  const max = Math.max(0, ...points.map((p) => p.reads));
  if (totals.reads + totals.votes + totals.comments === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  }
  return (
    <div
      role="img"
      aria-label={t.chartLabel(points.length, totals.reads, totals.votes, totals.comments)}
      className="flex h-32 items-end gap-px rounded-lg border bg-muted/30 p-2"
    >
      {points.map((point) => (
        <div
          key={point.day}
          title={t.barTitle(point.day, formatCount(point.reads, locale))}
          className="flex-1 rounded-t-sm bg-primary/80"
          style={{ height: `${barPercent(point.reads, max)}%` }}
        />
      ))}
    </div>
  );
}
