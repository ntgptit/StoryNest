import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { authorHref, isIndexable, storyMetaDescription } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";
import { bookJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/site";
import { appText } from "@/lib/strings";
import { loadStory } from "@/lib/story/load-story";

import { JsonLd } from "../../../../_components/json-ld";
import { StoryView } from "./story-view";

type Params = Promise<{ id: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { story } = await loadStory(id);
  if (!story) return { title: appText.pageTitle.storyFallback, robots: { index: false } };

  const coverUrl = story.coverStorageKey ? getCoverUrlResolver()?.(story.coverStorageKey) : undefined;
  const description = storyMetaDescription(story.synopsis);
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

  const coverUrl = story?.coverStorageKey ? getCoverUrlResolver()?.(story.coverStorageKey) : undefined;
  return (
    <div className="py-2 sm:py-6">
      {story && isIndexable(story) ? (
        <JsonLd
          data={bookJsonLd(story, {
            storyUrl: absoluteUrl(`/story/${story.id}/${story.slug}`),
            authorUrl: absoluteUrl(authorHref(story.author.username)),
            coverUrl,
          })}
        />
      ) : null}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <StoryView storyId={id} />
      </HydrationBoundary>
    </div>
  );
}
