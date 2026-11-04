import { samePosition, type ReadingPosition } from "./progress.ts";

export interface ProgressWriter {
  /** Offer the latest position. Written now if the interval has passed, otherwise at the end of the interval. */
  push(position: ReadingPosition): void;
  /** Write the pending position immediately (tab hidden, leaving the page). No-op if nothing changed. */
  flush(): void;
  /** Drop anything pending and stop timers. */
  dispose(): void;
}

/**
 * Throttles progress writes: at most one per `intervalMs` while the reader scrolls (leading write, then one trailing
 * write with the newest position), and never the same position twice. A failed write is retried with the next push.
 */
export function createProgressWriter({
  save,
  intervalMs,
  now = Date.now,
}: {
  save: (position: ReadingPosition) => Promise<void>;
  intervalMs: number;
  now?: () => number;
}): ProgressWriter {
  let saved: ReadingPosition | null = null;
  let pending: ReadingPosition | null = null;
  let lastWriteAt = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const write = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    const position = pending;
    pending = null;
    if (!position || samePosition(saved, position)) return;
    lastWriteAt = now();
    void save(position).then(
      () => {
        saved = position;
      },
      () => {
        // Best effort: keep `saved` as it was so the next push writes again.
      },
    );
  };

  return {
    push(position) {
      if (disposed) return;
      pending = position;
      const wait = lastWriteAt + intervalMs - now();
      if (wait <= 0) write();
      else if (timer === undefined) timer = setTimeout(write, wait);
    },
    flush() {
      if (!disposed) write();
    },
    dispose() {
      disposed = true;
      pending = null;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
