"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileQuestion } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { newId } from "@storynest/utils";
import { STORY_LANGUAGES, STORY_STATUSES, VISIBILITIES, storyFormSchema, type StoryForm } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@storynest/ui/components/form";
import { FormErrorSummary } from "@storynest/ui/components/form-error-summary";
import { InlineAlert } from "@storynest/ui/widgets/inline-alert";
import { Input } from "@storynest/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Switch } from "@storynest/ui/components/switch";
import { Textarea } from "@storynest/ui/components/textarea";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { RadioCards } from "@storynest/ui/widgets/radio-cards";
import { SearchResultPreview } from "@storynest/ui/widgets/search-result-preview";
import { SubmitButton } from "@storynest/ui/widgets/submit-button";
import { UnsavedChangesBar, useLeaveGuard } from "@storynest/ui/widgets/unsaved-changes-bar";
import { WeekdayPainter } from "@storynest/ui/widgets/weekday-painter";
import { usePublicUrl } from "../../_shared/avatar.tsx";
import { currentLocale } from "../../_shared/i18n.ts";
import { flagsToMask, maskToFlags, updateDaysText, weekdayNames } from "../../_shared/update-days.ts";
import { toAppError } from "../../_shared/errors.ts";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { AppLink, useNavigation, usePlatform } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { statusLabel, storyHref, useCategories } from "../../discovery/index.ts";
import { shareUrl } from "../../share/index.ts";
import { shellText } from "../../shell/index.ts";
import { isIndexable, STORY_META_DESCRIPTION_LENGTH, storyMetaDescription, useStory } from "../../story/index.ts";
import { useStudioChapters } from "../hooks/use-chapter-management.ts";
import { countPublished, readerAccess, removesReaderAccess } from "../model/reader-access.ts";
import { COVERS_BUCKET, type StoryForEdit } from "../api/story-write.api.ts";
import { CoverEditor } from "../components/cover-editor.tsx";
import { TagEditor } from "../components/tag-editor.tsx";
import {
  useCreateStory,
  useSetStoryDeleted,
  useSetStoryTags,
  useStoryForEdit,
  useUpdateStory,
} from "../hooks/use-story-editing.ts";
import {
  NO_CATEGORY,
  categoryOptions,
  emptyStoryForm,
  isSlugTaken,
  slugFromTitle,
  storyErrorMessage,
  validationMessage,
} from "../model/story-form.ts";
import { sameTags, tagsErrorMessage, type TagChip } from "../model/tags.ts";
import { studioText } from "../strings.ts";
import { VISIBILITY_ICON } from "./studio-screen.tsx";

const t = studioText.form;

/** Create (no `storyId`) or edit one story's settings. */
export function StoryFormScreen({ storyId }: { storyId?: string | undefined }) {
  return storyId === undefined ? <CreateStory /> : <EditStory storyId={storyId} />;
}

function CreateStory() {
  // One id per opened form: a retry after a lost response reuses it, so it can never create two stories.
  const id = useRef(newId());
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title={t.createTitle} description={t.createDescription} />
      <StoryFields mode="create" initial={emptyStoryForm()} storyId={id.current} />
    </div>
  );
}

function EditStory({ storyId }: { storyId: string }) {
  const story = useStoryForEdit(storyId);

  if (story.isPending) return <Skeleton className="h-96 w-full max-w-xl rounded-xl" aria-busy />;
  if (story.isError) {
    return (
      <ErrorState
        title={studioText.error.title}
        description={studioText.error.description}
        retryLabel={studioText.error.retry}
        onRetry={() => story.refetch()}
      />
    );
  }
  if (!story.data) {
    return <EmptyState icon={FileQuestion} title={t.notFound.title} description={t.notFound.description} />;
  }
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title={t.editTitle} description={t.editDescription} />
      <AppLink
        href={`/studio/story/${storyId}/chapters`}
        className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t.chaptersLink}
      </AppLink>
      {story.data.deletedAt ? <p className="text-sm text-muted-foreground">{t.deletedNotice}</p> : null}
      {story.data.role === "editor" ? (
        <p className="text-sm text-muted-foreground">{t.readOnly}</p>
      ) : (
        <StoryFields mode="edit" initial={story.data.form} storyId={storyId} edit={story.data} />
      )}
    </div>
  );
}

