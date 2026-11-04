import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import type { LibraryState } from "../model/library.ts";

/** Whether the signed-in reader follows / saved the story (their own rows only). A guest has neither. */
export async function getLibraryState(
  client: DataClient,
  storyId: string,
  userId: string | null,
): Promise<LibraryState> {
  if (userId === null) return { following: false, saved: false };
  const [follow, save] = await Promise.all([
    client.from("story_follows").select("story_id").eq("story_id", storyId).eq("user_id", userId).maybeSingle(),
    client.from("story_saves").select("story_id").eq("story_id", storyId).eq("user_id", userId).maybeSingle(),
  ]);
  return { following: unwrap(follow) !== null, saved: unwrap(save) !== null };
}

/** Sets my follow to exactly `followed` (asking twice is harmless) and returns the story's follower count. */
export async function setStoryFollow(client: DataClient, storyId: string, followed: boolean): Promise<number> {
  return Number(unwrap(await client.rpc("set_story_follow", { p_story_id: storyId, p_followed: followed })) ?? 0);
}

export async function setStorySave(client: DataClient, storyId: string, saved: boolean): Promise<number> {
  return Number(unwrap(await client.rpc("set_story_save", { p_story_id: storyId, p_saved: saved })) ?? 0);
}
