"use client";

import { RankingScreen, periodFromParam } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function RankingView({ period }: { period: string | undefined }) {
  return <RankingScreen period={periodFromParam(period)} coverUrlFor={getCoverUrlResolver()} />;
}
