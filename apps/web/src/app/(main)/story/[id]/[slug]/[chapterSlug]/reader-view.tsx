"use client";

import { ReaderScreen } from "@storynest/features";

import { getCoverUrlResolver, getImageUrlResolver } from "@/lib/covers";

export function ReaderView({ storyId, chapterSlug }: { storyId: string; chapterSlug: string }) {
  return (
    <ReaderScreen
      storyId={storyId}
      chapterSlug={chapterSlug}
      imageUrlFor={getImageUrlResolver()}
      coverUrlFor={getCoverUrlResolver()}
    />
  );
}
