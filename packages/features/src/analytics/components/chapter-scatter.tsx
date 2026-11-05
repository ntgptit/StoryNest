"use client";

import { useState } from "react";
import { Button } from "@storynest/ui/components/button";
import { ScatterPicker } from "@storynest/ui/widgets/scatter-picker";
import {
  chapterScatter,
  formatPercent,
  lowReadsThreshold,
  SCATTER_METRICS,
  type ChapterStat,
  type ScatterMetric,
} from "../model/stats.ts";
import { analyticsText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * Chapters as dots of reads against likes per 100 reads or retention (BR-STAT-015), so an author can spot a chapter
 * that is read a lot but liked little, or one that keeps readers better than its reads suggest. Built only from
 * `author_chapter_stats`; reads are reads (one reader × chapter × day), never distinct readers.
 */
export function ChapterScatter({
  chapters,
  locale = currentLocale(),
}: {
  chapters: readonly ChapterStat[];
  locale?: string;
}) {
  const t = analyticsText.scatter;
  const [metric, setMetric] = useState<ScatterMetric>("likesPer100");
  const [fade, setFade] = useState(false);
  const { points, omitted } = chapterScatter(chapters, metric);
  const threshold = lowReadsThreshold(chapters);
  const exact = new Intl.NumberFormat(locale);
  const ratio = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const formatValue = (value: number) => (metric === "retention" ? formatPercent(value) : ratio.format(value));
  const metricName = t.metrics[metric];
  // The filter only makes sense when some plotted chapter is under the threshold.
  const filterable = threshold > 0 && points.some((point) => point.reads < threshold);
  const fadedCount = fade && filterable ? points.filter((point) => point.reads < threshold).length : 0;

  const toolbar = (
    <div role="group" aria-label={t.metricLabel} className="flex flex-wrap gap-1">
      {SCATTER_METRICS.map((option) => (
        <Button
          key={option}
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={option === metric}
          onClick={() => setMetric(option)}
          className="aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
        >
          {t.metrics[option]}
        </Button>
      ))}
    </div>
  );

  if (points.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {toolbar}
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      </div>
    );
  }

  const omittedText =
    omitted > 0 ? (metric === "retention" ? t.omittedRetention(omitted) : t.omittedLikes(omitted)) : "";

  return (
    <ScatterPicker
      toolbar={toolbar}
      label={t.label(metricName)}
      hint={t.hint}
      xLabel={t.xAxis}
      yLabel={t.yAxis(metricName)}
      formatX={(value) => exact.format(value)}
      formatY={formatValue}
      summary={[t.summary(points.length, fadedCount), omittedText].filter(Boolean).join(" ")}
      filter={
        filterable
          ? { label: t.filter(exact.format(threshold)), pressed: fade, onPressedChange: setFade, below: threshold }
          : undefined
      }
      points={points.map((point) => {
        const detail = t.detail({
          number: point.number,
          title: point.title,
          reads: exact.format(point.reads),
          likes: exact.format(point.votes),
          metric: metricName,
          value: formatValue(point.value),
        });
        return { key: point.chapterId, x: point.reads, y: point.value, label: detail, detail };
      })}
    />
  );
}
