export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Run the pending call now (e.g. before navigating away). No-op when nothing is pending. */
  flush(): void;
  /** Drop the pending call. */
  cancel(): void;
}

/** Trailing-edge debounce with flush/cancel, used for autosave and reading-progress writes. */
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, waitMs: number): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Args | undefined;

  const run = () => {
    timer = undefined;
    if (pending === undefined) return;
    const args = pending;
    pending = undefined;
    fn(...args);
  };

  const debounced = ((...args: Args) => {
    pending = args;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, waitMs);
  }) as Debounced<Args>;

  debounced.flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    run();
  };
  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  return debounced;
}
