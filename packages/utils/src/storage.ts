import { isUuid, newId } from "./id.ts";

/**
 * Public URL of an object in a PUBLIC Supabase Storage bucket. Each path segment is encoded; ".." and empty
 * segments are rejected so a key can never escape its bucket. Private buckets need signed URLs instead.
 */
export function buildPublicStorageUrl(supabaseUrl: string, bucket: string, key: string): string {
  const segments = key.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) {
    throw new Error(`Invalid storage key: "${key}"`);
  }
  const base = supabaseUrl.replace(/\/+$/g, "");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${segments.map(encodeURIComponent).join("/")}`;
}

// Storage key convention (WBS D3): "<scope_id>/<file_name>", where scope_id is the story id (covers, chapter-images)
// or the user id (avatars) and file_name is a single segment of [A-Za-z0-9._-] starting with a letter or digit, at most
// 200 characters. The database enforces the same rule (public.is_valid_storage_key); a test keeps the two equal.
const STORAGE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const STORAGE_EXTENSION = /^[a-z0-9]{1,10}$/;

/** True when `key` is a valid key inside `scopeId`'s folder (ids are compared in lowercase, as stored). */
export function isValidStorageKey(key: string, scopeId: string): boolean {
  if (!isUuid(scopeId)) return false;
  const prefix = `${scopeId.toLowerCase()}/`;
  return key.startsWith(prefix) && STORAGE_FILE_NAME.test(key.slice(prefix.length));
}

/**
 * A fresh key for a new upload: "<scope_id>/<random uuid>.<extension>". The name is generated, never taken from the
 * user's file name, so it is always valid, unique and says nothing about the original file.
 */
export function buildStorageKey(scopeId: string, extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase();
  if (!isUuid(scopeId)) throw new Error(`Invalid storage scope: "${scopeId}"`);
  if (!STORAGE_EXTENSION.test(ext)) throw new Error(`Invalid file extension: "${extension}"`);
  return `${scopeId.toLowerCase()}/${newId()}.${ext}`;
}
