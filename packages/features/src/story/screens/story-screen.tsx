"use client";

import { BookOpen, FileQuestion, Heart, MessageCircle, Users } from "lucide-react";
import { Badge } from "@storynest/ui/components/badge";
import { buttonVariants } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { StatPill } from "@storynest/ui/widgets/stat-pill";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { cn } from "@storynest/ui/lib/utils";
import { formatCount } from "@storynest/utils";
import { AppLink } from "../../_shared/platform.tsx";
import { progressText, resolveContinueChapter, useStoryProgress } from "../../progress/index.ts";
import { AdultGate } from "../../adult-content/index.ts";
import { authorHref } from "../../author/index.ts";
import { SimilarStories } from "../../recommendations/index.ts";
import { ReportButton } from "../../moderation/index.ts";
import { discoveryText, homeHref, statusLabel } from "../../discovery/index.ts";
import { useStory, useStoryChapters } from "../hooks/use-story.ts";
import { StoryActions } from "../components/story-actions.tsx";
import { chapterHref } from "../model/story-detail.ts";
import { storyText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/** Story page: cover, facts, synopsis, tags and the list of published chapters with a "start reading" button. */
export function StoryScreen({
  storyId,
  locale = currentLocale(),
  coverUrlFor,
}: {
  storyId: string;
  locale?: string;
  /** Resolves a cover storage key to a public URL (the app knows the Supabase project URL). */
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const story = useStory(storyId);
  const chapters = useStoryChapters(storyId);
  const progress = useStoryProgress(storyId);

  if (story.isPending) return <StorySkeleton />;
  if (story.isError) {
    return (
      <ErrorState
        title={storyText.error.title}
        description={storyText.error.description}
        retryLabel={storyText.error.retry}
        onRetry={() => void story.refetch()}
      />
    );
  }
  if (!story.data) {
    return (
      <EmptyState icon={FileQuestion} title={storyText.notFound.title} description={storyText.notFound.description} />
    );
  }

  const data = story.data;
  const chapterItems = chapters.data ?? [];
  const firstChapter = chapterItems[0];
  const continueChapter = resolveContinueChapter(chapterItems, progress.data);
  const readFrom = continueChapter ?? firstChapter;
  const coverUrl = data.coverStorageKey && coverUrlFor ? coverUrlFor(data.coverStorageKey) : null;

  return (
    <AdultGate isMature={data.isMature}>
      <article className="flex flex-col gap-8">
        <header className="grid gap-6 sm:grid-cols-[12rem_1fr]">
          <StoryCover title={data.title} coverUrl={coverUrl} eager className="mx-auto w-40 sm:w-full" />

          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{data.title}</h1>
            <p className="text-sm text-muted-foreground">
              {storyText.byAuthor}{" "}
              {data.author.username ? (
                <AppLink
                  href={authorHref(data.author.username)}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {data.author.displayName}
                </AppLink>
              ) : (
                <span className="font-medium text-foreground">{data.author.displayName}</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {data.category ? <Badge variant="secondary">{data.category.name}</Badge> : null}
              <Badge variant="outline">{statusLabel(data.status)}</Badge>
              {data.isMature ? <Badge variant="destructive">{discoveryText.mature}</Badge> : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <StatPill icon={BookOpen} value={data.stats.reads} label={storyText.stats.reads} locale={locale} />
              <StatPill icon={Heart} value={data.stats.votes} label={storyText.stats.votes} locale={locale} />
              <StatPill
                icon={MessageCircle}
                value={data.stats.comments}
                label={storyText.stats.comments}
                locale={locale}
              />
              <StatPill icon={Users} value={data.stats.followers} label={storyText.stats.followers} locale={locale} />
            </div>

            {readFrom ? (
              <AppLink href={chapterHref(data, readFrom)} className={cn(buttonVariants({ size: "lg" }), "w-fit")}>
                {continueChapter ? progressText.continueReading(continueChapter.number) : storyText.startReading}
              </AppLink>
            ) : null}

            <StoryActions storyId={data.id} />
            <div>
              <ReportButton kind="story" targetId={data.id} />
            </div>
          </div>
        </header>

        <section aria-labelledby="synopsis-title" className="flex flex-col gap-2">
          <h2 id="synopsis-title" className="text-lg font-semibold">
            {storyText.synopsisTitle}
          </h2>
          <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {data.synopsis.trim() === "" ? storyText.noSynopsis : data.synopsis}
          </p>
          {data.tags.length > 0 ? (
            <ul aria-label={storyText.tagsLabel} className="flex flex-wrap gap-1.5 pt-1">
              {data.tags.map((tag) => (
                <li key={tag.slug}>
                  <AppLink href={homeHref({ tagSlug: tag.slug })} aria-label={storyText.tagLink(tag.name)}>
                    <Badge variant="outline">#{tag.name}</Badge>
                  </AppLink>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="chapters-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="chapters-title" className="text-lg font-semibold">
              {storyText.chaptersTitle}
            </h2>
            {chapters.data ? (
              <span className="text-sm text-muted-foreground">{storyText.chapterCount(chapterItems.length)}</span>
            ) : null}
          </div>

          {chapters.isPending ? (
            <div className="flex flex-col gap-2" aria-busy>
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" aria-hidden />
              ))}
            </div>
          ) : chapters.isError ? (
            <ErrorState
              title={storyText.chaptersError.title}
              retryLabel={storyText.chaptersError.retry}
              onRetry={() => void chapters.refetch()}
            />
          ) : chapterItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{storyText.noChaptersYet}</p>
          ) : (
            <ol className="divide-y rounded-xl border">
              {chapterItems.map((chapter) => (
                <li key={chapter.id}>
                  <AppLink
                    href={chapterHref(data, chapter)}
                    className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground">
                        {storyText.chapterLabel(chapter.number)}
                      </span>
                      <span className="block truncate text-sm font-medium">{chapter.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {storyText.words(formatCount(chapter.wordCount, locale))}
                    </span>
                  </AppLink>
                </li>
              ))}
            </ol>
          )}
        </section>

        <SimilarStories storyId={storyId} locale={locale} coverUrlFor={coverUrlFor} />
      </article>
    </AdultGate>
  );
}

function StorySkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-[12rem_1fr]" aria-busy>
      <Skeleton className="mx-auto aspect-[2/3] w-40 rounded-lg sm:w-full" aria-hidden />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" aria-hidden />
        <Skeleton className="h-4 w-1/3" aria-hidden />
        <Skeleton className="h-4 w-1/2" aria-hidden />
      </div>
    </div>
  );
}
