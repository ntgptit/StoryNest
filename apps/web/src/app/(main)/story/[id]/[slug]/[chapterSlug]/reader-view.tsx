"use client";

import { ReaderScreen } from "@storynest/features";

import { getImageUrlResolver } from "@/lib/covers";

export function ReaderView({ storyId, chapterSlug }: { storyId: string; chapterSlug: string }) {
  return <ReaderScreen storyId={storyId} chapterSlug={chapterSlug} imageUrlFor={getImageUrlResolver()} />;
}
