"use client";

import { DiscoverScreen, FeaturedStories, ForYouStories, HomeEventPopup, type WordRange } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function DiscoverHome({
  categorySlug,
  tagSlug,
  words,
}: {
  categorySlug?: string;
  tagSlug?: string;
  words?: WordRange | undefined;
}) {
  const coverUrlFor = getCoverUrlResolver();
  // The featured row (the week's top stories) and personal suggestions sit above the feed, but only on the unfiltered
  // home page: a filtered view is a search for something.
  const filtered = categorySlug !== undefined || tagSlug !== undefined || words !== undefined;
  return (
    <div className="flex flex-col gap-8">
      {filtered ? null : <HomeEventPopup />}
      {filtered ? null : <FeaturedStories coverUrlFor={coverUrlFor} />}
      {filtered ? null : <ForYouStories coverUrlFor={coverUrlFor} />}
      <DiscoverScreen categorySlug={categorySlug} tagSlug={tagSlug} words={words} coverUrlFor={coverUrlFor} />
    </div>
  );
}
