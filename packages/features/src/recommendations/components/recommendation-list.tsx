"use client";

import { CardCarousel } from "@storynest/ui/widgets/card-carousel";
import { StoryTile } from "../../discovery/index.ts";
import { reasonText, type Recommendation } from "../model/recommendation.ts";
import { useRecommendedForMe, useSimilarStories } from "../hooks/use-recommendations.ts";
import { recommendationText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * A titled row of suggested stories (swipe, drag or arrows; see CardCarousel), each with the sentence that says why.
 * Renders nothing for an empty list.
 */
function RecommendationList({
  title,
  items,
  locale,
  coverUrlFor,
}: {
  title: string;
  items: readonly Recommendation[];
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  if (items.length === 0) return null;
  return (
    <CardCarousel title={title} previousLabel={recommendationText.previous} nextLabel={recommendationText.next}>
      {items.map((item) => {
        const why = reasonText(item);
        return (
          <div key={item.story.id} className="flex flex-col gap-1">
            <StoryTile story={item.story} locale={locale} coverUrlFor={coverUrlFor} />
            {why ? <p className="px-1 text-xs text-muted-foreground">{why}</p> : null}
          </div>
        );
      })}
    </CardCarousel>
  );
}

/** "You may also like" on a story page. Nothing is shown while loading, when it fails or when there is nothing to suggest. */
export function SimilarStories({
  storyId,
  locale = currentLocale(),
  coverUrlFor,
}: {
  storyId: string;
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const similar = useSimilarStories(storyId);
  return (
    <RecommendationList
      title={recommendationText.similarTitle}
      items={similar.data ?? []}
      locale={locale}
      coverUrlFor={coverUrlFor}
    />
  );
}

/** "Suggested for you" on the home page, for a signed-in reader. Nothing for a guest or when there is nothing to suggest. */
export function ForYouStories({
  locale = currentLocale(),
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const forMe = useRecommendedForMe();
  return (
    <RecommendationList
      title={recommendationText.forMeTitle}
      items={forMe.data ?? []}
      locale={locale}
      coverUrlFor={coverUrlFor}
    />
  );
}
