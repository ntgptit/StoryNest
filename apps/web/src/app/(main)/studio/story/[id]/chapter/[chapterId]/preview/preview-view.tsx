"use client";

import { PreviewScreen } from "@storynest/features";

import { getImageUrlResolver } from "@/lib/covers";

export function PreviewView({ storyId, chapterId }: { storyId: string; chapterId: string }) {
  return <PreviewScreen storyId={storyId} chapterId={chapterId} imageUrlFor={getImageUrlResolver()} />;
}
