"use client";

import { HistoryScreen } from "@storynest/features";

import { getImageUrlResolver } from "@/lib/covers";

export function HistoryView({ storyId, chapterId }: { storyId: string; chapterId: string }) {
  return <HistoryScreen storyId={storyId} chapterId={chapterId} imageUrlFor={getImageUrlResolver()} />;
}
