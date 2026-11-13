import {
  CHAPTER_STATUS,
  CHAPTER_STATUSES,
  publishChapterArgsSchema,
  scheduleChapterArgsSchema,
  unpublishChapterArgsSchema,
  type ChapterStatus,
} from "@storynest/validation";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, unwrap } from "../../_shared/errors.ts";

/** Who the signed-in user is on the story: only owners and co-authors may unpublish; editors may publish. */
export type PublishRole = "owner" | "co_author" | "editor";

export interface ChapterPublishState {
  status: ChapterStatus;
  /** ISO timestamp when `status` is scheduled. */
  scheduledFor: string | null;
  role: PublishRole | null;
}

const ROLES: readonly PublishRole[] = ["owner", "co_author", "editor"];

export async function getChapterPublishState(
  client: DataClient,
  chapterId: string,
): Promise<ChapterPublishState | null> {
  const chapter = unwrap(
    await client.from("chapters").select("story_id, status, scheduled_for").eq("id", chapterId).maybeSingle(),
  );
  if (!chapter) return null;
  // story_role is the database's own answer (the same function RLS uses), not a second implementation of it.
  const role = unwrap(await client.rpc("story_role", { p_story_id: chapter.story_id }));
  return {
    status: CHAPTER_STATUSES.find((s) => s === chapter.status) ?? CHAPTER_STATUS.DRAFT,
    scheduledFor: chapter.scheduled_for,
    role: ROLES.find((r) => r === role) ?? null,
  };
}

/** What publishing a chapter will do (from `publish_preview`; only the story's team may ask). */
export interface PublishPreview {
  isFirstPublish: boolean;
  /** Followers are told when it is published (public or unlisted story). */
  notifies: boolean;
  /** About how many followers would be told now (the follower's own notification switches are not counted). */
  followers: number;
}

export async function getPublishPreview(client: DataClient, chapterId: string): Promise<PublishPreview | null> {
  const rows = unwrap(await client.rpc("publish_preview", { p_chapter_id: chapterId })) ?? [];
  const row = rows[0];
  if (!row) return null;
  return { isFirstPublish: row.is_first_publish, notifies: row.notifies, followers: row.follower_count };
}

/** Publishes the draft as it was at `expectedRevision` (a newer draft is refused, PT409). Resolves to the version id. */
export async function publishChapter(client: DataClient, chapterId: string, expectedRevision: number): Promise<string> {
  const args = publishChapterArgsSchema.parse({ p_chapter_id: chapterId, p_expected_revision: expectedRevision });
  const versionId = unwrap(await client.rpc("publish_chapter", args));
  if (!versionId) throw new AppError("unknown", "publish_chapter returned no version");
  return versionId;
}

/** `scheduledFor` is an ISO-8601 instant with an offset; it must be in the future (the server clock decides). */
export async function scheduleChapter(
  client: DataClient,
  chapterId: string,
  scheduledFor: string,
  expectedRevision: number,
): Promise<void> {
  const args = scheduleChapterArgsSchema.parse({
    p_chapter_id: chapterId,
    p_scheduled_for: scheduledFor,
    p_expected_revision: expectedRevision,
  });
  unwrap(await client.rpc("schedule_chapter", args));
}

/** Takes a published or scheduled chapter back to a draft (owner or co-author only). */
export async function unpublishChapter(client: DataClient, chapterId: string): Promise<void> {
  unwrap(await client.rpc("unpublish_chapter", unpublishChapterArgsSchema.parse({ p_chapter_id: chapterId })));
}
