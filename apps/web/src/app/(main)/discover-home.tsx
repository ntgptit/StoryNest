"use client";

import { DiscoverScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function DiscoverHome({ categorySlug, tagSlug }: { categorySlug?: string; tagSlug?: string }) {
  return <DiscoverScreen categorySlug={categorySlug} tagSlug={tagSlug} coverUrlFor={getCoverUrlResolver()} />;
}
