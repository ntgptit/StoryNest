"use client";

import { StoryStatsScreen } from "@storynest/features";

export function StatsView({ storyId }: { storyId: string }) {
  return <StoryStatsScreen storyId={storyId} />;
}
