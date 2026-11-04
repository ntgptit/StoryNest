"use client";

import { useReadRecorder, useReadingTracker } from "../../progress/index.ts";
import { blockAnchor } from "../model/chapter.ts";

/** Renders nothing: restores/records the reading position (signed in) and reports the read after a short dwell. */
export function ReadingTracker({ chapterId, blockIds }: { chapterId: string; blockIds: readonly string[] }) {
  useReadingTracker({ chapterId, blockIds, anchorFor: blockAnchor });
  useReadRecorder(chapterId);
  return null;
}
