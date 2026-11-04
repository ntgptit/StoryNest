"use client";

import { DiscoverScreen } from "@storynest/features";
import { buildPublicStorageUrl } from "@storynest/utils";

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

/** Public bucket holding story covers (created with the Storage setup, WBS WP 3.3). */
const COVERS_BUCKET = "covers";

export function DiscoverHome({ categorySlug }: { categorySlug?: string }) {
  const coverUrlFor = isSupabaseConfigured()
    ? (key: string) => buildPublicStorageUrl(getSupabaseEnv().url, COVERS_BUCKET, key)
    : undefined;
  return <DiscoverScreen categorySlug={categorySlug} coverUrlFor={coverUrlFor} />;
}
