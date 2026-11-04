/** Address of the home feed with its filters. The category and the tag combine; both live in the URL so a view can be shared. */
export function homeHref(filter: { categorySlug?: string | undefined; tagSlug?: string | undefined } = {}): string {
  const params = new URLSearchParams();
  if (filter.categorySlug) params.set("category", filter.categorySlug);
  if (filter.tagSlug) params.set("tag", filter.tagSlug);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
