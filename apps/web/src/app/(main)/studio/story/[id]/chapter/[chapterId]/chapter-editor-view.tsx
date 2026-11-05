"use client";

import { ChapterEditorScreen } from "@storynest/features";

export function ChapterEditorView({ storyId, chapterId }: { storyId: string; chapterId: string }) {
  return <ChapterEditorScreen storyId={storyId} chapterId={chapterId} firstRunTour teamTools />;
}
