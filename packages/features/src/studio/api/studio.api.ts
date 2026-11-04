import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import {
  isCollaboratorRole,
  mergeStudioStories,
  toStudioStory,
  type StudioStory,
  type StudioStoryRow,
} from "../model/studio-story.ts";

const STORY_COLUMNS = "id, slug, title, status, visibility, is_mature, cover_storage_key, updated_at, chapters(count)";

/**
 * Stories the user owns plus stories they were invited to, never anything else: RLS also lets everyone read public
 * stories, so both queries filter by the user explicitly. Soft-deleted stories are left out (the restore view is a
 * separate screen, WBS WP 3.2).
 */
export async function listMyStories(client: DataClient, userId: string): Promise<StudioStory[]> {
  const [owned, shared] = await Promise.all([
    client
      .from("stories")
      .select(STORY_COLUMNS)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .returns<StudioStoryRow[]>(),
    client
      .from("story_collaborators")
      .select(`collaborator_role, story:stories!story_collaborators_story_id_fkey!inner(${STORY_COLUMNS})`)
      .eq("user_id", userId)
      .is("story.deleted_at", null)
      .returns<{ collaborator_role: string; story: StudioStoryRow }[]>(),
  ]);

  const ownedStories = (unwrap(owned) ?? []).map((row) => toStudioStory(row, "owner"));
  const sharedStories = (unwrap(shared) ?? []).flatMap((row) =>
    isCollaboratorRole(row.collaborator_role) ? [toStudioStory(row.story, row.collaborator_role)] : [],
  );
  return mergeStudioStories(ownedStories, sharedStories);
}
