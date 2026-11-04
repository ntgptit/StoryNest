import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { isIndexable } from "@storynest/features";
import { excerpt } from "@storynest/utils";

import { getCoverUrlResolver } from "@/lib/covers";
import { loadStory } from "@/lib/story/load-story";

import { StoryView } from "./story-view";

type Params = Promise<{ id: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { story } = await loadStory(id);
  if (!story) return { title: "Truyện", robots: { index: false } };

  const coverUrl = story.coverStorageKey ? getCoverUrlResolver()?.(story.coverStorageKey) : undefined;
  const description = excerpt(story.synopsis, 160);
  return {
    title: story.title,
    description,
    alternates: { canonical: `/story/${story.id}/${story.slug}` },
    // Unlisted stories open by link but must not be indexed; private/draft ones only render for their team.
    robots: isIndexable(story) ? undefined : { index: false, follow: false },
    openGraph: {
      type: "book",
      title: story.title,
      description,
      authors: [story.author.displayName],
      ...(coverUrl ? { images: [{ url: coverUrl }] } : {}),
    },
  };
}

/**
 * Public story page `/story/{id}/{slug}`. The id decides which story it is; a stale or wrong slug redirects to the
 * canonical URL (WBS Q2). A missing or hidden story is a real 404 so crawlers drop it.
 */
export default async function StoryPage({ params }: { params: Params }) {
  const { id, slug } = await params;
  const { queryClient, story } = await loadStory(id);

  if (story === null) notFound();
  if (story && story.slug !== slug) permanentRedirect(`/story/${story.id}/${story.slug}`);

  return (
    <div className="py-2 sm:py-6">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <StoryView storyId={id} />
      </HydrationBoundary>
    </div>
  );
}
