"use client";

import { ArrowLeft, FileQuestion, Monitor, Smartphone, Tablet } from "lucide-react";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { ResponsivePreview, type ResponsivePreset } from "@storynest/ui/widgets/responsive-preview";
import { AppLink } from "../../_shared/platform.tsx";
import { useChapterDraft } from "../../editor/index.ts";
import { ReaderSettingsSheet } from "../../reader/index.ts";
import { ChapterPreviewArticle } from "../../_shared/chapter-preview.tsx";
import { bodyToReaderBlocks } from "../model/history.ts";
import { historyText } from "../strings.ts";

const t = historyText;

/** Phone, tablet and "as wide as there is room" (Lucian 257 presets; a phone is the narrowest common one). */
export const PREVIEW_DEVICE_WIDTHS = { phone: 375, tablet: 768, desktop: null } as const;

function devicePresets(): ResponsivePreset[] {
  const d = t.preview.devices;
  return [
    { id: "phone", label: d.phone, width: PREVIEW_DEVICE_WIDTHS.phone, icon: Smartphone },
    { id: "tablet", label: d.tablet, width: PREVIEW_DEVICE_WIDTHS.tablet, icon: Tablet },
    { id: "desktop", label: d.desktop, width: PREVIEW_DEVICE_WIDTHS.desktop, icon: Monitor },
  ];
}

/**
 * The saved draft drawn with the reader's own components and the reader's display settings, so what the author sees is
 * what readers will see after publishing. Read-only; nothing is published or changed. The article sits in a frame the
 * author can switch to phone / tablet / desktop width or drag to any width, to check line length and pictures.
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
  const d = t.preview.devices;
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
      <ResponsivePreview
        className="mt-4"
        presets={devicePresets()}
        labels={{ presets: d.group, handle: d.handle, width: d.width }}
        defaultPreset="desktop"
      >
        <ChapterPreviewArticle
          title={draft.data.title}
          blocks={blocks}
          emptyText={t.preview.empty}
          imageUrlFor={imageUrlFor}
          contained
          className="px-4"
        />
      </ResponsivePreview>
    </div>
  );
}
