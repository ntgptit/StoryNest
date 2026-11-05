"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, FileQuestion, ListOrdered } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { newId } from "@storynest/utils";
import { CHAPTER_STATUS, chapterFormSchema, type ChapterForm } from "@storynest/validation";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { Input } from "@storynest/ui/components/input";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { currentLocale } from "../../_shared/i18n.ts";
import { RenameSlugDialog } from "../components/rename-slug-dialog.tsx";
import { ScheduledChapters } from "../components/scheduled-chapters.tsx";
import {
  useArchiveChapter,
  useCreateChapter,
  useReorderChapters,
  useSetChapterDeleted,
  useStudioChapters,
} from "../hooks/use-chapter-management.ts";
import { useStoryForEdit } from "../hooks/use-story-editing.ts";
import { slugFromTitle } from "../model/story-form.ts";
import type { StudioRole } from "../model/studio-story.ts";
import {
  chapterErrorMessage,
  chapterValidationMessage,
  isChapterSlugTaken,
  liveChapterIds,
  moveChapter,
  type StudioChapter,
} from "../model/studio-chapter.ts";
import { studioText } from "../strings.ts";

const t = studioText.chapters;

type Pending = { kind: "archive" | "delete"; chapter: StudioChapter };

/** Chapter list of one story: add, reorder, rename the slug, archive and delete/restore, and the scheduled ones. */
export function ChapterManagerScreen({ storyId, locale = currentLocale() }: { storyId: string; locale?: string }) {
  const story = useStoryForEdit(storyId);
  const chapters = useStudioChapters(storyId);

  if (story.isPending || chapters.isPending) return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" aria-busy />;
  if (story.isError || chapters.isError) {
    return (
      <ErrorState
        title={studioText.error.title}
        description={studioText.error.description}
        retryLabel={studioText.error.retry}
        onRetry={() => {
          void story.refetch();
          void chapters.refetch();
        }}
      />
    );
  }
  if (!story.data) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={studioText.form.notFound.title}
        description={studioText.form.notFound.description}
      />
    );
  }

  return (
    <ChapterManager
      storyId={storyId}
      storyTitle={story.data.form.title}
      canManage={story.data.role !== "editor"}
      role={story.data.role}
      locale={locale}
      chapters={chapters.data}
    />
  );
}

