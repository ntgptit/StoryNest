import { wordsParam, type WordRange } from "./story-length.ts";

/**
 * Address of the home feed with its filters. The category, the tag and the length combine; all live in the URL so a
 * view can be shared.
 */
export function homeHref(
  filter: { categorySlug?: string | undefined; tagSlug?: string | undefined; words?: WordRange | undefined } = {},
): string {
  const params = new URLSearchParams();
  if (filter.categorySlug) params.set("category", filter.categorySlug);
  if (filter.tagSlug) params.set("tag", filter.tagSlug);
  if (filter.words) params.set("words", wordsParam(filter.words));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
