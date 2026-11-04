/**
 * Chapter reader URL: /story/{id}/{slug}/{chapterSlug}. Used where a path must be recognised before React runs (the
 * reader-preferences bootstrap script in the root layout); the route itself lives in app/(main)/story/....
 */
export const CHAPTER_PATH_PATTERN = /^\/story\/[^/]+\/[^/]+\/[^/]+\/?$/;
