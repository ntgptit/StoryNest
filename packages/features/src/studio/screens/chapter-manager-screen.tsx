"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileQuestion, ListOrdered } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { newId } from "@storynest/utils";
import { chapterFormSchema, type ChapterForm } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { Input } from "@storynest/ui/components/input";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { BulkActionDock } from "@storynest/ui/widgets/bulk-action-dock";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useSortableList } from "@storynest/ui/widgets/sortable-list";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { currentLocale } from "../../_shared/i18n.ts";
import { ChapterRow } from "../components/chapter-row.tsx";
import { StudioCrumbs } from "../components/studio-crumbs.tsx";
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
  CHAPTER_STATE_ACTION,
  CHAPTER_STATE_ACTIONS,
  chapterErrorMessage,
  chaptersFor,
  chapterValidationMessage,
  isChapterSlugTaken,
  liveChapterIds,
  moveChapter,
  selectRange,
  sortChapters,
  type ChapterStateAction,
  type StudioChapter,
} from "../model/studio-chapter.ts";
import { studioText } from "../strings.ts";

const t = studioText.chapters;

/** Archive and delete ask first; for one row or for every selected chapter they apply to. */
type Pending = {
  kind: typeof CHAPTER_STATE_ACTION.ARCHIVE | typeof CHAPTER_STATE_ACTION.DELETE;
  chapters: StudioChapter[];
};

