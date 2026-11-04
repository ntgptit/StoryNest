import type { Metadata } from "next";

import { appText } from "@/lib/strings";

import { RankingView } from "./ranking-view";

// The ranking changes with every refresh, but it is public content worth finding: indexed. The numbers behind it
// are a snapshot a few minutes old (see ranking_freshness), which the page says.
export const metadata: Metadata = { title: appText.pageTitle.ranking };

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const { period } = await searchParams;
  return <RankingView period={typeof period === "string" ? period : undefined} />;
}
