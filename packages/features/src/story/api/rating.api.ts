import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toRating, type RatingRow, type StoryRating } from "../model/rating.ts";

/** Average, count and my stars for a story, and how many of its chapters I opened (guests: 0). */
export async function getStoryRating(client: DataClient, storyId: string): Promise<StoryRating> {
  const rows = unwrap(await client.rpc("get_story_rating", { p_story_id: storyId })) ?? [];
  return toRating((rows as RatingRow[])[0]);
}

/** Rates a story 1-5 (again = replace), or takes my rating back with null. Returns the new summary. */
export async function setStoryRating(
  client: DataClient,
  storyId: string,
  stars: number | null,
  previous: StoryRating,
): Promise<StoryRating> {
  // The generated type asks for a number, but the function reads NULL as "take my rating back".
  const rows = unwrap(await client.rpc("set_story_rating", { p_story_id: storyId, p_stars: stars as number })) ?? [];
  return toRating((rows as RatingRow[])[0], previous);
}
