import { buildStorageKey } from "@storynest/utils";
import type { DataClient } from "../../_shared/client.ts";
import { AppError, toAppError } from "../../_shared/errors.ts";
import type { PreparedImage } from "../../_shared/image-prepare.ts";

export const CHAPTER_IMAGES_BUCKET = "chapter-images";

/** Public address of a chapter picture, built from the client (no request). */
export function chapterImageUrl(client: DataClient, key: string): string {
  return client.storage.from(CHAPTER_IMAGES_BUCKET).getPublicUrl(key).data.publicUrl;
}

/**
 * Uploads a prepared picture into the story's folder of the chapter-images bucket and returns its storage key. The
 * name is generated. Authors with a role on the story may do this (owner, co-author, editor); the bucket policy decides.
 * A picture that is never used in a published chapter stays in the bucket (nothing deletes it yet).
 */
export async function uploadChapterImage(client: DataClient, storyId: string, image: PreparedImage): Promise<string> {
  const key = buildStorageKey(storyId, image.extension);
  const { error } = await client.storage.from(CHAPTER_IMAGES_BUCKET).upload(key, image.blob, {
    contentType: image.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error === null) return key;
  // supabase-js reports Storage failures as { message, statusCode } (string) or { status }.
  const status = Number(
    (error as { statusCode?: string | number; status?: number }).statusCode ?? (error as { status?: number }).status,
  );
  if (status === 401) throw new AppError("unauthenticated", error.message, { cause: error });
  if (status === 403) throw new AppError("forbidden", error.message, { cause: error });
  if (status === 400 || status === 413 || status === 415)
    throw new AppError("invalid", error.message, { cause: error });
  throw toAppError(error);
}
