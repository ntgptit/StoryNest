import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { STORY_COLUMNS, toStorySummary, type StoryListRow, type StorySummary } from "../../discovery/index.ts";
import {
  FOR_ME_LIMIT,
  SIMILAR_LIMIT,
  toRecommendations,
  type Recommendation,
  type RecommendationRow,
} from "../model/recommendation.ts";

/** The same card query the home feed uses, for the stories a recommendation RPC named, kept in the RPC's order. */
async function withStories(client: DataClient, rows: readonly RecommendationRow[]): Promise<Recommendation[]> {
  if (rows.length === 0) return [];
  const stories =
    unwrap(
      await client
        .from("stories")
        .select(STORY_COLUMNS)
        .in(
          "id",
          rows.map((row) => row.story_id),
        )
        .returns<StoryListRow[]>(),
    ) ?? [];
  const byId = new Map<string, StorySummary>(stories.map((row) => [row.id, toStorySummary(row)]));
  return toRecommendations(rows, byId);
}

/** Stories like this one, each with the reason (shared tags, same category, readers of this story also read it). */
export async function listSimilarStories(
  client: DataClient,
  storyId: string,
  options: { limit?: number; includeMature?: boolean } = {},
): Promise<Recommendation[]> {
  const rows =
    unwrap(
      await client
        .rpc("similar_stories", {
          p_story_id: storyId,
          p_include_mature: options.includeMature ?? false,
          p_limit: options.limit ?? SIMILAR_LIMIT,
        })
        .returns<RecommendationRow[]>(),
    ) ?? [];
  return withStories(client, rows);
}

/** Stories the signed-in reader has not met yet, each with the reason (an author they follow, a story in their library). */
export async function listRecommendedForMe(
  client: DataClient,
  options: { limit?: number; includeMature?: boolean } = {},
): Promise<Recommendation[]> {
  const rows =
    unwrap(
      await client
        .rpc("recommend_for_me", {
          p_include_mature: options.includeMature ?? false,
          p_limit: options.limit ?? FOR_ME_LIMIT,
        })
        .returns<RecommendationRow[]>(),
    ) ?? [];
  return withStories(client, rows);
}
