export interface Category {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
}

/** Ids matched when browsing `slug`: the category itself and its direct children. Unknown slug -> empty list. */
export function categoryIdsFor(slug: string, categories: readonly Category[]): number[] {
  const root = categories.find((c) => c.slug === slug);
  if (!root) return [];
  return [root.id, ...categories.filter((c) => c.parentId === root.id).map((c) => c.id)];
}

/** Top-level categories in display order, for the filter chips. */
export function rootCategories(categories: readonly Category[]): Category[] {
  return categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
