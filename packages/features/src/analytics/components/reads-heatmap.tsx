"use client";

import { CalendarHeatmap, type HeatmapCell } from "@storynest/ui/widgets/calendar-heatmap";
import {
  alignDaily,
  formatDay,
  formatMonth,
  heatLegend,
  heatLevel,
  publishedByDay,
  weekColumns,
  weekdayNames,
  type DailyPoint,
  type PublishedChapter,
} from "../model/stats.ts";
import { analyticsText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * Reads of the last 90 days (the most `author_story_daily` returns) as a weeks × weekdays heatmap, so weekly rhythms and
 * quiet spells show at a glance. Shaded by reads only; a picked day reads out its reads, likes and comments (and any
 * chapter first published that day), and the same reads are offered as a table.
 */
export function ReadsHeatmap({
  points,
  published = [],
  locale = currentLocale(),
}: {
  points: readonly DailyPoint[];
  published?: readonly PublishedChapter[];
  locale?: string;
}) {
  const t = analyticsText;
  const series = alignDaily(points);
  const totalReads = series.reads.reduce((sum, reads) => sum + reads, 0);
  if (series.days.length === 0) return null;
  if (totalReads === 0) return <p className="text-sm text-muted-foreground">{t.heatmap.empty}</p>;

  const exact = new Intl.NumberFormat(locale);
  const max = Math.max(...series.reads);
  const busiest = series.reads.indexOf(max);
  const flags = publishedByDay(series.days, published);
  const grid = weekColumns(series.days);
  const weekdays = weekdayNames(locale);

  const columns = grid.columns.map((column) =>
    column.map((index): HeatmapCell | null => {
      const day = index === null ? undefined : series.days[index];
      if (index === null || day === undefined) return null;
      const reads = series.reads[index] ?? 0;
      const chapters = flags[day];
      return {
        key: day,
        level: heatLevel(reads, max),
        label: t.daily.readout(
          formatDay(day, locale, "long"),
          reads,
          series.votes[index] ?? 0,
          series.comments[index] ?? 0,
          chapters ? t.daily.published(chapters) : null,
        ),
        valueText: exact.format(reads),
      };
    }),
  );

  return (
    <CalendarHeatmap
      columns={columns}
      rows={weekdays.map((weekday, index) => ({
        label: weekday.long,
        abbr: weekday.short,
        // Monday, Wednesday and Friday, like most contribution grids: enough to read the rows without crowding a phone.
        showLabel: index % 2 === 0 && index < 5,
      }))}
      columnLabels={grid.weekStarts.map((weekStart, week) => {
        const monthStart = grid.monthStarts[week];
        return {
          short: monthStart ? formatMonth(monthStart, locale) : "",
          long: formatDay(weekStart, locale, "long"),
        };
      })}
      legend={heatLegend(max).map(({ level, from, to }) => ({
        level,
        label: from === to ? exact.format(from) : `${exact.format(from)}–${exact.format(to)}`,
      }))}
      label={t.heatmap.label}
      summary={t.heatmap.summary(
        series.days.length,
        exact.format(totalReads),
        formatDay(series.days[busiest] ?? "", locale, "long"),
        exact.format(max),
      )}
      text={{
        hint: t.heatmap.hint,
        legend: t.heatmap.legend,
        showTable: t.heatmap.showTable,
        hideTable: t.heatmap.hideTable,
        tableCaption: t.heatmap.tableCaption,
        columnHeader: t.heatmap.weekColumn,
      }}
    />
  );
}
