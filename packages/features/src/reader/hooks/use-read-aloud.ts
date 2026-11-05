"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { blockAnchor } from "../model/chapter.ts";
import { firstUnreadBlock, readAloudProgress, type SpokenBlock } from "../model/read-aloud.ts";

/** Whether this browser can speak (Web Speech API). False on the server and in WebViews without it. */
export function speechAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

const noSubscribe = () => () => {};

/** speechAvailable() without a hydration mismatch: false on the server and during hydration, then the real answer. */
export function useSpeechAvailable(): boolean {
  return useSyncExternalStore(noSubscribe, speechAvailable, () => false);
}

/** Where the reader bar ends: blocks above it count as read when reading starts. */
function readingLine(): number {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--app-header-offset")) || 0;
  return header + 48;
}

/**
 * Reads `queue` aloud with the browser's speech engine, one block per utterance (long texts are cut off by some
 * engines). Play starts at the first block still on screen below the reader bar, or where the last pause stopped;
 * pause cancels speech and remembers the block (pause/resume of the engine itself is unreliable on mobile). Speech
 * stops on unmount: key the caller by chapter so a new chapter starts silent.
 */
export function useReadAloud(queue: readonly SpokenBlock[], lang: string) {
  const [state, setState] = useState({ playing: false, index: 0 });
  // Each start gets a number: the end (or cancel) event of an older utterance must not move the reading on.
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    if (speechAvailable()) window.speechSynthesis.cancel();
  }, []);

  const speakFrom = useCallback(
    (index: number) => {
      stop();
      const id = run.current;
      const next = (i: number) => {
        if (id !== run.current) return;
        const block = queue[i];
        if (!block) {
          setState({ playing: false, index: 0 });
          return;
        }
        setState({ playing: true, index: i });
        const utterance = new window.SpeechSynthesisUtterance(block.text);
        utterance.lang = lang;
        utterance.onend = () => next(i + 1);
        utterance.onerror = () => {
          if (id === run.current) setState({ playing: false, index: i });
        };
        window.speechSynthesis.speak(utterance);
      };
      next(index);
    },
    [queue, lang, stop],
  );

  const toggle = useCallback(() => {
    if (state.playing) {
      stop();
      setState((s) => ({ ...s, playing: false }));
      return;
    }
    let start = state.index;
    if (start === 0) {
      const bottoms = queue.map(
        (block) => document.getElementById(blockAnchor(block.id))?.getBoundingClientRect().bottom ?? Infinity,
      );
      start = Math.max(0, firstUnreadBlock(bottoms, readingLine()));
    }
    speakFrom(start);
  }, [state, queue, speakFrom, stop]);

  // Leaving the chapter: silence.
  useEffect(() => stop, [stop]);

  return { playing: state.playing, progress: readAloudProgress(state.index, queue.length), toggle };
}
