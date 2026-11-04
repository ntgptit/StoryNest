"use client";

import { ArrowLeft, FileQuestion } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { ReadingProgress } from "@storynest/ui/widgets/reading-progress";
import { AppLink } from "../../_shared/platform.tsx";
import { storyHref, useStory, useStoryChapters } from "../../story/index.ts";
import { BlockView } from "../components/block-view.tsx";
import { VoteButton } from "../components/vote-button.tsx";
import { ChapterNav } from "../components/chapter-nav.tsx";
import { ReaderSettingsSheet } from "../components/reader-settings-sheet.tsx";
import { ReadingTracker } from "../components/reading-tracker.tsx";
import { TocSheet } from "../components/toc-sheet.tsx";
import { useChapter } from "../hooks/use-chapter.ts";
import { useApplyReaderPreferences } from "../hooks/use-reader-preferences.ts";
import { useReaderPreferencesSync } from "../hooks/use-reader-preferences-sync.ts";
import { readerText } from "../strings.ts";

/**
 * Chapter reader: sticky toolbar (back to the story, table of contents, scroll progress), the chapter blocks in a
 * readable column (~66 characters), and previous/next navigation.
 */
export function ReaderScreen({
  storyId,
  chapterSlug,
  imageUrlFor,
}: {
  storyId: string;
  chapterSlug: string;
  /** Resolves an image block's storage key to a public URL (the app knows the Supabase project URL). */
  imageUrlFor?: ((key: string) => string) | undefined;
}) {
  const chapter = useChapter(storyId, chapterSlug);
  const story = useStory(storyId);
  const chapters = useStoryChapters(storyId);
  useApplyReaderPreferences();
  useReaderPreferencesSync();

  if (chapter.isPending) return <ReaderSkeleton />;
  if (chapter.isError) {
    return (
      <ErrorState
        title={readerText.error.title}
        description={readerText.error.description}
        retryLabel={readerText.error.retry}
        onRetry={() => void chapter.refetch()}
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

  return (
    <div className="flex flex-col">
      <ReadingTracker key={data.id} chapterId={data.id} blockIds={data.blocks.map((b) => b.id)} />
      <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
          <div className="flex items-center gap-1">
            <ReaderSettingsSheet />
            {storyData ? <TocSheet story={storyData} chapters={chapterItems} currentSlug={data.slug} /> : null}
          </div>
        </div>
        <ReadingProgress label={readerText.progress} />
      </div>

      <article className="reader-text mx-auto flex w-full max-w-[var(--reader-measure)] flex-col gap-6 py-8">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{readerText.chapterLabel(data.number)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{data.title}</h1>
        </header>

        {data.blocks.length === 0 ? (
          <p className="text-muted-foreground">{readerText.emptyChapter}</p>
        ) : (
          <div className="flex flex-col gap-[1em]">
            {data.blocks.map((block) => (
              <BlockView key={block.id} block={block} imageUrlFor={imageUrlFor} />
            ))}
          </div>
        )}

        <p className="pt-4 text-center text-sm text-muted-foreground" aria-hidden>
          — {readerText.endOfChapter} —
        </p>
        <VoteButton chapterId={data.id} />
        {storyData ? <ChapterNav story={storyData} chapters={chapterItems} chapterSlug={data.slug} /> : null}
      </article>
    </div>
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
