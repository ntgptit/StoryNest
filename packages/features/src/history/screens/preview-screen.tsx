"use client";

import { ArrowLeft, FileQuestion } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { AppLink } from "../../_shared/platform.tsx";
import { useChapterDraft } from "../../editor/index.ts";
import { BlockView, ReaderSettingsSheet } from "../../reader/index.ts";
import { bodyToReaderBlocks } from "../model/history.ts";
import { historyText } from "../strings.ts";

const t = historyText;

/**
 * The saved draft drawn with the reader's own components and the reader's display settings, so what the author sees is
 * what readers will see after publishing. Read-only; nothing is published or changed.
 */
export function PreviewScreen({
  storyId,
  chapterId,
  imageUrlFor,
}: {
  storyId: string;
  chapterId: string;
  imageUrlFor?: ((key: string) => string) | undefined;
}) {
  const draft = useChapterDraft(chapterId);

  if (draft.isPending) return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" aria-busy />;
  if (draft.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => void draft.refetch()}
      />
    );
  }
  if (!draft.data || draft.data.storyId !== storyId) {
    return <EmptyState icon={FileQuestion} title={t.notFound.title} description={t.notFound.description} />;
  }

  const blocks = bodyToReaderBlocks(draft.data.body);
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-2 px-4">
          <AppLink
            href={`/studio/story/${storyId}/chapter/${chapterId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t.preview.backToEditor}
          </AppLink>
          <ReaderSettingsSheet />
        </div>
      </div>
      <p
        role="note"
        className="mx-auto mt-4 w-full max-w-[var(--reader-measure)] rounded-md border bg-card p-3 text-sm text-muted-foreground"
      >
        {t.preview.banner}
      </p>
      <article className="reader-text mx-auto flex w-full max-w-[var(--reader-measure)] flex-col gap-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{draft.data.title}</h1>
        {blocks.length === 0 ? (
          <p className="text-muted-foreground">{t.preview.empty}</p>
        ) : (
          <div className="flex flex-col gap-[1em]">
            {blocks.map((block) => (
              <BlockView key={block.id} block={block} imageUrlFor={imageUrlFor} />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
