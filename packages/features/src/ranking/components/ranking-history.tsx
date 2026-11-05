"use client";

// Ranking history on the ranking page: the last week as a bar race (Lucian 246) or as a slope chart of today's ranks
// against the first day (Lucian 359). Built from ranking_history, which applies the discovery rules live.
import { useState } from "react";
import { formatCount } from "@storynest/utils";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { BarRace, type RaceFrame } from "@storynest/ui/widgets/bar-race";
import { SlopeChart, type SlopeItem } from "@storynest/ui/widgets/slope-chart";
import { useRankingHistory } from "../hooks/use-ranking.ts";
import { rankMoves } from "../model/history.ts";
import type { RankingPeriod } from "../model/ranking.ts";
import { rankingText } from "../strings.ts";

const t = rankingText.history;

export function RankingHistory({ period, locale }: { period: RankingPeriod; locale: string }) {
  const history = useRankingHistory(period);
  const [view, setView] = useState<"race" | "slope">("race");
  if (!history.data) return null;
  const { days, titles } = history.data;
  const title = (id: string) => titles[id] ?? t.untitled;

  if (days.length < 2) {
    return days.length === 0 ? null : <p className="text-xs text-muted-foreground">{t.building}</p>;
  }

  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const frames: RaceFrame[] = days.map((day) => ({
    key: day.day,
    label: dayLabel.format(new Date(`${day.day}T00:00:00Z`)),
    bars: day.entries.map((entry) => ({ id: entry.storyId, label: title(entry.storyId), value: entry.score })),
  }));
  const items: SlopeItem[] = rankMoves(days).map((move) => ({
    id: move.storyId,
    label: title(move.storyId),
    from: move.from,
    to: move.to,
  }));

  return (
    <section aria-label={t.title} className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t.title}</h2>
        <Tabs value={view} onValueChange={(next) => setView(next === "slope" ? "slope" : "race")}>
          <TabsList aria-label={t.views}>
            <TabsTrigger value="race">{t.race}</TabsTrigger>
            <TabsTrigger value="slope">{t.slope}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {view === "race" ? (
        <BarRace
          frames={frames}
          format={(n) => formatCount(n, locale)}
          text={{
            label: t.raceLabel,
            play: t.play,
            pause: t.pause,
            scrubber: t.scrubber,
            bar: (rank, bar, value) => t.bar(rank, bar.label, value),
          }}
        />
      ) : (
        <SlopeChart
          items={items}
          text={{
            label: t.slopeLabel,
            fromLabel: t.fromLabel,
            toLabel: t.toLabel,
            modes: t.modes,
            rank: t.rank,
            score: t.score,
            item: (item) => t.move(item.label, item.from?.rank ?? null, item.to.rank),
            idle: t.idle,
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">{t.note}</p>
    </section>
  );
}
