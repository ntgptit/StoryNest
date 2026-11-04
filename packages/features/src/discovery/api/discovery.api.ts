import { STORY_STATUS, VISIBILITY } from "@storynest/validation";
import { decodeCursor, encodeCursor, isUuid } from "@storynest/utils";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";
import { DEFAULT_PAGE_SIZE, type LatestStoriesFilter } from "../keys.ts";
import { categoryIdsFor, type Category } from "../model/categories.ts";
import { toStorySummary, type StoryListRow, type StorySummary } from "../model/story-card.ts";

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
export async function listLatestStories(
  client: DataClient,
  options: LatestStoriesFilter & { cursor?: string | null | undefined; categories?: readonly Category[] | undefined },
): Promise<StoryPage> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  let query = client
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("visibility", VISIBILITY.PUBLIC)
    .is("deleted_at", null)
    .neq("status", STORY_STATUS.DRAFT);

  if (!options.includeMature) query = query.eq("is_mature", false);
  if (options.language) query = query.eq("language_code", options.language);

  if (options.categorySlug) {
    const ids = categoryIdsFor(options.categorySlug, options.categories ?? []);
    // An unknown category lists nothing (rather than silently listing everything).
    if (ids.length === 0) return { items: [], nextCursor: null };
    query = query.in("category_id", ids);
  }

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
