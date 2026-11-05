import { STORY_STATUS, VISIBILITY } from "@storynest/validation";
import { decodeCursor, encodeCursor, isUuid } from "@storynest/utils";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";
import { DEFAULT_PAGE_SIZE, type LatestStoriesFilter } from "../keys.ts";
import { categoryIdsFor, type Category } from "../model/categories.ts";
import { toStorySummary, type StoryListRow, type StorySummary } from "../model/story-card.ts";
import { toPopularTag, type PopularTag, type PopularTagRow } from "../model/popular-tags.ts";

// One request returns the story with its author, category, counters and tags: no per-card follow-up queries.
// The explicit relationship name is required: stories and app_users are linked several ways (owner, collaborators,
// follows, saves, progress), so a bare `app_users(...)` embed is ambiguous (PostgREST error PGRST201).
export const STORY_COLUMNS = [
  "id, slug, title, synopsis, cover_storage_key, status, is_mature, language_code, updated_at",
  "owner:app_users!stories_owner_id_fkey(username, display_name)",
  "category:categories(slug, name)",
  "stats:story_stats(reads, votes, comments, followers)",
  "story_tags(tag:tags(slug, display_name))",
].join(", ");

// Filtering by tag needs an inner join, which must not disturb the `story_tags` embed that feeds the card: it gets its
// own alias. Rows come back with an extra `tagFilter` field that the mapper ignores.
const TAG_FILTER_COLUMN = "tagFilter:story_tags!inner(tag:tags!inner(slug))";
const TAG_FILTER_PATH = "tagFilter.tag.slug";

export interface StoryPage {
  items: StorySummary[];
  /** Opaque cursor for the next page, or null when this was the last one. */
  nextCursor: string | null;
}

export async function listCategories(client: DataClient): Promise<Category[]> {
  const rows =
    unwrap(
      await client.from("categories").select("id, slug, name, parent_id, sort_order").order("sort_order").order("id"),
    ) ?? [];
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id, sortOrder: r.sort_order }));
}

/** Position of the last item of a page. Keyset on (updated_at, id): stable while stories are added or updated. */
function readCursor(cursor: string): { updatedAt: string; id: string } {
  const position = decodeCursor(cursor);
  const updatedAt = position?.u;
  const id = position?.i;
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt)) || !isUuid(id)) {
    throw new AppError("invalid", "Invalid pagination cursor");
  }
  return { updatedAt, id };
}

/**
 * Public stories, most recently updated first. Only `public` stories are listed (RLS also exposes `unlisted` ones to
 * anyone holding the link, which discovery must not advertise), drafts and soft-deleted stories are skipped, and
 * mature stories are hidden unless asked for. `categories` must be the full category list so a root category can
 * include its sub-categories.
 */
type StoryFilterOptions = LatestStoriesFilter & { categories?: readonly Category[] | undefined };

/**
 * The stories query with every discovery filter applied: rows (`STORY_COLUMNS`) or, with `countOnly`, a head-only
 * exact count of the same rows. Null when the filter can match nothing (an unknown category), so it is not sent.
 */
function filteredStories(client: DataClient, options: StoryFilterOptions, countOnly = false) {
  const base = countOnly ? "id" : STORY_COLUMNS;
  const columns = options.tagSlug ? `${base}, ${TAG_FILTER_COLUMN}` : base;
  let query = client
    .from("stories")
    .select(columns, countOnly ? { count: "exact", head: true } : undefined)
    .eq("visibility", VISIBILITY.PUBLIC)
    .is("deleted_at", null)
    .neq("status", STORY_STATUS.DRAFT);

  if (!options.includeMature) query = query.eq("is_mature", false);
  if (options.language) query = query.eq("language_code", options.language);

  if (options.categorySlug) {
    const ids = categoryIdsFor(options.categorySlug, options.categories ?? []);
    // An unknown category lists nothing (rather than silently listing everything).
    if (ids.length === 0) return null;
    query = query.in("category_id", ids);
  }

  if (options.tagSlug) query = query.eq(TAG_FILTER_PATH, options.tagSlug);
  if (options.authorId) query = query.eq("owner_id", options.authorId);
  return query;
}

/**
 * How many stories the home feed would list for this filter: one head-only request (no rows), for the "Show N
 * stories" button of the filter sheet and the counts on the "loosen the filters" chips.
 */
export async function countLatestStories(client: DataClient, options: StoryFilterOptions): Promise<number> {
  const query = filteredStories(client, options, true);
  if (!query) return 0;
  const result = await query;
  unwrap(result);
  return result.count ?? 0;
}

export async function listLatestStories(
  client: DataClient,
  options: StoryFilterOptions & { cursor?: string | null | undefined },
): Promise<StoryPage> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  let query = filteredStories(client, options);
  if (!query) return { items: [], nextCursor: null };

  if (options.cursor) {
    const { updatedAt, id } = readCursor(options.cursor);
    query = query.or(`updated_at.lt."${updatedAt}",and(updated_at.eq."${updatedAt}",id.lt.${id})`);
  }

  // One extra row tells us whether another page exists without a count query.
  const rows =
    unwrap(
      await query
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(pageSize + 1)
        .returns<StoryListRow[]>(),
    ) ?? [];

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const items = pageRows.map(toStorySummary);
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? encodeCursor({ u: last.updatedAt, i: last.id }) : null };
}

/** The tags most used by public stories (never mature, never of a suspended author): the home page's quick filters. */
export async function listPopularTags(client: DataClient, limit: number): Promise<PopularTag[]> {
  const rows = unwrap(await client.rpc("popular_tags", { p_limit: limit }).returns<PopularTagRow[]>()) ?? [];
  return rows.map(toPopularTag);
}
