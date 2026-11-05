// Argument schemas for the public RPCs (names match the Postgres parameters exactly).
// The error contract (RPC_ERROR, classifyRpcError) is in rpc-errors.ts, which has no zod.
import { z } from "zod";

const uuid = z.uuid();
const revision = z.int().positive();

export const publishChapterArgsSchema = z.object({
  p_chapter_id: uuid,
  p_expected_revision: revision.optional(),
});

export const scheduleChapterArgsSchema = z.object({
  p_chapter_id: uuid,
  /** ISO-8601 with offset. Being in the future is enforced by the server clock, not here. */
  p_scheduled_for: z.iso.datetime({ offset: true }),
  p_expected_revision: revision.optional(),
});

export const unpublishChapterArgsSchema = z.object({ p_chapter_id: uuid });

export type PublishChapterArgs = z.infer<typeof publishChapterArgsSchema>;
export type ScheduleChapterArgs = z.infer<typeof scheduleChapterArgsSchema>;
export type UnpublishChapterArgs = z.infer<typeof unpublishChapterArgsSchema>;

export * from "./rpc-errors.ts";
