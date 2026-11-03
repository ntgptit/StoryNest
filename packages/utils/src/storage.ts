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
