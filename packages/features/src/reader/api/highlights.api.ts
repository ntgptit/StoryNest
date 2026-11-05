import type { HighlightStyle } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toHighlights, type Highlight, type HighlightRow } from "../model/highlights.ts";

/** My highlights in a chapter, each with whether the paragraph changed since (only mine: the server filters). */
export async function listMyHighlights(client: DataClient, chapterId: string): Promise<Highlight[]> {
  const rows = unwrap(await client.rpc("list_my_highlights", { p_chapter_id: chapterId })) ?? [];
  return toHighlights(rows as HighlightRow[]);
}

/** Highlights [start, end) of a paragraph; the same range again only changes its style. Returns the highlight id. */
export async function addHighlight(
  client: DataClient,
  input: { chapterId: string; blockId: string; start: number; end: number; style: HighlightStyle },
): Promise<string> {
  const id = unwrap(
    await client.rpc("add_chapter_highlight", {
      p_chapter_id: input.chapterId,
      p_block_id: input.blockId,
      p_start: input.start,
      p_end: input.end,
      p_style: input.style,
    }),
  );
  return String(id ?? "");
}

/** Deletes my highlights by id (RLS: only my own rows can be deleted). */
export async function removeHighlights(client: DataClient, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  unwrap(
    await client
      .from("chapter_highlights")
      .delete()
      .in("id", [...ids]),
  );
}
