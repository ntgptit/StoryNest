"use client";

import { useReadingTracker } from "../../progress/index.ts";
import { blockAnchor } from "../model/chapter.ts";

/** Renders nothing: restores the saved position and records the reading position for a signed-in reader. */
export function ReadingTracker({ chapterId, blockIds }: { chapterId: string; blockIds: readonly string[] }) {
  useReadingTracker({ chapterId, blockIds, anchorFor: blockAnchor });
  return null;
}
