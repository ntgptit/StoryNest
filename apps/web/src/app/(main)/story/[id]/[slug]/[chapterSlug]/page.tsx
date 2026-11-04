import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { authorHref, isIndexable } from "@storynest/features";
import { excerpt } from "@storynest/utils";

import { getCoverUrlResolver } from "@/lib/covers";
import { chapterJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/site";
import { appText } from "@/lib/strings";
import { loadChapter } from "@/lib/story/load-chapter";

import { JsonLd } from "../../../../../_components/json-ld";
import { ReaderView } from "./reader-view";

type Params = Promise<{ id: string; slug: string; chapterSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, chapterSlug } = await params;
  const { story, chapter } = await loadChapter(id, chapterSlug);
  if (!story || !chapter) return { title: appText.pageTitle.chapterFallback, robots: { index: false } };

  const firstText = chapter.blocks.find((b) => b.type === "paragraph");
  const description = firstText && firstText.type === "paragraph" ? excerpt(firstText.text, 160) : undefined;
  return {
    title: appText.chapterTitle(chapter.title, story.title),
    ...(description ? { description } : {}),
    alternates: { canonical: `/story/${story.id}/${story.slug}/${chapter.slug}` },
    robots: isIndexable(story) ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: appText.chapterTitle(chapter.title, story.title),
      authors: [story.author.displayName],
    },
  };
}

/**
 * Chapter reader `/story/{id}/{slug}/{chapterSlug}`. A missing, unpublished or removed chapter (or a hidden story)
 * is a real 404; a stale story slug redirects to the canonical URL like the story page does.
 */
export default async function ChapterPage({ params }: { params: Params }) {
  const { id, slug, chapterSlug } = await params;
  const { queryClient, story, chapter } = await loadChapter(id, chapterSlug);

  if (story === null || chapter === null) notFound();
  if (story && story.slug !== slug) permanentRedirect(`/story/${story.id}/${story.slug}/${chapterSlug}`);

  const coverUrl = story?.coverStorageKey ? getCoverUrlResolver()?.(story.coverStorageKey) : undefined;
  return (
    <div className="py-0">
      {story && chapter && isIndexable(story) ? (
        <JsonLd
          data={chapterJsonLd(story, chapter, {
            storyUrl: absoluteUrl(`/story/${story.id}/${story.slug}`),
            chapterUrl: absoluteUrl(`/story/${story.id}/${story.slug}/${chapter.slug}`),
            authorUrl: absoluteUrl(authorHref(story.author.username)),
            coverUrl,
          })}
        />
      ) : null}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ReaderView storyId={id} chapterSlug={chapterSlug} />
      </HydrationBoundary>
    </div>
  );
}
