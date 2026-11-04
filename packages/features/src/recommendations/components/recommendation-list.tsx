"use client";

import { StoryCard } from "@storynest/ui/widgets/story-card";
import { AppLink } from "../../_shared/platform.tsx";
import { discoveryText, toStoryCardData } from "../../discovery/index.ts";
import { reasonText, type Recommendation } from "../model/recommendation.ts";
import { useRecommendedForMe, useSimilarStories } from "../hooks/use-recommendations.ts";
import { recommendationText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

/** A titled grid of suggested stories, each with the sentence that says why. Renders nothing for an empty list. */
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
  const labels = {
    reads: discoveryText.card.reads,
    votes: discoveryText.card.votes,
    updated: discoveryText.card.updated,
  };
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <ul className={GRID}>
        {items.map((item) => {
          const why = reasonText(item);
          return (
            <li key={item.story.id} className="flex flex-col gap-1">
              <StoryCard
                story={toStoryCardData(item.story, coverUrlFor)}
                labels={labels}
                LinkComponent={AppLink}
                locale={locale}
              />
              {why ? <p className="px-1 text-xs text-muted-foreground">{why}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
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
