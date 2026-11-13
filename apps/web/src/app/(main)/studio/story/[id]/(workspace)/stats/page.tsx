import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { requireUuidParams } from "@/lib/route-params";
import { appText } from "@/lib/strings";

import { StatsView } from "./stats-view";

export const metadata: Metadata = { title: appText.pageTitle.stats, robots: { index: false } };

/** Audience statistics of one story. The id decides the story; the database decides who may see its figures. */
export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  requireUuidParams(id);
  await requireUser(`/studio/story/${id}/stats`);
  return <StatsView storyId={id} />;
}