/**
 * Chapter list of one story: add, reorder (move buttons or drag), rename the slug, archive and delete/restore (one row,
 * from its context menu, or several selected ones at once), and the scheduled ones.
 */
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
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const anchor = useRef<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [bulkBusy, setBulkBusy] = useState(false);

  const live = liveChapterIds(chapters);
  const sorted = sortChapters(chapters);
  const byId = new Map(sorted.map((chapter) => [chapter.id, chapter]));
  const reorderTo = (next: string[]) =>
    reorder.mutate(next, { onError: (error) => toast.error(chapterErrorMessage(error)) });
  const sortable = useSortableList({ ids: live, onReorder: reorderTo, disabled: reorder.isPending });
  const shown = [...sortable.order.flatMap((id) => byId.get(id) ?? []), ...sorted.filter((chapter) => chapter.deleted)];

  // A chapter that is gone (reloaded away) cannot stay selected.
  const present = [...selected].filter((id) => byId.has(id));
  if (present.length !== selected.size) setSelected(new Set(present));

  const move = (chapterId: string, direction: 1 | -1) => {
    const next = moveChapter(live, chapterId, direction);
    if (next !== null) reorderTo(next);
  };

  const run = (action: Promise<unknown>, message: string) =>
    action.then(
      () => toast.success(message),
      (error: unknown) => {
        toast.error(chapterErrorMessage(error as Parameters<typeof chapterErrorMessage>[0]));
        throw error;
      },
    );

  /** One chapter, through the same mutation as its row button. */
  const apply = (action: ChapterStateAction, chapterId: string) => {
    switch (action) {
      case CHAPTER_STATE_ACTION.ARCHIVE:
      case CHAPTER_STATE_ACTION.UNARCHIVE:
        return archive.mutateAsync({ chapterId, archived: action === CHAPTER_STATE_ACTION.ARCHIVE });
      case CHAPTER_STATE_ACTION.DELETE:
      case CHAPTER_STATE_ACTION.RESTORE:
        return setDeleted.mutateAsync({ chapterId, deleted: action === CHAPTER_STATE_ACTION.DELETE });
    }
  };

  /**
   * Every selected chapter the action applies to, one after the other (the same calls and rules as its row). The ones
   * that failed stay selected with the reason on their row; the others are unticked.
   */
  const runBulk = async (action: ChapterStateAction, targets: readonly StudioChapter[]) => {
    setBulkBusy(true);
    setRowErrors(new Map());
    const failed = new Map<string, string>();
    for (const chapter of targets) {
      try {
        await apply(action, chapter.id);
      } catch (error) {
        failed.set(chapter.id, chapterErrorMessage(error as Parameters<typeof chapterErrorMessage>[0]));
      }
    }
    setBulkBusy(false);
    setRowErrors(failed);
    const handled = new Set(targets.map((chapter) => chapter.id));
    setSelected((current) => new Set([...current].filter((id) => failed.has(id) || !handled.has(id))));
    const done = targets.length - failed.size;
    if (failed.size === 0) toast.success(t.bulk.done[action](done));
    else toast.error(t.bulk.partial(done, failed.size));
  };

  const onStateAction = (chapter: StudioChapter, action: ChapterStateAction) => {
    if (action === CHAPTER_STATE_ACTION.ARCHIVE || action === CHAPTER_STATE_ACTION.DELETE) {
      setPending({ kind: action, chapters: [chapter] });
      return;
    }
    void run(apply(action, chapter.id), SINGLE_DONE[action]()).catch(() => undefined);
  };

  const onBulk = (action: ChapterStateAction) => {
    const targets = chaptersFor(chapters, selected, action, canManage);
    if (targets.length === 0) return;
    if (action === CHAPTER_STATE_ACTION.ARCHIVE || action === CHAPTER_STATE_ACTION.DELETE) {
      setPending({ kind: action, chapters: targets });
      return;
    }
    void runBulk(action, targets);
  };

  const select = (chapterId: string, checked: boolean, range: boolean) => {
    const order = shown.map((chapter) => chapter.id);
    const from = range ? anchor.current : null;
    setSelected((current) => selectRange(order, current, chapterId, checked, from));
    anchor.current = chapterId;
  };

  const clearSelection = () => {
    setSelected(new Set());
    setRowErrors(new Map());
    anchor.current = null;
  };

  const many = (pending?.chapters.length ?? 0) > 1;
  const deleting = pending?.kind === CHAPTER_STATE_ACTION.DELETE;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <StudioCrumbs storyId={storyId} storyTitle={storyTitle} page="chapters" />
        <PageHeader title={t.title} description={t.description(storyTitle)} />
      </div>

      <ScheduledChapters chapters={chapters} role={role} locale={locale} />

      {chapters.length === 0 ? (
        <EmptyState icon={ListOrdered} title={t.empty.title} description={t.empty.description} />
      ) : (
        <div className="flex flex-col gap-2">
          <ol ref={sortable.listRef} aria-label={t.listLabel} className="relative flex flex-col gap-2">
            {shown.map((chapter) => (
              <ChapterRow
                key={chapter.id}
                storyId={storyId}
                chapter={chapter}
                index={live.indexOf(chapter.id)}
                liveCount={live.length}
                canManage={canManage}
                sortable={sortable}
                selected={selected.has(chapter.id)}
                onSelect={(checked, range) => select(chapter.id, checked, range)}
                error={rowErrors.get(chapter.id)}
                moving={reorder.isPending}
                busy={{ unarchive: archive.isPending, restore: setDeleted.isPending }}
                onMove={(direction) => move(chapter.id, direction)}
                onRename={() => setRenaming(chapter)}
                onStateAction={(action) => onStateAction(chapter, action)}
              />
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">{t.numbering}</p>
          {live.length > 1 ? <p className="text-xs text-muted-foreground">{t.reorderHint}</p> : null}
          {canManage ? (
            <BulkActionDock
              count={selected.size}
              summary={t.bulk.selected(selected.size)}
              label={t.bulk.label}
              clearLabel={t.bulk.clear}
              onClear={clearSelection}
            >
              {selected.size < chapters.length ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-background hover:bg-background/15 hover:text-background"
                  onClick={() => setSelected(new Set(shown.map((chapter) => chapter.id)))}
                >
                  {t.bulk.selectAll}
                </Button>
              ) : null}
              {CHAPTER_STATE_ACTIONS.map((action) => {
                const count = chaptersFor(chapters, selected, action, canManage).length;
                return count === 0 ? null : (
                  <Button
                    key={action}
                    type="button"
                    size="sm"
                    variant={action === CHAPTER_STATE_ACTION.DELETE ? "destructive" : "secondary"}
                    disabled={bulkBusy}
                    onClick={() => onBulk(action)}
                  >
                    {t.bulk[action](count)}
                  </Button>
                );
              })}
              {bulkBusy ? <span className="text-xs">{t.bulk.working}</span> : null}
            </BulkActionDock>
          ) : null}
        </div>
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
        title={
          deleting
            ? many
              ? t.bulk.deleteTitle(pending.chapters.length)
              : t.deleteTitle
            : many && pending
              ? t.bulk.archiveTitle(pending.chapters.length)
              : t.archiveTitle
        }
        description={deleting ? t.deleteDescription : t.archiveDescription}
        confirmLabel={deleting ? t.delete : t.archive}
        cancelLabel={t.cancel}
        destructive={deleting}
        onConfirm={async () => {
          if (!pending) return;
          const { kind, chapters: targets } = pending;
          const [only] = targets;
          if (targets.length === 1 && only) await run(apply(kind, only.id), SINGLE_DONE[kind]());
          else await runBulk(kind, targets);
        }}
      />
    </div>
  );
}

/** The toast after a single row's action (the bulk dock has its own counts). */
const SINGLE_DONE: Record<ChapterStateAction, () => string> = {
  archive: () => t.archived,
  unarchive: () => t.unarchived,
  delete: () => t.deleted,
  restore: () => t.restored,
};

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
