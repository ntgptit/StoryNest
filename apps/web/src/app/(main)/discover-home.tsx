"use client";

import { useSearchParams } from "next/navigation";
import { DiscoverScreen, ForYouStories, homeFilterFrom } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

/**
 * The filters come from the URL on the client, not from the server page: the filter chips are shallow links
 * (history.pushState), which update useSearchParams without a server render, so the feed switches at once.
 */
export function DiscoverHome() {
  const searchParams = useSearchParams();
  const { categorySlug, tagSlug } = homeFilterFrom({
    category: searchParams.getAll("category"),
    tag: searchParams.getAll("tag"),
  });
  const coverUrlFor = getCoverUrlResolver();
  // Personal suggestions sit above the feed, but only on the unfiltered home page: a filtered view is a search for something.
  const filtered = categorySlug !== undefined || tagSlug !== undefined;
  return (
    <div className="flex flex-col gap-8">
      {filtered ? null : <ForYouStories coverUrlFor={coverUrlFor} />}
      <DiscoverScreen categorySlug={categorySlug} tagSlug={tagSlug} coverUrlFor={coverUrlFor} />
    </div>
  );
}
