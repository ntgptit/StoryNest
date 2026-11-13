"use client";

import { ArrowLeft, FileQuestion } from "lucide-react";
import { useCallback, useRef, useState, type RefObject } from "react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { useAutoHideHeader } from "@storynest/ui/widgets/app-shell";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { BackToTopButton } from "@storynest/ui/widgets/back-to-top-button";
import { ReadingProgress, useScrollProgress } from "@storynest/ui/widgets/reading-progress";
import { ReadingTimeLeft } from "@storynest/ui/widgets/reading-time-left";
import { AdultGate } from "../../adult-content/index.ts";
import { AppLink, usePlatform } from "../../_shared/platform.tsx";
import { chapterHref, storyHref, useStory, useStoryChapters } from "../../story/index.ts";
import { shareUrl } from "../../share/index.ts";
import { ReportButton } from "../../moderation/index.ts";
import { CommentThread, commentText } from "../../comments/index.ts";
import { ReaderBlocks, type Landing } from "../components/reader-blocks.tsx";
import { VoteButton } from "../components/vote-button.tsx";
import { ChapterNav } from "../components/chapter-nav.tsx";
import { ReaderSettingsSheet } from "../components/reader-settings-sheet.tsx";
import { ReadingTracker } from "../components/reading-tracker.tsx";
import { TocSheet } from "../components/toc-sheet.tsx";
import { ReadAloudButton } from "../components/read-aloud-button.tsx";
import { StoryFinished } from "../components/story-finished.tsx";
import { chapterSections } from "../model/sections.ts";
import { SimilarStories } from "../../recommendations/index.ts";
import { useChapter } from "../hooks/use-chapter.ts";
import { blockAnchor, COMMENTS_ANCHOR, isStoryFinished } from "../model/chapter.ts";
import { timeLeft } from "../model/reading-time.ts";
import { useApplyReaderPreferences } from "../hooks/use-reader-preferences.ts";
import { useReaderPreferencesSync } from "../hooks/use-reader-preferences-sync.ts";
import { readerText } from "../strings.ts";

/**
 * Chapter reader: sticky toolbar (back to the story, table of contents, scroll progress), the chapter blocks in a
 * readable column (~66 characters), and previous/next navigation.
 *
 * While reading, the app header gets out of the way: it slides up on scroll-down and back on scroll-up. The toolbar
 * always stays visible, right below the header while it shows and at the top of the screen while it is tucked away.
 * The toolbar also shows the reading time left in the chapter text and, where the browser can speak, a read-aloud
 * button; far down the page a back-to-top button appears. Under the last chapter of a completed story the reader is
 * congratulated and offered similar stories.
 */
