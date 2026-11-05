"use client";

import { BookOpen, FileQuestion, Heart, List, MessageCircle, Users } from "lucide-react";
import { useRef, useState } from "react";
import { VISIBILITY } from "@storynest/validation";
import { Badge } from "@storynest/ui/components/badge";
import { Button, buttonVariants } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { ExpandableText } from "@storynest/ui/widgets/expandable-text";
import { StickyActionBar } from "@storynest/ui/widgets/sticky-action-bar";
import { StatPill } from "@storynest/ui/widgets/stat-pill";
import { AccordionList } from "@storynest/ui/widgets/accordion-list";
import { cn } from "@storynest/ui/lib/utils";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { formatCount } from "@storynest/utils";
import { AppLink } from "../../_shared/platform.tsx";
import { progressText, resolveContinueChapter, useStoryProgress } from "../../progress/index.ts";
import { AdultGate } from "../../adult-content/index.ts";
import { authorHref } from "../../author/index.ts";
import { SimilarStories } from "../../recommendations/index.ts";
import { ReportButton } from "../../moderation/index.ts";
import { discoveryText, homeHref, statusLabel, storyHref } from "../../discovery/index.ts";
import { TocSheet } from "../../reader/index.ts";
import { ShareButton, shareText } from "../../share/index.ts";
import { useStory, useStoryChapters } from "../hooks/use-story.ts";
import { StoryActions } from "../components/story-actions.tsx";
import { chapterHref, type ChapterListItem, type StoryDetail } from "../model/story-detail.ts";
import { chapterRanges, isLongStory, rangeIndexOf } from "../model/chapter-ranges.ts";
import { storyText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

/**
 * Story page: cover, facts, synopsis (clamped, with read more), tags and the list of published chapters with a
 * "start reading" button. Once that button scrolls away a sticky bar repeats it, with a chapter picker beside it.
 */
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
  const readRef = useRef<HTMLDivElement>(null);

  if (story.isPending) return <StorySkeleton />;
  if (story.isError) {
    return (
      <ErrorState
        title={storyText.error.title}
        description={storyText.error.description}
        retryLabel={storyText.error.retry}
        onRetry={() => story.refetch()}
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
  const readLabel = continueChapter ? progressText.continueReading(continueChapter.number) : storyText.startReading;

  return (
    <AdultGate isMature={data.isMature}>
      <article className="flex flex-col gap-8">
        <header className="grid gap-6 sm:grid-cols-[12rem_1fr]">
          <StoryCover title={data.title} coverUrl={coverUrl} eager morphTarget className="mx-auto w-40 sm:w-full" />

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
              <div ref={readRef} className="w-fit">
                <AppLink href={chapterHref(data, readFrom)} className={buttonVariants({ size: "lg" })}>
                  {readLabel}
                </AppLink>
              </div>
            ) : null}

            <StoryActions storyId={data.id} />
            <div className="flex flex-wrap items-center gap-2">
              {/* A private story only opens for its owner and co-authors: a link to it is no use to anyone else. */}
              {data.visibility === VISIBILITY.PRIVATE ? null : (
                <ShareButton path={storyHref(data)} name={data.title} description={shareText.story.description} />
              )}
              <ReportButton kind="story" targetId={data.id} />
            </div>
          </div>
        </header>

        <section aria-labelledby="synopsis-title" className="flex flex-col gap-2">
          <h2 id="synopsis-title" className="text-lg font-semibold">
            {storyText.synopsisTitle}
          </h2>
          {data.synopsis.trim() === "" ? (
            <p className="max-w-prose text-sm leading-relaxed text-foreground/90">{storyText.noSynopsis}</p>
          ) : (
            <ExpandableText
              moreLabel={storyText.readMore}
              lessLabel={storyText.readLess}
              className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-foreground/90"
            >
              {data.synopsis}
            </ExpandableText>
          )}
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
              onRetry={() => chapters.refetch()}
            />
          ) : chapterItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{storyText.noChaptersYet}</p>
          ) : isLongStory(chapterItems.length) ? (
            <ChapterRangeList
              story={data}
              chapters={chapterItems}
              continueSlug={continueChapter?.slug}
              locale={locale}
            />
          ) : (
            <ChapterList story={data} chapters={chapterItems} locale={locale} className="rounded-xl border" />
          )}
        </section>

        <SimilarStories storyId={storyId} locale={locale} coverUrlFor={coverUrlFor} />

        {readFrom ? (
          <StickyActionBar anchorRef={readRef} label={storyText.readingBar.label}>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{data.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {storyText.chapterLabel(readFrom.number)}
                {readFrom.title ? ` · ${readFrom.title}` : ""}
              </span>
            </div>
            <TocSheet
              story={data}
              chapters={chapterItems}
              currentSlug={continueChapter?.slug}
              currentKind="step"
              side="bottom"
              trigger={
                <Button type="button" variant="outline" className="px-3">
                  <List aria-hidden />
                  <span className="sr-only sm:not-sr-only">{storyText.readingBar.chapters}</span>
                </Button>
              }
            />
            <AppLink href={chapterHref(data, readFrom)} className={buttonVariants()}>
              {readLabel}
            </AppLink>
          </StickyActionBar>
        ) : null}
      </article>
    </AdultGate>
  );
}

function ChapterList({
  story,
  chapters,
  locale,
  className,
}: {
  story: Pick<StoryDetail, "id" | "slug">;
  chapters: readonly ChapterListItem[];
  locale: string;
  className?: string;
}) {
  return (
    <ol className={cn("divide-y", className)}>
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <AppLink
            href={chapterHref(story, chapter)}
            className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{storyText.chapterLabel(chapter.number)}</span>
              <span className="block truncate text-sm font-medium">{chapter.title}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {storyText.words(formatCount(chapter.wordCount, locale))}
            </span>
          </AppLink>
        </li>
      ))}
    </ol>
  );
}

/**
 * A long story's chapters in ranges (1–50, 51–100...), one range open at a time. Until the reader picks one, the
 * range of the chapter they would continue in is open (the first range for a new reader).
 */
function ChapterRangeList({
  story,
  chapters,
  continueSlug,
  locale,
}: {
  story: Pick<StoryDetail, "id" | "slug">;
  chapters: readonly ChapterListItem[];
  continueSlug: string | undefined;
  locale: string;
}) {
  const ranges = chapterRanges(chapters);
  // undefined = the reader has not chosen yet (follow the continue chapter); null = they closed every range.
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const auto = ranges[Math.max(0, rangeIndexOf(ranges, continueSlug))];
  const openId = chosen === undefined ? (auto ? String(auto.start) : null) : chosen;
  return (
    <AccordionList
      openId={openId}
      onOpenChange={setChosen}
      items={ranges.map((range) => ({
        id: String(range.start),
        title: storyText.chapterRange(range.firstNumber, range.lastNumber),
        meta: storyText.chapterCount(range.chapters.length),
        content: <ChapterList story={story} chapters={range.chapters} locale={locale} className="border-t" />,
      }))}
    />
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
