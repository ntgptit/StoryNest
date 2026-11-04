"use client";

import { UserRound } from "lucide-react";
import { formatCount } from "@storynest/utils";
import { Avatar, AvatarFallback } from "@storynest/ui/components/avatar";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { StoryCard } from "@storynest/ui/widgets/story-card";
import { AppLink } from "../../_shared/platform.tsx";
import { discoveryText, toStoryCardData, useLatestStories } from "../../discovery/index.ts";
import { ReportButton } from "../../moderation/index.ts";
import { FollowAuthorButton } from "../components/follow-author-button.tsx";
import { useAuthorProfile } from "../hooks/use-author.ts";
import type { AuthorProfile } from "../model/author.ts";
import { authorText } from "../strings.ts";

const t = authorText;
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

/** An author's page: who they are, how many follow them, a follow button and their public stories. */
export function AuthorScreen({
  username,
  locale = "vi",
  coverUrlFor,
}: {
  username: string;
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const profile = useAuthorProfile(username);

  if (profile.isPending) return <Skeleton className="h-40 w-full rounded-xl" aria-busy />;
  if (profile.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => void profile.refetch()}
      />
    );
  }
  if (!profile.data) {
    return <EmptyState icon={UserRound} title={t.notFound.title} description={t.notFound.description} />;
  }
  return <AuthorPage profile={profile.data} locale={locale} coverUrlFor={coverUrlFor} />;
}

function AuthorPage({
  profile,
  locale,
  coverUrlFor,
}: {
  profile: AuthorProfile;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const feed = useLatestStories({ authorId: profile.userId }, undefined);
  const stories = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const labels = {
    reads: discoveryText.card.reads,
    votes: discoveryText.card.votes,
    updated: discoveryText.card.updated,
  };

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="text-xl">
            {Array.from(profile.displayName)[0]?.toLocaleUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            @{profile.username} · {t.followers(formatCount(profile.followers, locale))} ·{" "}
            {t.stories(formatCount(profile.stories, locale))}
          </p>
          <p className="max-w-prose pt-1 text-sm whitespace-pre-line text-foreground/90">
            {profile.bio.trim() === "" ? t.noBio : profile.bio}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <FollowAuthorButton profile={profile} />
          <ReportButton kind="user" targetId={profile.userId} ownerId={profile.userId} />
        </div>
      </header>

      <section aria-label={t.storiesTitle} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t.storiesTitle}</h2>
        {feed.isError && stories.length === 0 ? (
          <ErrorState
            title={t.error.title}
            description={t.error.description}
            retryLabel={t.error.retry}
            onRetry={() => void feed.refetch()}
          />
        ) : feed.isPending ? (
          <div className={GRID} aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <EmptyState icon={UserRound} title={t.emptyStories.title} description={t.emptyStories.description} />
        ) : (
          <InfiniteList
            items={stories}
            getKey={(story) => story.id}
            listClassName={GRID}
            renderItem={(story) => (
              <StoryCard
                story={toStoryCardData(story, coverUrlFor)}
                labels={labels}
                LinkComponent={AppLink}
                locale={locale}
              />
            )}
            hasMore={feed.hasNextPage}
            isLoadingMore={feed.isFetchingNextPage}
            onLoadMore={() => void feed.fetchNextPage()}
            loadMoreLabel={t.loadMore}
            loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
            endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{t.endOfList}</p>}
          />
        )}
      </section>
    </article>
  );
}
