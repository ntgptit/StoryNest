/** Puts `rows` in the order of `ids` and drops ids that did not come back (a story hidden between two requests). */
export function orderByIds<T extends { id: string }>(ids: readonly string[], rows: readonly T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
