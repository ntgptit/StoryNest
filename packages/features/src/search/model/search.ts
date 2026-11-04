// Rules and shapes of search that do not depend on React or Supabase. The limits mirror the database functions
// (search_prepare in migration 20261104001300_search.sql); the database stays the authority and refuses anything else.
export const SEARCH_MIN_LENGTH = 3;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_PAGE_SIZE = 12;
/** Last offset the database accepts: relevance order has no stable keyset, so deep paging is capped. */
export const SEARCH_MAX_OFFSET = 200;
export const SUGGESTION_COUNT = 5;
export const SUGGESTION_DELAY_MS = 250;
export const TAG_RESULT_LIMIT = 10;

export const SEARCH_TABS = ["stories", "authors", "tags"] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];
export const DEFAULT_SEARCH_TAB: SearchTab = "stories";

/** Trimmed, inner whitespace collapsed to single spaces: what the user means regardless of stray spaces. */
export function normalizeTerm(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export type TermState = "empty" | "short" | "ok" | "long";

export function termState(term: string): TermState {
  const length = Array.from(term).length;
  if (length === 0) return "empty";
  if (length < SEARCH_MIN_LENGTH) return "short";
  if (length > SEARCH_MAX_LENGTH) return "long";
  return "ok";
}

export function isSearchable(term: string): boolean {
  return termState(term) === "ok";
}

export function tabFromParam(value: string | null | undefined): SearchTab {
  return SEARCH_TABS.find((tab) => tab === value) ?? DEFAULT_SEARCH_TAB;
}

/** Address of a results page: the term and tab live in the URL so a search can be shared and survives a reload. */
export function searchHref(term: string, tab: SearchTab = DEFAULT_SEARCH_TAB): string {
  const params = new URLSearchParams();
  const clean = normalizeTerm(term);
  if (clean) params.set("q", clean);
  if (tab !== DEFAULT_SEARCH_TAB) params.set("tab", tab);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

/** Offset of the page after this one, or null when the last page was short or the database's cap is reached. */
export function nextOffset(offset: number, hasMore: boolean, pageSize: number = SEARCH_PAGE_SIZE): number | null {
  if (!hasMore) return null;
  const next = offset + pageSize;
  return next <= SEARCH_MAX_OFFSET ? next : null;
}

export interface ScoreRow {
  story_id: string;
  score: number;
}

export interface AuthorRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_storage_key: string | null;
  stories_count: number | string;
  score: number;
}

export interface TagRow {
  tag_id: number | string;
  slug: string;
  display_name: string;
  stories_count: number | string;
  score: number;
}

export interface AuthorHit {
  userId: string;
  username: string;
  displayName: string;
  avatarStorageKey: string | null;
  storiesCount: number;
}

export interface TagHit {
  id: number;
  slug: string;
  name: string;
  storiesCount: number;
}

export function toAuthorHit(row: AuthorRow): AuthorHit {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarStorageKey: row.avatar_storage_key,
    storiesCount: Number(row.stories_count),
  };
}

export function toTagHit(row: TagRow): TagHit {
  return { id: Number(row.tag_id), slug: row.slug, name: row.display_name, storiesCount: Number(row.stories_count) };
}

/** Puts `rows` in the order of `ids` and drops ids that did not come back (a story hidden between the two requests). */
export function orderByIds<T extends { id: string }>(ids: readonly string[], rows: readonly T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
