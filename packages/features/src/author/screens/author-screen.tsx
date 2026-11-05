"use client";

import { UserRound } from "lucide-react";
import { formatCount } from "@storynest/utils";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { ExpandableText } from "@storynest/ui/widgets/expandable-text";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { RollingNumber } from "@storynest/ui/widgets/rolling-number";
import { UserAvatar, firstLetter } from "../../_shared/avatar.tsx";
import { STORY_GRID, StoryListFrame, StoryTile, useLatestStories, useStoryView } from "../../discovery/index.ts";
import { ReportButton } from "../../moderation/index.ts";
import { ShareButton, shareText } from "../../share/index.ts";
import { FollowAuthorButton } from "../components/follow-author-button.tsx";
import { useAuthorProfile } from "../hooks/use-author.ts";
import { authorHref, type AuthorProfile } from "../model/author.ts";
import { authorText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = authorText;

/** An author's page: who they are, how many follow them, a follow button and their public stories. */
export function AuthorScreen({
  username,
  locale = currentLocale(),
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
  const storyView = useStoryView();

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <UserAvatar
          storageKey={profile.avatarStorageKey}
          fallback={firstLetter(profile.displayName)}
          className="size-16"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            @{profile.username} · {/* Rolls to the new count after a follow or unfollow (never on load). */}
            <RollingNumber value={profile.followers} format={(n) => t.followers(formatCount(n, locale))} live /> ·{" "}
            {t.stories(formatCount(profile.stories, locale))}
          </p>
          <div className="pt-1">
            {profile.bio.trim() === "" ? (
              <p className="max-w-prose text-sm text-foreground/90">{t.noBio}</p>
            ) : (
              <ExpandableText
                lines={4}
                moreLabel={t.readMore}
                lessLabel={t.readLess}
                className="max-w-prose text-sm whitespace-pre-line text-foreground/90"
              >
                {profile.bio}
              </ExpandableText>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <FollowAuthorButton profile={profile} />
          <ShareButton
            path={authorHref(profile.username)}
            name={profile.displayName}
            description={shareText.author.description}
          />
          <ReportButton kind="user" targetId={profile.userId} ownerId={profile.userId} />
        </div>
      </header>

      <section aria-label={t.storiesTitle} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{t.storiesTitle}</h2>
          {stories.length > 0 ? storyView.toggle : null}
        </div>
        {feed.isError && stories.length === 0 ? (
          <ErrorState
            title={t.error.title}
            description={t.error.description}
            retryLabel={t.error.retry}
            onRetry={() => void feed.refetch()}
          />
        ) : feed.isPending ? (
          <div className={STORY_GRID} aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <EmptyState icon={UserRound} title={t.emptyStories.title} description={t.emptyStories.description} />
        ) : (
          <StoryListFrame frameRef={storyView.containerRef}>
            <InfiniteList
              items={stories}
              getKey={(story) => story.id}
              listClassName={storyView.listClassName}
              renderItem={(story) => (
                <StoryTile story={story} locale={locale} coverUrlFor={coverUrlFor} variant={storyView.view} />
              )}
              hasMore={feed.hasNextPage}
              isLoadingMore={feed.isFetchingNextPage}
              onLoadMore={() => void feed.fetchNextPage()}
              loadMoreLabel={t.loadMore}
              loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
              endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{t.endOfList}</p>}
            />
          </StoryListFrame>
        )}
      </section>
    </article>
  );
}
