"use client";

import { Archive, ArchiveRestore, ArrowDown, ArrowUp, PenLine, RotateCcw, TextCursorInput, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Checkbox } from "@storynest/ui/components/checkbox";
import { RowActionsButton, RowActionsMenu, type RowAction } from "@storynest/ui/widgets/row-actions-menu";
import { DragHandle, SortableItem, type SortableList } from "@storynest/ui/widgets/sortable-list";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import {
  CHAPTER_STATE_ACTION,
  chapterStateActions,
  type ChapterStateAction,
  type StudioChapter,
} from "../model/studio-chapter.ts";
import { studioText } from "../strings.ts";

const t = studioText.chapters;

const STATE_LABEL: Record<ChapterStateAction, () => string> = {
  archive: () => t.archive,
  unarchive: () => t.unarchive,
  delete: () => t.delete,
  restore: () => t.restore,
};
const STATE_ICON = {
  archive: Archive,
  unarchive: ArchiveRestore,
  delete: Trash2,
  restore: RotateCcw,
} as const;

/**
 * One chapter of the manager. Its actions are the visible buttons (on phones Rename / Archive / Delete fold into the
 * "..." menu, Write and the arrows stay), the same list in a context menu (right-click, long press, Shift+F10), a
 * drag handle for live chapters, and, for owners and co-authors, a checkbox for bulk actions.
 */
export function ChapterRow({
  storyId,
  chapter,
  index,
  liveCount,
  canManage,
  sortable,
  selected,
  onSelect,
  error,
  moving,
  busy,
  onMove,
  onRename,
  onStateAction,
}: {
  storyId: string;
  chapter: StudioChapter;
  /** Place among the live chapters (-1 for a deleted one). */
  index: number;
  liveCount: number;
  canManage: boolean;
  sortable: SortableList;
  selected: boolean;
  /** Tick or untick; `range` when Shift was held (select everything from the last ticked row). */
  onSelect: (checked: boolean, range: boolean) => void;
  /** Why the last bulk action did not apply to this chapter. */
  error: string | undefined;
  moving: boolean;
  busy: Partial<Record<ChapterStateAction, boolean>>;
  onMove: (direction: 1 | -1) => void;
  onRename: () => void;
  onStateAction: (action: ChapterStateAction) => void;
}) {
  const navigation = useNavigation();
  const name = chapter.title || t.untitled;
  const named = name === t.untitled ? `${t.position(chapter.position)} ${chapter.slug}` : name;
  const writeHref = `/studio/story/${storyId}/chapter/${chapter.id}`;
  const states = chapterStateActions(chapter, canManage);
  const live = !chapter.deleted;

  const stateAction = (action: ChapterStateAction): RowAction => ({
    id: action,
    label: STATE_LABEL[action](),
    icon: STATE_ICON[action],
    destructive: action === CHAPTER_STATE_ACTION.DELETE,
    separated: action === CHAPTER_STATE_ACTION.DELETE,
    disabled: busy[action] === true,
    onSelect: () => onStateAction(action),
  });
  const renameAction: RowAction = { id: "rename", label: t.rename, icon: TextCursorInput, onSelect: onRename };
  // On phones these are the buttons that are hidden: the "..." menu stands in for them.
  const folded: RowAction[] = live ? [renameAction, ...states.map(stateAction)] : [];
  const menu: RowAction[] = live
    ? [
        { id: "write", label: t.write, icon: PenLine, onSelect: () => navigation.push(writeHref) },
        { id: "up", label: t.moveUp, icon: ArrowUp, disabled: moving || index <= 0, onSelect: () => onMove(-1) },
        {
          id: "down",
          label: t.moveDown,
          icon: ArrowDown,
          disabled: moving || index === liveCount - 1,
          onSelect: () => onMove(1),
        },
        ...folded,
      ]
    : states.map(stateAction);

  const tick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onSelect(!selected, event.shiftKey);
  };

  return (
    <RowActionsMenu actions={menu} label={named}>
      <SortableItem
        sortable={sortable}
        id={chapter.id}
        data-selected={selected || undefined}
        className="flex items-start gap-1.5 rounded-xl border bg-card p-2 text-card-foreground select-none group-data-[state=open]/sortable:ring-2 group-data-[state=open]/sortable:ring-primary group-data-[selected]/sortable:border-primary group-data-[selected]/sortable:bg-accent sm:gap-2 sm:p-3"
      >
        {live ? (
          <DragHandle sortable={sortable} id={chapter.id} className="-my-1 sm:-ml-1" />
        ) : (
          <span aria-hidden className="w-11 shrink-0" />
        )}
        {canManage ? (
          <span className="flex h-6 items-center sm:h-11">
            <Checkbox checked={selected} aria-label={t.select(named)} onClick={tick} />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t.position(chapter.position)}</p>
            <p
              className={chapter.deleted ? "truncate text-sm font-medium line-through" : "truncate text-sm font-medium"}
            >
              {name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="outline">{t.status[chapter.status]}</Badge>
              {chapter.deleted ? <Badge variant="destructive">{t.deletedBadge}</Badge> : null}
              <span className="truncate text-xs text-muted-foreground">/{chapter.slug}</span>
            </div>
            {error ? <p className="pt-1 text-xs text-destructive">{t.bulk.failedRow(error)}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {chapter.deleted ? (
              states.includes(CHAPTER_STATE_ACTION.RESTORE) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy.restore === true}
                  onClick={() => onStateAction(CHAPTER_STATE_ACTION.RESTORE)}
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
                  disabled={moving || index <= 0}
                  onClick={() => onMove(-1)}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`${t.moveDown}: ${chapter.title || chapter.slug}`}
                  disabled={moving || index === liveCount - 1}
                  onClick={() => onMove(1)}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
                <Button asChild size="sm" variant="outline">
                  <AppLink href={writeHref}>{t.write}</AppLink>
                </Button>
                <Button type="button" size="sm" variant="ghost" className="hidden sm:inline-flex" onClick={onRename}>
                  {t.rename}
                </Button>
                {states.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={
                      action === CHAPTER_STATE_ACTION.DELETE
                        ? "hidden text-destructive sm:inline-flex"
                        : "hidden sm:inline-flex"
                    }
                    disabled={busy[action] === true}
                    onClick={() => onStateAction(action)}
                  >
                    {STATE_LABEL[action]()}
                  </Button>
                ))}
                <RowActionsButton
                  actions={folded}
                  label={t.moreActions(named)}
                  menuLabel={named}
                  className="sm:hidden"
                />
              </>
            )}
          </div>
        </div>
      </SortableItem>
    </RowActionsMenu>
  );
}
