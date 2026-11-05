import { storyPartCreateSchema, storyPartTitleSchema } from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";
import type { PartRef } from "../../_shared/parts.ts";

/** The parts of a story, oldest first (the order they were made in). RLS: anyone who can read the story. */
export async function listStoryParts(client: DataClient, storyId: string): Promise<PartRef[]> {
  const rows =
    unwrap(
      await client
        .from("story_parts")
        .select("id, title")
        .eq("story_id", storyId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
    ) ?? [];
  return rows.map((row) => ({ id: row.id, title: row.title }));
}

/** Adds a part (team: owner, co-author, editor). The 101st part of a story is refused (PT409). */
export async function createStoryPart(client: DataClient, storyId: string, id: string, title: string): Promise<void> {
  const payload = storyPartCreateSchema.parse({ id, story_id: storyId, title });
  unwrap(await client.from("story_parts").insert(payload));
}

/** Renames a part. Zero matched rows means the caller may not (RLS) or the part is gone. */
export async function renameStoryPart(client: DataClient, partId: string, title: string): Promise<void> {
  const rows = unwrap(
    await client
      .from("story_parts")
      .update({ title: storyPartTitleSchema.parse(title) })
      .eq("id", partId)
      .select("id"),
  );
  if (!rows || rows.length === 0) throw new AppError("notFound", "Part not found or not editable");
}

/** Deletes a part (owner or co-author); its chapters stay, ungrouped. */
export async function deleteStoryPart(client: DataClient, partId: string): Promise<void> {
  const rows = unwrap(await client.from("story_parts").delete().eq("id", partId).select("id"));
  if (!rows || rows.length === 0) throw new AppError("forbidden", "Part not found or not deletable");
}

/** Puts a chapter in a part of the same story, or (null) in none. The database refuses a part of another story. */
export async function setChapterPart(client: DataClient, chapterId: string, partId: string | null): Promise<void> {
  const rows = unwrap(await client.from("chapters").update({ part_id: partId }).eq("id", chapterId).select("id"));
  if (!rows || rows.length === 0) throw new AppError("notFound", "Chapter not found or not editable");
}
