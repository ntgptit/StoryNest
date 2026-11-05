// Story parts (volumes, Lucian 102): shared by the studio chapter manager, the story page and the reader's contents.
// Reading order is always chapters.sort_order; a part labels the chapters assigned to it, so lists show a part heading
// at the start of each run of consecutive chapters in the same part (see migration 20261106040000).

export interface PartRef {
  id: string;
  title: string;
}

export interface PartRun<T> {
  /** Stable React key: the part id (or "none") plus the run's first position. */
  key: string;
  /** null for chapters that are in no part. */
  part: PartRef | null;
  items: T[];
}

/**
 * Splits items (already in reading order) into runs of the same part. A part whose chapters are not next to each
 * other appears once per run, so the list never reorders chapters to group them.
 */
export function partRuns<T>(items: readonly T[], partOf: (item: T) => PartRef | null): PartRun<T>[] {
  const runs: PartRun<T>[] = [];
  items.forEach((item, index) => {
    const part = partOf(item);
    const last = runs.at(-1);
    if (last && (last.part?.id ?? null) === (part?.id ?? null)) last.items.push(item);
    else runs.push({ key: `${part?.id ?? "none"}-${index}`, part, items: [item] });
  });
  return runs;
}

/** True when grouping would show anything: at least one item is in a part. */
export function hasParts<T>(items: readonly T[], partOf: (item: T) => PartRef | null): boolean {
  return items.some((item) => partOf(item) !== null);
}

/** One-to-one embed as PostgREST returns it (object, single-element array or null) to a PartRef. */
export function toPartRef(
  row: { id: string; title: string } | { id: string; title: string }[] | null | undefined,
): PartRef | null {
  const part = Array.isArray(row) ? row[0] : row;
  return part ? { id: part.id, title: part.title } : null;
}
