"use client";

import { Star } from "lucide-react";
import { formatCount } from "@storynest/utils";
import { StarRating } from "@storynest/ui/widgets/star-rating";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useStoryRating } from "../hooks/use-story-rating.ts";
import { canRate, formatAverage, ratingErrorMessage } from "../model/rating.ts";
import { storyText } from "../strings.ts";

const t = storyText.rating;

/**
 * The story's star rating on its page (Lucian 016): the average and how many readers rated, and for a signed-in reader
 * who has opened at least the required number of chapters, five stars to rate (again to change it, 0 or "Remove" to
 * take it back). A guest gets a sign-in link; a reader who has not read yet sees why the stars are off.
 */
export function StoryRatingPanel({ storyId, locale }: { storyId: string; locale: string }) {
  const { state, rate, signedIn } = useStoryRating(storyId);
  const navigation = useNavigation();
  const toast = useAppToast();
  const rating = state.data;
  const mine = rating?.mine ?? 0;
  const allowed = rating ? canRate(rating) : false;

  const choose = (stars: number) =>
    rate.mutate(stars === 0 ? null : stars, {
      onSuccess: () => toast.success(stars === 0 ? t.removed : t.saved),
      onError: (error) => toast.error(ratingErrorMessage(error)),
    });

  return (
    <section aria-labelledby="rating-title" className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rating-title" className="text-sm font-semibold">
          {t.title}
        </h2>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star aria-hidden className="size-4 fill-star text-star" />
          {rating && rating.average !== null && rating.count > 0
            ? t.summary(formatAverage(rating.average, locale), formatCount(rating.count, locale), rating.count)
            : t.none}
        </p>
      </div>
      {signedIn ? (
        <>
          <StarRating
            value={mine}
            onChange={choose}
            label={t.yours}
            words={t.words}
            valueText={(n) => (n === 0 ? t.words[0] : t.valueText(n, t.words[n] ?? ""))}
            disabled={!rating || !allowed || rate.isPending}
          />
          {rating && !allowed ? (
            <p className="text-xs text-muted-foreground">{t.needRead(rating.chaptersNeeded)}</p>
          ) : null}
        </>
      ) : (
        <AppLink
          href={`/login?next=${encodeURIComponent(navigation.pathname)}`}
          className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.guest}
        </AppLink>
      )}
    </section>
  );
}