export function ReaderScreen({
  storyId,
  chapterSlug,
  imageUrlFor,
  coverUrlFor,
}: {
  storyId: string;
  chapterSlug: string;
  /** Resolves an image block's storage key to a public URL (the app knows the Supabase project URL). */
  imageUrlFor?: ((key: string) => string) | undefined;
  /** Resolves a cover storage key to a public URL (similar stories after the last chapter). */
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const chapter = useChapter(storyId, chapterSlug);
  const story = useStory(storyId);
  const chapters = useStoryChapters(storyId);
  useApplyReaderPreferences();
  useReaderPreferencesSync();
  useAutoHideHeader();
  const platform = usePlatform();
  const textEnd = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const land = useCallback(
    (blockId: string) => setLanding((previous) => ({ blockId, count: (previous?.count ?? 0) + 1 })),
    [],
  );

  // The story says whether this is adult content, and that must be known before a single block is shown.
  if (chapter.isPending || story.isPending) return <ReaderSkeleton />;
  if (chapter.isError || story.isError) {
    return (
      <ErrorState
        title={readerText.error.title}
        description={readerText.error.description}
        retryLabel={readerText.error.retry}
        onRetry={() => {
          void chapter.refetch();
          void story.refetch();
        }}
      />
    );
  }
  if (!chapter.data) {
    return (
      <EmptyState icon={FileQuestion} title={readerText.notFound.title} description={readerText.notFound.description} />
    );
  }

  const data = chapter.data;
  const storyData = story.data ?? null;
  const chapterItems = chapters.data ?? [];
  const finished = storyData !== null && isStoryFinished(storyData.status, chapterItems, data.slug);
  const quoteText = storyData
    ? (quote: string, blockId: string) =>
        readerText.quote.text(
          quote,
          readerText.quote.source(storyData.title, readerText.chapterLabel(data.number)),
          shareUrl(
            platform.shareOrigin ? platform.shareOrigin() : platform.appOrigin(),
            `${chapterHref(storyData, data)}#${blockAnchor(blockId)}`,
          ),
        )
    : undefined;

  return (
    <AdultGate isMature={storyData?.isMature ?? false}>
      <div className="flex flex-col">
        <ReadingTracker key={data.id} chapterId={data.id} blockIds={data.blocks.map((b) => b.id)} onRestored={land} />
        <div className="sticky top-below-header z-10 -mx-4 border-b transition-[top] duration-380 ease-soft motion-reduce:transition-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-2 px-4">
            {storyData ? (
              <AppLink
                href={storyHref(storyData)}
                className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{storyData.title}</span>
                <span className="sr-only">{readerText.backToStory}</span>
              </AppLink>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-1">
              <TimeLeft wordCount={data.wordCount} textEnd={textEnd} />
              <ReadAloudButton key={data.id} blocks={data.blocks} />
              <ReaderSettingsSheet />
              {storyData ? (
                <TocSheet
                  story={storyData}
                  chapters={chapterItems}
                  currentSlug={data.slug}
                  sections={chapterSections(data.blocks)}
                />
              ) : null}
            </div>
          </div>
          <ReadingProgress label={readerText.progress} />
        </div>

        <article className="reader-text mx-auto flex w-full max-w-[var(--reader-measure)] flex-col gap-6 py-8">
          <header className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{readerText.chapterLabel(data.number)}</p>
            <h1
              ref={title}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight text-balance outline-none sm:text-3xl"
            >
              {data.title}
            </h1>
          </header>

          {data.blocks.length === 0 ? (
            <p className="text-muted-foreground">{readerText.emptyChapter}</p>
          ) : (
            <div ref={textEnd}>
              <ReaderBlocks
                chapterId={data.id}
                blocks={data.blocks}
                imageUrlFor={imageUrlFor}
                landing={landing}
                onLand={land}
                quoteText={quoteText}
              />
            </div>
          )}

          <p className="pt-4 text-center text-sm text-muted-foreground" aria-hidden>
            — {readerText.endOfChapter} —
          </p>
          {finished && storyData ? (
            <StoryFinished key={data.id} storyId={storyData.id} title={storyData.title} />
          ) : null}
          <VoteButton chapterId={data.id} />
          <div className="flex justify-center">
            <ReportButton kind="chapter" targetId={data.id} ownerId={storyData?.ownerId ?? undefined} />
          </div>
          <section
            id={COMMENTS_ANCHOR}
            aria-label={commentText.title}
            className="flex scroll-mt-below-reader-bar flex-col gap-4 border-t pt-6"
          >
            <h2 className="text-lg font-semibold">{commentText.title}</h2>
            <CommentThread chapterId={data.id} />
          </section>
          {storyData ? <ChapterNav story={storyData} chapters={chapterItems} chapterSlug={data.slug} /> : null}
          {finished && storyData ? <SimilarStories storyId={storyData.id} coverUrlFor={coverUrlFor} /> : null}
        </article>
        <BackToTopButton label={readerText.backToTop} focusTargetRef={title} />
      </div>
    </AdultGate>
  );
}

/** "N min left" in the toolbar: the unread share of the chapter text (not of the comments below it) at reading speed. */
function TimeLeft({ wordCount, textEnd }: { wordCount: number; textEnd: RefObject<HTMLDivElement | null> }) {
  const ratio = useScrollProgress(textEnd);
  const left = timeLeft(wordCount, ratio);
  return (
    <ReadingTimeLeft
      ratio={ratio}
      done={left.done}
      label={left.done ? readerText.timeLeft.done : readerText.timeLeft.long(left.minutes)}
      shortLabel={left.done ? readerText.timeLeft.done : readerText.timeLeft.short(left.minutes)}
      className="mr-1"
    />
  );
}

function ReaderSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[66ch] flex-col gap-4 py-8" aria-busy>
      <Skeleton className="h-4 w-20" aria-hidden />
      <Skeleton className="h-9 w-3/4" aria-hidden />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-5 w-full" aria-hidden />
      ))}
    </div>
  );
}
