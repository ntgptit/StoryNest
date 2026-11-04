"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileQuestion } from "lucide-react";
import { useRef, useState } from "react";
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
import { Input } from "@storynest/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Switch } from "@storynest/ui/components/switch";
import { Textarea } from "@storynest/ui/components/textarea";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { toAppError } from "../../_shared/errors.ts";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { statusLabel, useCategories } from "../../discovery/index.ts";
import type { StoryForEdit } from "../api/story-write.api.ts";
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
        onRetry={() => void story.refetch()}
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
      if (tagsChanged && (await saveTags(storyId))) toast.success(t.saved);
      return;
    }
    update.mutate(values, {
      onSuccess: async () => {
        form.reset(values);
        if (tagsChanged && !(await saveTags(storyId))) return;
        toast.success(t.saved);
      },
      onError: onFailure,
    });
  });

  const busy = save.isPending || setTagsMutation.isPending;
  const bannerError = save.error && !isSlugTaken(save.error) ? storyErrorMessage(save.error) : null;
  const options = categoryOptions(categories.data ?? []);
  const deleted = edit?.deletedAt != null;

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        {bannerError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {bannerError}
          </p>
        ) : null}

        {edit ? (
          <CoverEditor story={{ id: storyId, coverStorageKey: edit.coverStorageKey }} title={form.watch("title")} />
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
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VISIBILITIES.map((visibility) => (
                    <SelectItem key={visibility} value={visibility}>
                      {studioText.visibility[visibility]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t.visibilityHints[field.value]}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
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
          <Button type="submit" disabled={busy || (mode === "edit" && !form.formState.isDirty && !tagsChanged)}>
            {busy ? t.submitting : mode === "create" ? t.submitCreate : t.submitSave}
          </Button>
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
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          await setDeleted.mutateAsync({ storyId, deleted: true });
          toast.success(t.deleted);
          navigation.push("/studio");
        }}
      />
    </Form>
  );
}
