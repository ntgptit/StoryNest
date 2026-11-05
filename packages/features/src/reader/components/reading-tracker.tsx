"use client";

import { useReadRecorder, useReadingTracker } from "../../progress/index.ts";
import { blockAnchor } from "../model/chapter.ts";

/**
 * Renders nothing: restores/records the reading position (signed in) and reports the read after a short dwell.
 * `onRestored` gets the block the saved position brought the reader back to.
 */
export function ReadingTracker({
  chapterId,
  blockIds,
  onRestored,
}: {
  chapterId: string;
  blockIds: readonly string[];
  onRestored?: ((blockId: string) => void) | undefined;
}) {
  useReadingTracker({ chapterId, blockIds, anchorFor: blockAnchor, onRestored });
  useReadRecorder(chapterId);
  return null;
}
