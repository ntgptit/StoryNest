"use client";

import { useEffect, useRef } from "react";
import { scrollRatio } from "@storynest/ui/widgets/reading-progress";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { saveReadingProgress } from "../api/progress.api.ts";
import {
  PROGRESS_WRITE_INTERVAL_MS,
  lastIndexAbove,
  shouldRestore,
  toPercent,
  type ChapterProgress,
  type ReadingPosition,
} from "../model/progress.ts";
import { createProgressWriter } from "../model/progress-writer.ts";
import { useChapterProgress } from "./use-progress.ts";

/** The block "being read" is the last one whose top has passed this fraction of the viewport height. */
const READING_LINE = 0.3;

function currentPosition(blockIds: readonly string[], anchorFor: (blockId: string) => string): ReadingPosition {
  const root = document.documentElement;
  const percent = toPercent(scrollRatio(window.scrollY, root.scrollHeight, root.clientHeight));
  const tops = blockIds.map((id) => document.getElementById(anchorFor(id))?.getBoundingClientRect().top ?? Infinity);
  const index = lastIndexAbove(tops, window.innerHeight * READING_LINE);
  return { lastBlockId: index === -1 ? null : (blockIds[index] ?? null), percent };
}

/** Scrolls to the saved position. Returns the block it landed on, or null when it fell back to the percentage. */
function restore(progress: ChapterProgress, anchorFor: (blockId: string) => string): string | null {
  const element = progress.lastBlockId ? document.getElementById(anchorFor(progress.lastBlockId)) : null;
  if (element) {
    element.scrollIntoView({ block: "start" });
    return progress.lastBlockId;
  }
  // The block is gone (the chapter was republished) or was never recorded: fall back to the percentage.
  const root = document.documentElement;
  window.scrollTo({ top: (progress.percent / 100) * (root.scrollHeight - root.clientHeight) });
  return null;
}

/**
 * Restores the saved position of the chapter on open and then records the reading position while the reader scrolls.
 * Does nothing for guests. Writes are throttled (one per few seconds), skip repeated positions, and are flushed when
 * the tab is hidden or the page is left. Saving is best effort: a failure never interrupts reading.
 * `onRestored` is told the block the saved position brought the reader back to (the reader marks it for the eye).
 */
export function useReadingTracker({
  chapterId,
  blockIds,
  anchorFor,
  onRestored,
}: {
  chapterId: string;
  blockIds: readonly string[];
  anchorFor: (blockId: string) => string;
  onRestored?: ((blockId: string) => void) | undefined;
}) {
  const auth = useAuth();
  const getClient = useDataClientGetter();
  const saved = useChapterProgress(chapterId);
  const ready = auth.status === "authenticated" && (saved.isSuccess || saved.isError);
  const savedProgress = saved.data;

  // Latest values for the long-lived listeners, without re-subscribing on every render.
  const inputs = useRef({ blockIds, anchorFor, savedProgress, onRestored });
  inputs.current = { blockIds, anchorFor, savedProgress, onRestored };

  useEffect(() => {
    if (!ready) return;
    const { anchorFor: anchor, savedProgress: progress } = inputs.current;

    // A deep link (#b-<id>) wins over the saved position.
    if (window.location.hash === "" && shouldRestore(progress)) {
      const landed = restore(progress, anchor);
      if (landed) inputs.current.onRestored?.(landed);
    }

    const writer = createProgressWriter({
      intervalMs: PROGRESS_WRITE_INTERVAL_MS,
      save: (position) => saveReadingProgress(getClient(), chapterId, position),
    });
    let frame = 0;
    const measure = () => {
      frame = 0;
      writer.push(currentPosition(inputs.current.blockIds, inputs.current.anchorFor));
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") writer.flush();
    };

    measure(); // opening a chapter already makes it the "current" one
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", writer.flush);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", writer.flush);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      writer.flush();
      writer.dispose();
    };
  }, [ready, chapterId, getClient]);
}