function ChapterManager({
  storyId,
  storyTitle,
  canManage,
  role,
  locale,
  chapters,
}: {
  storyId: string;
  storyTitle: string;
  /** Owners and co-authors may archive and delete; editors only add, reorder and rename. */
  canManage: boolean;
  /** For the scheduled list, which follows the publish panel's rules. */
  role: StudioRole;
  locale: string;
  chapters: StudioChapter[];
}) {
  const toast = useAppToast();
  const reorder = useReorderChapters(storyId);
  const archive = useArchiveChapter(storyId);
  const setDeleted = useSetChapterDeleted(storyId);
  const [pending, setPending] = useState<Pending | null>(null);
  const [renaming, setRenaming] = useState<StudioChapter | null>(null);

  const live = liveChapterIds(chapters);

  const move = (chapterId: string, direction: 1 | -1) => {
    const next = moveChapter(live, chapterId, direction);
    if (next === null) return;
    reorder.mutate(next, { onError: (error) => toast.error(chapterErrorMessage(error)) });
  };

  const run = (action: Promise<unknown>, message: string) =>
    action.then(
      () => toast.success(message),
      (error: unknown) => {
        toast.error(chapterErrorMessage(error as Parameters<typeof chapterErrorMessage>[0]));
        throw error;
      },
    );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description(storyTitle)} />
      <AppLink
        href={`/studio/story/${storyId}`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t.backToStory}
      </AppLink>

      <ScheduledChapters chapters={chapters} role={role} locale={locale} />

      {chapters.length === 0 ? (
        <EmptyState icon={ListOrdered} title={t.empty.title} description={t.empty.description} />
      ) : (
        <>
          <ol aria-label={t.listLabel} className="flex flex-col gap-2">
            {chapters.map((chapter) => {
              const index = live.indexOf(chapter.id);
              return (
                <li
                  key={chapter.id}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t.position(chapter.position)}</p>
                    <p
                      className={
                        chapter.deleted ? "truncate text-sm font-medium line-through" : "truncate text-sm font-medium"
                      }
                    >
                      {chapter.title || t.untitled}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Badge variant="outline">{t.status[chapter.status]}</Badge>
                      {chapter.deleted ? <Badge variant="destructive">{t.deletedBadge}</Badge> : null}
                      <span className="truncate text-xs text-muted-foreground">/{chapter.slug}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {chapter.deleted ? (
                      canManage ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={setDeleted.isPending}
                          onClick={() =>
                            void run(
                              setDeleted.mutateAsync({ chapterId: chapter.id, deleted: false }),
                              t.restored,
                            ).catch(() => undefined)
                          }
                        >
                          {t.restore}
                        </Button>
                      ) : null
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`${t.moveUp}: ${chapter.title || chapter.slug}`}
                          disabled={reorder.isPending || index <= 0}
                          onClick={() => move(chapter.id, -1)}
                        >
                          <ArrowUp aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`${t.moveDown}: ${chapter.title || chapter.slug}`}
                          disabled={reorder.isPending || index === live.length - 1}
                          onClick={() => move(chapter.id, 1)}
                        >
                          <ArrowDown aria-hidden className="size-4" />
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <AppLink href={`/studio/story/${storyId}/chapter/${chapter.id}`}>{t.write}</AppLink>
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(chapter)}>
                          {t.rename}
                        </Button>
                        {canManage ? (
                          <>
                            {chapter.status === CHAPTER_STATUS.ARCHIVED ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={archive.isPending}
                                onClick={() =>
                                  void run(
                                    archive.mutateAsync({ chapterId: chapter.id, archived: false }),
                                    t.unarchived,
                                  ).catch(() => undefined)
                                }
                              >
                                {t.unarchive}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setPending({ kind: "archive", chapter })}
                              >
                                {t.archive}
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setPending({ kind: "delete", chapter })}
                            >
                              {t.delete}
                            </Button>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-muted-foreground">{t.numbering}</p>
        </>
      )}

      <AddChapterForm storyId={storyId} />

      {renaming ? (
        <RenameSlugDialog
          key={renaming.id}
          storyId={storyId}
          chapterId={renaming.id}
          currentSlug={renaming.slug}
          open
          onOpenChange={(open) => {
            if (!open) setRenaming(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending?.kind === "delete" ? t.deleteTitle : t.archiveTitle}
        description={pending?.kind === "delete" ? t.deleteDescription : t.archiveDescription}
        confirmLabel={pending?.kind === "delete" ? t.delete : t.archive}
        cancelLabel={t.cancel}
        destructive={pending?.kind === "delete"}
        onConfirm={async () => {
          if (!pending) return;
          const { kind, chapter } = pending;
          if (kind === "delete") await run(setDeleted.mutateAsync({ chapterId: chapter.id, deleted: true }), t.deleted);
          else await run(archive.mutateAsync({ chapterId: chapter.id, archived: true }), t.archived);
        }}
      />
    </div>
  );
}

function AddChapterForm({ storyId }: { storyId: string }) {
  const toast = useAppToast();
  // One id per form fill: a retry after a lost response reuses it (cannot add the chapter twice). A new one after success.
  const chapterId = useRef(newId());
  const create = useCreateChapter(storyId, () => chapterId.current);
  const slugTouched = useRef(false);
  const form = useForm<ChapterForm>({
    resolver: translateErrors(zodResolver(chapterFormSchema), chapterValidationMessage),
    defaultValues: { title: "", slug: "" },
  });

  const submit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: () => {
        toast.success(t.add.added);
        form.reset({ title: "", slug: "" });
        slugTouched.current = false;
        chapterId.current = newId();
      },
      onError: (error) => {
        if (isChapterSlugTaken(error)) form.setError("slug", { type: "server", message: t.errors.slugTaken });
        else toast.error(chapterErrorMessage(error));
      },
    }),
  );

  return (
    <Form {...form}>
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-3 rounded-xl border p-4"
        aria-busy={create.isPending}
      >
        <h2 className="text-base font-semibold">{t.add.title}</h2>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.add.chapterTitle}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    if (!slugTouched.current)
                      form.setValue("slug", slugFromTitle(event.target.value), {
                        shouldValidate: form.formState.isSubmitted,
                      });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.add.slug}</FormLabel>
              <FormControl>
                <Input
                  autoCapitalize="none"
                  spellCheck={false}
                  {...field}
                  onChange={(event) => {
                    slugTouched.current = true;
                    field.onChange(event);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-fit" disabled={create.isPending}>
          {create.isPending ? t.add.submitting : t.add.submit}
        </Button>
      </form>
    </Form>
  );
}
