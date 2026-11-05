"use client";

import { FunnelSteps } from "@storynest/ui/widgets/funnel-steps";
import { formatChange, formatPercent, readThroughFunnel, type ChapterStat } from "../model/stats.ts";
import { analyticsText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * Where readers stop: the chapters in reading order as a funnel of their reads, with the change from the chapter before
 * and the biggest drop highlighted (BR-STAT-011). Built only from `author_chapter_stats`, so the steps are reads (one
 * reader × chapter × day), never presented as distinct readers.
 */
export function ReadThroughFunnel({
  chapters,
  locale = currentLocale(),
}: {
  chapters: readonly ChapterStat[];
  locale?: string;
}) {
  const t = analyticsText;
  const funnel = readThroughFunnel(chapters);
  const first = funnel.steps[0];
  const last = funnel.steps.at(-1);
  if (!first || !last) return null;
  if (funnel.totalReads === 0) return <p className="text-sm text-muted-foreground">{t.funnel.empty}</p>;

  const exact = new Intl.NumberFormat(locale);
  const biggest = funnel.biggestDrop === null ? null : funnel.steps[funnel.biggestDrop];

  let summary: string;
  if (funnel.steps.length < 2) summary = t.funnel.single;
  else if (funnel.overall === null) summary = t.funnel.noBasis(first.number);
  else {
    const drop =
      biggest && biggest.dropOff !== null
        ? t.funnel.biggestDrop(biggest.number, formatChange(biggest.dropOff))
        : t.funnel.noDrop;
    summary = `${t.funnel.summary(last.number, first.number, formatPercent(funnel.overall))} ${drop}`;
  }

  return (
    <FunnelSteps
      label={t.funnel.label}
      summary={summary}
      highlightLabel={t.funnel.highlight}
      showAllLabel={t.funnel.showAll}
      showFewerLabel={t.funnel.showFewer}
      steps={funnel.steps.map((step, index) => {
        const previous = index > 0 ? funnel.steps[index - 1] : undefined;
        const change = step.dropOff === null ? null : formatChange(step.dropOff);
        return {
          key: step.chapterId,
          label: t.chapters.chapterLabel(step.number),
          sublabel: step.title,
          valueText: exact.format(step.reads),
          widthPercent: step.widthPercent,
          changeText: change ?? undefined,
          highlight: index === funnel.biggestDrop,
          detail: t.funnel.detail({
            number: step.number,
            title: step.title,
            reads: exact.format(step.reads),
            first: first.number,
            ofFirst: step.ofFirst === null ? null : formatPercent(step.ofFirst),
            previous: previous?.number ?? null,
            change,
          }),
        };
      })}
    />
  );
}
