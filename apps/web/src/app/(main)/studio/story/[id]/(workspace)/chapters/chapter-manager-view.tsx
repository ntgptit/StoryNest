"use client";

import { ChapterManagerScreen } from "@storynest/features";

export function ChapterManagerView({ storyId }: { storyId: string }) {
  return <ChapterManagerScreen storyId={storyId} />;
}
