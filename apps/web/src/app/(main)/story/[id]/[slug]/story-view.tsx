"use client";

import { StoryScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function StoryView({ storyId }: { storyId: string }) {
  return <StoryScreen storyId={storyId} coverUrlFor={getCoverUrlResolver()} />;
}