function StoryFields({
  mode,
  initial,
  storyId,
  edit,
}: {
  mode: "create" | "edit";
  initial: StoryForm;
  storyId: string;
  edit?: StoryForEdit;
}) {
  const toast = useAppToast();
  const navigation = useNavigation();
  const categories = useCategories();
  const create = useCreateStory(() => storyId);
  const update = useUpdateStory(storyId);
  const setDeleted = useSetStoryDeleted();
  const setTagsMutation = useSetStoryTags();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A save that would take readers away waits here until the author confirms (with the number of followers it affects).
  const [pendingSave, setPendingSave] = useState<StoryForm | null>(null);
  const chapters = useStudioChapters(storyId);
  const followers = useStory(storyId).data?.stats.followers ?? 0;
  // Bumped after every successful save of an existing story: the Save button draws its check (Lucian 001).
  const [savedCount, setSavedCount] = useState(0);
  // Tags are saved with the story but are not part of the story form (they live in their own table, behind an RPC).
  const [tags, setTags] = useState<TagChip[]>(edit?.tags ?? []);
  const [savedTags, setSavedTags] = useState<TagChip[]>(edit?.tags ?? []);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const tagsChanged = !sameTags(tags, savedTags);
  // The slug follows the title until the author edits it (always manual when editing an existing story).
  const slugTouched = useRef(mode === "edit");

  const form = useForm<StoryForm>({
    resolver: translateErrors(zodResolver(storyFormSchema), validationMessage),
    defaultValues: initial,
  });
  const formRef = useRef<HTMLFormElement>(null);

  const save = mode === "create" ? create : update;
  const onFailure = (error: Parameters<typeof storyErrorMessage>[0]) => {
    if (isSlugTaken(error)) form.setError("slug", { type: "server", message: studioText.errors.slugTaken });
  };

  /** Saves the tags; false (and a message) when the database refuses them. The story itself is already saved. */
  const saveTags = async (id: string): Promise<boolean> => {
    try {
      const stored = await setTagsMutation.mutateAsync({ storyId: id, names: tags.map((tag) => tag.name) });
      setTags(stored);
      setSavedTags(stored);
      setTagsError(null);
      return true;
    } catch (error) {
      const reason = tagsErrorMessage(toAppError(error));
      setTagsError(reason);
      toast.error(studioText.tags.savedWithoutTags(reason));
      return false;
    }
  };

  const submit = form.handleSubmit(async (values) => {
    if (mode === "create") {
      create.mutate(values, {
        onSuccess: async (id) => {
          if (tags.length > 0) await saveTags(id);
          toast.success(t.created);
          navigation.push(`/studio/story/${id}`);
        },
        onError: onFailure,
      });
      return;
    }
    // Only the tags changed: leave the story row alone (an update would move it to the top of "recently updated").
    if (!form.formState.isDirty) {
      if (tagsChanged && (await saveTags(storyId))) {
        setSavedCount((count) => count + 1);
        toast.success(t.saved);
      }
      return;
    }
    // Until the chapters are known nothing can be said about readers, so the save is not held back.
    if (!edit || !chapters.data || !losesReaders(values, edit, countPublished(chapters.data))) {
      saveEdit(values);
      return;
    }
    // Readers would lose a story they can read now: say so first, and save only when the author confirms.
    setPendingSave(values);
  });

  const saveEdit = (values: StoryForm) =>
    update.mutate(values, {
      onSuccess: async () => {
        form.reset(values);
        if (tagsChanged && !(await saveTags(storyId))) return;
        setSavedCount((count) => count + 1);
        toast.success(t.saved);
      },
      onError: onFailure,
    });

  const busy = save.isPending || setTagsMutation.isPending;

  // Editing: unsaved changes get a Save / Discard bar, and leaving the page asks first (Lucian 250).
  const changedFields = Object.keys(form.formState.dirtyFields).length + (tagsChanged ? 1 : 0);
  const unsaved = mode === "edit" && (form.formState.isDirty || tagsChanged);
  const [leaveWarning, setLeaveWarning] = useState(0);
  useLeaveGuard({
    dirty: unsaved,
    message: t.unsaved.leave,
    onBlocked: () => setLeaveWarning((count) => count + 1),
    allowInside: formRef,
  });
  const discard = () => {
    form.reset();
    setTags(savedTags);
    setTagsError(null);
  };
  const bannerError = save.error && !isSlugTaken(save.error) ? storyErrorMessage(save.error) : null;
  const options = categoryOptions(categories.data ?? []);
  const deleted = edit?.deletedAt != null;

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        {bannerError ? <InlineAlert tone="danger">{bannerError}</InlineAlert> : null}

        <FormErrorSummary title={t.errorSummary} />

        {edit ? (
          <CoverEditor
            story={{ id: storyId, coverStorageKey: edit.coverStorageKey, coverBlurhash: edit.coverBlurhash }}
            title={form.watch("title")}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.cover.saveFirst}</p>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.storyTitle}</FormLabel>
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
              <FormLabel>{t.slug}</FormLabel>
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
              <FormDescription>{t.slugHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="synopsis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.synopsis}</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormDescription>{t.synopsisHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <StoryLinkPreview form={form} storyId={storyId} coverStorageKey={edit?.coverStorageKey ?? null} />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.category}</FormLabel>
              <Select
                value={field.value === "" ? NO_CATEGORY : field.value}
                onValueChange={(value) => field.onChange(value === NO_CATEGORY ? "" : value)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>{t.noCategory}</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <TagEditor value={tags} onChange={setTags} disabled={setTagsMutation.isPending} error={tagsError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="languageCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.language}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STORY_LANGUAGES.map((language) => (
                      <SelectItem key={language} value={language}>
                        {t.languages[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.status}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STORY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.visibility}</FormLabel>
              <FormControl>
                <RadioCards
                  aria-label={t.visibility}
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  options={VISIBILITIES.map((visibility) => ({
                    value: visibility,
                    label: studioText.visibility[visibility],
                    description: t.visibilityHints[visibility],
                    icon: VISIBILITY_ICON[visibility],
                  }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="updateDays"
          render={({ field }) => {
            const locale = currentLocale();
            const mask = field.value ?? 0;
            const days = updateDaysText(mask, locale, "short");
            return (
              <FormItem>
                <p className="text-sm leading-none font-medium">{t.updateDays.label}</p>
                <FormDescription>{t.updateDays.hint}</FormDescription>
                <WeekdayPainter
                  value={maskToFlags(mask)}
                  onChange={(flags) => field.onChange(flagsToMask(flags))}
                  dayLabels={weekdayNames(locale, "short")}
                  dayNames={weekdayNames(locale, "long")}
                  summary={days === "" ? t.updateDays.none : t.updateDays.summary(days)}
                  label={t.updateDays.label}
                />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="isMature"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start justify-between gap-4 rounded-lg border p-3">
              <div className="flex flex-col gap-1">
                <FormLabel>{t.mature}</FormLabel>
                <FormDescription>{t.matureHint}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            label={mode === "create" ? t.submitCreate : t.submitSave}
            busyLabel={t.submitting}
            doneLabel={t.done}
            busy={busy}
            succeeded={savedCount}
            disabled={busy || (mode === "edit" && !form.formState.isDirty && !tagsChanged)}
          />
          <Button asChild variant="ghost">
            <AppLink href="/studio">{t.cancel}</AppLink>
          </Button>
          {mode === "edit" && edit?.role === "owner" ? (
            deleted ? (
              <Button
                type="button"
                variant="outline"
                className="ml-auto"
                disabled={setDeleted.isPending}
                onClick={() =>
                  setDeleted.mutate(
                    { storyId, deleted: false },
                    {
                      onSuccess: () => toast.success(t.restored),
                      onError: (error) => toast.error(storyErrorMessage(error)),
                    },
                  )
                }
              >
                {t.restore}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="ml-auto text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                {t.delete}
              </Button>
            )
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={pendingSave !== null}
        onOpenChange={(open) => !open && setPendingSave(null)}
        title={studioText.access.lose.title}
        description={studioText.access.lose.description(followers)}
        confirmLabel={studioText.access.lose.confirm}
        cancelLabel={t.cancel}
        destructive
        onConfirm={() => {
          const values = pendingSave;
          setPendingSave(null);
          if (values) saveEdit(values);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          try {
            await setDeleted.mutateAsync({ storyId, deleted: true });
          } catch (error) {
            // The dialog stays open on a throw; say why, so the failure is never silent.
            toast.error(storyErrorMessage(toAppError(error)));
            throw error;
          }
          toast.success(t.deleted);
          navigation.push("/studio");
        }}
      />

      {mode === "edit" ? (
        <UnsavedChangesBar
          dirty={unsaved}
          message={t.unsaved.count(changedFields)}
          warning={leaveWarning}
          warningText={t.unsaved.warning}
          saveLabel={t.unsaved.save}
          savingLabel={t.submitting}
          discardLabel={t.unsaved.discard}
          label={t.unsaved.region}
          saving={busy}
          onSave={() => void submit()}
          onDiscard={discard}
        />
      ) : null}
    </Form>
  );
}

/**
 * How the story will look as a search result and as a shared link, from the form as it is typed: the same
 * description cut (storyMetaDescription) and public address (storyHref) as the story page's metadata, the cover once
 * there is one, and a note when the story will not be indexed (isIndexable: unlisted, private or 18+).
 */
function StoryLinkPreview({
  form,
  storyId,
  coverStorageKey,
}: {
  form: ReturnType<typeof useForm<StoryForm>>;
  storyId: string;
  coverStorageKey: string | null;
}) {
  const platform = usePlatform();
  const p = t.seoPreview;
  const [title, slug, synopsis, visibility, isMature] = form.watch([
    "title",
    "slug",
    "synopsis",
    "visibility",
    "isMature",
  ]);
  const coverUrl = usePublicUrl(COVERS_BUCKET, coverStorageKey);
  // The origin is only known in the browser (and the share origin may differ from the page's): until then, the path.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    try {
      setOrigin(platform.shareOrigin ? platform.shareOrigin() : platform.appOrigin());
    } catch {
      setOrigin(null);
    }
  }, [platform]);
  const path = storyHref({ id: storyId, slug: slug || "…" });
  const url = origin ? shareUrl(origin, path) : path;
  const text = (synopsis ?? "").replace(/\s+/g, " ").trim();

  return (
    <SearchResultPreview
      siteName={shellText.appName}
      url={url}
      title={title.trim() || p.untitled}
      description={text === "" ? p.noSynopsis : storyMetaDescription(text)}
      sourceLength={text.length}
      limit={STORY_META_DESCRIPTION_LENGTH}
      imageUrl={coverUrl}
      note={isIndexable({ visibility, isMature }) ? null : p.notIndexed}
      labels={{
        region: p.region,
        searchTab: p.searchTab,
        shareTab: p.shareTab,
        descriptionLength: p.descriptionLength,
      }}
    />
  );
}

/** Whether saving these values would take readers away from a story they can read now. */
function losesReaders(values: StoryForm, saved: StoryForEdit, published: number): boolean {
  const deleted = saved.deletedAt !== null;
  const before = readerAccess({ ...saved.form, deleted }, published);
  const after = readerAccess({ ...values, deleted }, published);
  return removesReaderAccess(before, after);
}
