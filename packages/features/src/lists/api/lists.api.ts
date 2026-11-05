import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS } from "../../discovery/index.ts";
import {
  LIST_PREVIEW_COVERS,
  toListItems,
  toReadingList,
  type ListFormValues,
  type ListItem,
  type ListItemRow,
  type ListRow,
  type ReadingList,
} from "../model/list.ts";

const LIST_COLUMNS = "id, owner_id, title, description, visibility, updated_at";
const OWNER = "owner:app_users!reading_lists_owner_id_fkey(username, display_name)";
// The first stories of each list (their covers make the list's thumbnail): the same relation as the count, aliased.
const PREVIEW =
  "preview:reading_list_items(sort_order, story:stories!reading_list_items_story_id_fkey(cover_storage_key, deleted_at))";

/** The reader's own lists, most recently changed first, each with its story count and its first few covers. */
export async function listMyLists(client: DataClient, userId: string): Promise<ReadingList[]> {
  const rows =
    unwrap(
      await client
        .from("reading_lists")
        .select(`${LIST_COLUMNS}, items:reading_list_items(count), ${PREVIEW}`)
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false })
        .order("sort_order", { referencedTable: "preview", ascending: true })
        .limit(LIST_PREVIEW_COVERS, { referencedTable: "preview" })
        .returns<ListRow[]>(),
    ) ?? [];
  return rows.map(toReadingList);
}

/** One list (null when it does not exist or the reader may not see it) with its readable stories in order. */
export async function getList(
  client: DataClient,
  listId: string,
): Promise<{ list: ReadingList; items: ListItem[] } | null> {
  const row = unwrap(
    await client.from("reading_lists").select(`${LIST_COLUMNS}, ${OWNER}`).eq("id", listId).maybeSingle<ListRow>(),
  );
  if (!row) return null;
  const items =
    unwrap(
      await client
        .from("reading_list_items")
        .select(`story_id, sort_order, story:stories!reading_list_items_story_id_fkey(${STORY_COLUMNS}, deleted_at)`)
        .eq("reading_list_id", listId)
        .order("sort_order", { ascending: true })
        .returns<ListItemRow[]>(),
    ) ?? [];
  return { list: toReadingList(row), items: toListItems(items) };
}

/** Which of `listIds` already hold the story (RLS also returns other people's public lists, hence the filter). */
export async function getMembership(
  client: DataClient,
  storyId: string,
  listIds: readonly string[],
): Promise<string[]> {
  if (listIds.length === 0) return [];
  const rows =
    unwrap(
      await client
        .from("reading_list_items")
        .select("reading_list_id")
        .eq("story_id", storyId)
        .in("reading_list_id", [...listIds]),
    ) ?? [];
  return rows.map((row) => row.reading_list_id);
}

/**
 * Creates a list under a client-made id: sending the same id again (a retry after a lost answer) finds it already
 * there and is not an error.
 */
export async function createList(
  client: DataClient,
  userId: string,
  input: { id: string } & ListFormValues,
): Promise<string> {
  const result = await client.from("reading_lists").insert({
    id: input.id,
    owner_id: userId,
    title: input.title.trim(),
    description: input.description.trim(),
    visibility: input.visibility,
  });
  if (result.error && result.error.code !== "23505") unwrap(result);
  return input.id;
}

export async function updateList(client: DataClient, listId: string, values: ListFormValues): Promise<void> {
  const rows = unwrap(
    await client
      .from("reading_lists")
      .update({ title: values.title.trim(), description: values.description.trim(), visibility: values.visibility })
      .eq("id", listId)
      .select("id"),
  );
  if (!rows || rows.length === 0) throw new AppError("notFound", "Reading list not found or not editable");
}

export async function deleteList(client: DataClient, listId: string): Promise<void> {
  const rows = unwrap(await client.from("reading_lists").delete().eq("id", listId).select("id"));
  if (!rows || rows.length === 0) throw new AppError("notFound", "Reading list not found or not deletable");
}

/** Appends the story at the end of the list; a story already in it keeps its place. */
export async function addStoryToList(client: DataClient, listId: string, storyId: string): Promise<number> {
  return Number(unwrap(await client.rpc("add_story_to_list", { p_list_id: listId, p_story_id: storyId })) ?? 0);
}

export async function removeStoryFromList(client: DataClient, listId: string, storyId: string): Promise<void> {
  unwrap(await client.from("reading_list_items").delete().eq("reading_list_id", listId).eq("story_id", storyId));
}

/** Sends the complete new order; the server refuses a list that changed since it was read. */
export async function reorderList(client: DataClient, listId: string, storyIds: readonly string[]): Promise<void> {
  unwrap(await client.rpc("reorder_list_items", { p_list_id: listId, p_story_ids: [...storyIds] }));
}
