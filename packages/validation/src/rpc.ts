// Argument schemas for the public RPCs (names match the Postgres parameters exactly).
// Error contract of the RPCs: 42501 forbidden, PT404 not found, PT409 conflict, 22023 invalid input.
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

/** SQLSTATEs raised by the publish RPCs. */
export const RPC_ERROR = {
  forbidden: "42501",
  notFound: "PT404",
  conflict: "PT409",
  invalid: "22023",
} as const;
export type RpcErrorKind = keyof typeof RPC_ERROR;

export function classifyRpcError(code: string | null | undefined): RpcErrorKind | "unknown" {
  const hit = (Object.entries(RPC_ERROR) as [RpcErrorKind, string][]).find(([, c]) => c === code);
  return hit ? hit[0] : "unknown";
}
