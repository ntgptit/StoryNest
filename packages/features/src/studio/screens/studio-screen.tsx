"use client";

import { BarChart3, BookMarked, Eye, Globe, Link2, ListOrdered, Lock, PenLine, Plus, Users } from "lucide-react";
import { useState, type ComponentType } from "react";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { formatRelativeTime } from "@storynest/utils";
import type { Visibility } from "@storynest/validation";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { discoveryText, statusLabel, storyHref } from "../../discovery/index.ts";
import { MyInvitations } from "../components/my-invitations.tsx";
import { useMyStories } from "../hooks/use-my-stories.ts";
import { useDeletedStories, useSetStoryDeleted } from "../hooks/use-story-editing.ts";
import { storyErrorMessage } from "../model/story-form.ts";
import type { StudioStory } from "../model/studio-story.ts";
import { studioText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

export const VISIBILITY_ICON: Record<Visibility, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};

function StudioStoryRow({
  story,
  locale,
  coverUrlFor,
}: {
  story: StudioStory;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const VisibilityIcon = VISIBILITY_ICON[story.visibility];
  const coverUrl = story.coverStorageKey && coverUrlFor ? coverUrlFor(story.coverStorageKey) : null;
  return (
    <li className="flex gap-4 rounded-xl border bg-card p-3 text-card-foreground sm:p-4">
      <StoryCover title={story.title} coverUrl={coverUrl} className="w-16 shrink-0 sm:w-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="truncate text-base font-semibold">{story.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{statusLabel(story.status)}</Badge>
          <Badge variant="secondary" className="gap-1">
            <VisibilityIcon aria-hidden className="size-3" />
            {studioText.visibility[story.visibility]}
          </Badge>
          {story.isMature ? <Badge variant="destructive">{discoveryText.mature}</Badge> : null}
          {story.role !== "owner" ? <Badge>{studioText.role[story.role]}</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {studioText.chapterCount(story.chapterCount)} ·{" "}
          {studioText.updated(formatRelativeTime(story.updatedAt, locale))}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {story.role !== "editor" ? (
            <Button asChild size="sm">
              <AppLink href={`/studio/story/${story.id}`}>
                <PenLine aria-hidden className="size-4" />
                {studioText.edit}
              </AppLink>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <AppLink href={`/studio/story/${story.id}/chapters`}>
              <ListOrdered aria-hidden className="size-4" />
              {studioText.chaptersLink}
            </AppLink>
          </Button>
          {story.role === "owner" ? (
            <Button asChild variant="outline" size="sm">
              <AppLink href={`/studio/story/${story.id}/team`}>
                <Users aria-hidden className="size-4" />
                {studioText.teamLink}
              </AppLink>
            </Button>
          ) : null}
          {story.role !== "editor" ? (
            <Button asChild variant="outline" size="sm">
              <AppLink href={`/studio/story/${story.id}/stats`}>
                <BarChart3 aria-hidden className="size-4" />
                {studioText.statsLink}
              </AppLink>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <AppLink href={storyHref(story)}>
              <Eye aria-hidden className="size-4" />
              {studioText.view}
            </AppLink>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Author workspace home: every story I own or was invited to, with its state and quick actions. */
export function StudioScreen({
  locale = currentLocale(),
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const stories = useMyStories();

  return (
    <section aria-label={studioText.title} className="flex flex-col gap-6">
      <PageHeader
        title={studioText.title}
        description={studioText.description}
        actions={
          <Button asChild size="sm">
            <AppLink href="/studio/new">
              <Plus aria-hidden className="size-4" />
              {studioText.create}
            </AppLink>
          </Button>
        }
      />
      <MyInvitations />
      {stories.isError ? (
        <ErrorState
          title={studioText.error.title}
          description={studioText.error.description}
          retryLabel={studioText.error.retry}
          onRetry={() => void stories.refetch()}
        />
      ) : stories.isPending ? (
        <div className="flex flex-col gap-3" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : stories.data.length === 0 ? (
        <EmptyState icon={BookMarked} title={studioText.empty.title} description={studioText.empty.description} />
      ) : (
        <ul aria-label={studioText.listLabel} className="flex flex-col gap-3">
          {stories.data.map((story) => (
            <StudioStoryRow key={story.id} story={story} locale={locale} coverUrlFor={coverUrlFor} />
          ))}
        </ul>
      )}
      <DeletedStories locale={locale} />
    </section>
  );
}

/** Soft-deleted stories of the signed-in owner, hidden behind a toggle, each with a restore button. */
function DeletedStories({ locale }: { locale: string }) {
  const deleted = useDeletedStories();
  const setDeleted = useSetStoryDeleted();
  const toast = useAppToast();
  const [open, setOpen] = useState(false);
  const items = deleted.data ?? [];
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? studioText.deleted.toggleHide : studioText.deleted.toggleShow(items.length)}
      </Button>
      {open ? (
        <ul aria-label={studioText.deleted.title} className="flex flex-col gap-2">
          {items.map((story) => (
            <li key={story.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{story.title}</p>
                <p className="text-xs text-muted-foreground">
                  {studioText.deleted.deletedAt(formatRelativeTime(story.deletedAt, locale))}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setDeleted.isPending}
                onClick={() =>
                  setDeleted.mutate(
                    { storyId: story.id, deleted: false },
                    {
                      onSuccess: () => toast.success(studioText.deleted.restored),
                      onError: (error) => toast.error(storyErrorMessage(error)),
                    },
                  )
                }
              >
                {studioText.deleted.restore}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
