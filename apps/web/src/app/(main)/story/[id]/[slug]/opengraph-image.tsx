import { ImageResponse } from "next/og";

import { getCoverUrlResolver } from "@/lib/covers";
import { OG_SIZE, OgCard } from "@/lib/seo/og-card";
import { loadStory } from "@/lib/story/load-story";
import { appText } from "@/lib/strings";

export const alt = appText.siteName;
export const size = OG_SIZE;
export const contentType = "image/png";

/** The picture shown when a story link is shared: the cover (when there is one), the title and the author. */
export default async function StoryOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { story } = await loadStory(id);
  const coverUrl = story?.coverStorageKey ? getCoverUrlResolver()?.(story.coverStorageKey) : undefined;
  return new ImageResponse(
    <OgCard heading={story?.title ?? appText.siteName} line={story?.author.displayName} coverUrl={coverUrl} />,
    size,
  );
}
