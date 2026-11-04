import { ImageResponse } from "next/og";

import { getCoverUrlResolver } from "@/lib/covers";
import { OG_SIZE, OgCard } from "@/lib/seo/og-card";
import { loadChapter } from "@/lib/story/load-chapter";
import { appText } from "@/lib/strings";

export const alt = appText.siteName;
export const size = OG_SIZE;
export const contentType = "image/png";

/** The picture shown when a chapter link is shared: the chapter's title, then the story and its author. */
export default async function ChapterOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string; chapterSlug: string }>;
}) {
  const { id, chapterSlug } = await params;
  const { story, chapter } = await loadChapter(id, chapterSlug);
  const coverUrl = story?.coverStorageKey ? getCoverUrlResolver()?.(story.coverStorageKey) : undefined;
  const line = story ? `${story.title} · ${story.author.displayName}` : undefined;
  return new ImageResponse(
    <OgCard heading={chapter?.title ?? story?.title ?? appText.siteName} line={line} coverUrl={coverUrl} />,
    size,
  );
}
