"use client";

import { ArrowDown, ArrowUp, FileQuestion, Globe, Link2, ListChecks, Lock } from "lucide-react";
import { useState } from "react";
import { VISIBILITIES, VISIBILITY, type Visibility } from "@storynest/validation";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { StoryCard } from "@storynest/ui/widgets/story-card";
import { useAuth } from "../../_shared/auth.tsx";
import { currentLocale } from "../../_shared/i18n.ts";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { discoveryText, toStoryCardData } from "../../discovery/index.ts";
import { ShareButton } from "../../share/index.ts";
import { ListFormDialog } from "../components/list-form-dialog.tsx";
import { useDeleteList, useList, useRemoveFromList, useReorderList, useUpdateList } from "../hooks/use-lists.ts";
import { listErrorMessage, listHref, moveStory, type ReadingList } from "../model/list.ts";
import { listText } from "../strings.ts";

const t = listText.page;
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";
const VISIBILITY_ICON: Record<Visibility, typeof Lock> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};

/**
 * One reading list. Everyone who may see it reads it; its owner can also rename it, change who sees it, reorder or
 * remove its stories and delete it.
 */
export function ListScreen({
  listId,
  coverUrlFor,
}: {
  listId: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useAppToast();
  const detail = useList(listId);
  const update = useUpdateList(listId);
  const remove = useDeleteList(listId);
  const removeStory = useRemoveFromList();
  const reorder = useReorderList(listId);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The access just chosen in the share dialog, shown at once and until the list has reloaded after the save (or the
  // save failed); from then on the server's answer is what the dialog shows.
  const [chosenAccess, setChosenAccess] = useState<{ value: Visibility; at: number } | null>(null);
  if (
    chosenAccess !== null &&
    (detail.data?.list.visibility === chosenAccess.value ||
      (!update.isPending && detail.dataUpdatedAt > chosenAccess.at))
  ) {
    setChosenAccess(null);
  }

  if (detail.isPending) return <Skeleton className="h-96 w-full rounded-xl" aria-busy />;
  if (detail.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => void detail.refetch()}
      />
    );
  }
  if (!detail.data) {
    return <EmptyState icon={FileQuestion} title={t.notFound.title} description={t.notFound.description} />;
  }

  const { list, items } = detail.data;
  const isOwner = auth.status === "authenticated" && auth.user.id === list.ownerId;
  const Icon = VISIBILITY_ICON[list.visibility];
  const labels = {
    reads: discoveryText.card.reads,
    votes: discoveryText.card.votes,
    updated: discoveryText.card.updated,
  };
  const ids = items.map((item) => item.storyId);

  const changeAccess = (visibility: Visibility) => {
    setChosenAccess({ value: visibility, at: Date.now() });
    update.mutate(
      { title: list.title, description: list.description, visibility },
      {
        onSuccess: () => toast.success(listText.share.changed(listText.visibility[visibility])),
        onError: (error) => {
          setChosenAccess(null);
          toast.error(listErrorMessage(error));
        },
      },
    );
  };

  const move = (storyId: string, direction: 1 | -1) => {
    const next = moveStory(ids, storyId, direction);
    if (next === null) return;
    reorder.mutate(next, { onError: (error) => toast.error(listErrorMessage(error)) });
  };

  return (
    <section aria-label={list.title} className="flex flex-col gap-6">
      <PageHeader
        title={list.title}
        description={list.description === "" ? undefined : list.description}
        actions={
          isOwner ? (
            <div className="flex flex-wrap gap-2">
              <ListShareButton
                list={list}
                access={chosenAccess?.value ?? list.visibility}
                onChange={changeAccess}
                pending={update.isPending}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                {t.edit}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setDeleting(true)}
              >
                {t.delete}
              </Button>
            </div>
          ) : list.visibility === VISIBILITY.PRIVATE ? undefined : (
            // A visitor only ever gets here for a public or unlisted list (RLS); a private one is never offered.
            <ListShareButton list={list} />
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {isOwner ? (
          <Badge variant="secondary" className="gap-1">
            <Icon aria-hidden className="size-3" />
            {listText.visibility[list.visibility]}
          </Badge>
        ) : list.ownerName ? (
          <span>{t.byOwner(list.ownerName)}</span>
        ) : null}
        <span>{t.storyCount(items.length)}</span>
        {isOwner ? (
          <AppLink href="/library" className="underline-offset-4 hover:underline">
            {t.backToLibrary}
          </AppLink>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={(isOwner ? listText.page.emptyOwner : t.empty).title}
          description={(isOwner ? listText.page.emptyOwner : t.empty).description}
        />
      ) : (
        <ul aria-label={t.storiesLabel} className={GRID}>
          {items.map((item, index) => (
            <li key={item.storyId} className="flex flex-col gap-2">
              <StoryCard
                story={toStoryCardData(item.story, coverUrlFor)}
                labels={labels}
                LinkComponent={AppLink}
                locale={currentLocale()}
              />
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label={`${t.moveUp}: ${item.story.title}`}
                    disabled={reorder.isPending || index === 0}
                    onClick={() => move(item.storyId, -1)}
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label={`${t.moveDown}: ${item.story.title}`}
                    disabled={reorder.isPending || index === items.length - 1}
                    onClick={() => move(item.storyId, 1)}
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={removeStory.isPending}
                    onClick={() =>
                      removeStory.mutate(
                        { listId, storyId: item.storyId },
                        {
                          onSuccess: () => toast.success(t.removed),
                          onError: (error) => toast.error(listErrorMessage(error)),
                        },
                      )
                    }
                  >
                    {t.remove}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <ListFormDialog
          mode="edit"
          initial={{ title: list.title, description: list.description, visibility: list.visibility }}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
          onSubmit={async (values) => {
            try {
              await update.mutateAsync(values);
            } catch (error) {
              throw new Error(listErrorMessage(error as Parameters<typeof listErrorMessage>[0]), { cause: error });
            }
            toast.success(listText.form.saved);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          try {
            await remove.mutateAsync();
          } catch (error) {
            toast.error(listErrorMessage(error as Parameters<typeof listErrorMessage>[0]));
            throw error;
          }
          toast.success(t.deleted);
          navigation.push("/library");
        }}
      />
    </section>
  );
}

/**
 * Share for a reading list. The owner sees who can open the link and changes it there (through the same update as the
 * edit dialog); a visitor gets the link only. The link of a private list is only ever shown to its owner.
 */
function ListShareButton({
  list,
  access,
  onChange,
  pending,
}: {
  list: ReadingList;
  access?: Visibility;
  onChange?: (visibility: Visibility) => void;
  pending?: boolean;
}) {
  const owner = onChange !== undefined && access !== undefined;
  return (
    <ShareButton
      size="sm"
      path={listHref(list.id)}
      name={list.title}
      description={owner ? listText.share.ownerDescription : listText.share.visitorDescription}
      access={
        owner
          ? {
              label: listText.share.access,
              value: access,
              onChange,
              pending,
              options: VISIBILITIES.map((visibility) => ({
                value: visibility,
                label: listText.visibility[visibility],
                description: listText.visibilityHints[visibility],
                icon: VISIBILITY_ICON[visibility],
                reachable: visibility !== VISIBILITY.PRIVATE,
              })),
            }
          : undefined
      }
    />
  );
}
