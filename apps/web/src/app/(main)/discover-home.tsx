"use client";

import { DiscoverScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function DiscoverHome({ categorySlug }: { categorySlug?: string }) {
  return <DiscoverScreen categorySlug={categorySlug} coverUrlFor={getCoverUrlResolver()} />;
}
