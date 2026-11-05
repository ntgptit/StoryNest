import { useEffect, useState } from "react";

const NONE: ReadonlySet<string> = new Set();

/** How long a row counts as "just arrived": a little longer than the longest arrival animation (the 1.4 s glow). */
export const ARRIVAL_MS = 1500;

/**
 * Keys of the rows that just arrived at the top of a newest-first list (Lucian 227's incoming rows): the rows now
 * standing in front of the row that used to be first. The first load, pages appended at the bottom and rows that
 * only change never count, so nothing animates when the page opens or when "load more" runs. The set empties again
 * after `ttl` ms, so a row that is filtered out and back in later does not replay its arrival.
 * Implemented as "adjust state while rendering", so the arrival class is there in the same commit as the new row.
 */
export function useArrivals<T>(items: readonly T[], key: (item: T) => string, ttl = ARRIVAL_MS): ReadonlySet<string> {
  const first = items[0];
  const head = first === undefined ? null : key(first);
  const [state, setState] = useState<{ head: string | null; arrivals: ReadonlySet<string> }>({
    head,
    arrivals: NONE,
  });
  if (head !== state.head) {
    let arrivals = NONE;
    if (state.head !== null && head !== null) {
      const previousHead = state.head;
      const index = items.findIndex((item) => key(item) === previousHead);
      if (index > 0) arrivals = new Set(items.slice(0, index).map(key));
    }
    setState({ head, arrivals });
  }

  useEffect(() => {
    if (state.arrivals.size === 0) return;
    const timer = window.setTimeout(() => setState((current) => ({ ...current, arrivals: NONE })), ttl);
    return () => window.clearTimeout(timer);
  }, [state.arrivals, ttl]);

  return state.arrivals;
}
