export interface HomeFilter {
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
}

/** Address of the home feed with its filters. The category and the tag combine; both live in the URL so a view can be shared. */
export function homeHref(filter: HomeFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.categorySlug) params.set("category", filter.categorySlug);
  if (filter.tagSlug) params.set("tag", filter.tagSlug);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

type QueryValue = string | readonly string[] | null | undefined;

/**
 * Reads the home filters back from the query string, the inverse of homeHref. Accepts both shapes the web app has: a
 * server page's `searchParams` (string, or string[] when repeated) and `URLSearchParams.getAll()`. Only one non-empty
 * value counts; a missing, empty or repeated parameter means "no filter", identically on the server and the client.
 */
export function homeFilterFrom(query: { category?: QueryValue; tag?: QueryValue }): HomeFilter {
  return { categorySlug: singleValue(query.category), tagSlug: singleValue(query.tag) };
}

function singleValue(value: QueryValue): string | undefined {
  const single = typeof value === "string" ? value : value?.length === 1 ? value[0] : undefined;
  return single ? single : undefined;
}
