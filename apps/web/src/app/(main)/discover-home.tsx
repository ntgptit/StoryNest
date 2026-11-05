"use client";

import { DiscoverScreen, FeaturedStories, ForYouStories, HomeEventPopup } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function DiscoverHome({ categorySlug, tagSlug }: { categorySlug?: string; tagSlug?: string }) {
  const coverUrlFor = getCoverUrlResolver();
  // The featured row (the week's top stories) and personal suggestions sit above the feed, but only on the unfiltered
  // home page: a filtered view is a search for something.
  const filtered = categorySlug !== undefined || tagSlug !== undefined;
  return (
    <div className="flex flex-col gap-8">
      {filtered ? null : <HomeEventPopup />}
      {filtered ? null : <FeaturedStories coverUrlFor={coverUrlFor} />}
      {filtered ? null : <ForYouStories coverUrlFor={coverUrlFor} />}
      <DiscoverScreen categorySlug={categorySlug} tagSlug={tagSlug} coverUrlFor={coverUrlFor} />
    </div>
  );
}
