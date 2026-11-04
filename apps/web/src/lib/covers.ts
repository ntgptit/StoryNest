import { buildPublicStorageUrl } from "@storynest/utils";

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

/** Public bucket holding story covers (created with the Storage setup, WBS WP 3.3). */
const COVERS_BUCKET = "covers";

/** Resolver from a cover storage key to its public URL, or undefined when Supabase is not configured. */
export function getCoverUrlResolver(): ((key: string) => string) | undefined {
  if (!isSupabaseConfigured()) return undefined;
  const { url } = getSupabaseEnv();
  return (key) => buildPublicStorageUrl(url, COVERS_BUCKET, key);
}
