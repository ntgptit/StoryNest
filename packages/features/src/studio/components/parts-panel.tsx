"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { newId } from "@storynest/utils";
import { PART_ERROR, storyPartTitleSchema } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { TreeFolder } from "@storynest/ui/widgets/part-tree";
import type { AppError } from "../../_shared/errors.ts";
import { partRuns, type PartRef } from "../../_shared/parts.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import {
  useCreatePart,
  useDeletePart,
  useRenamePart,
  useSetChapterPart,
  useStoryParts,
} from "../hooks/use-story-parts.ts";
import { sortChapters, type StudioChapter } from "../model/studio-chapter.ts";
import { studioText } from "../strings.ts";

const t = studioText.parts;
const NO_PART = "none";

/** Text for a refused part change. The part limit is the trigger's PT409. */
export function partErrorMessage(error: AppError): string {
  if (error.kind === "conflict") return t.errors.limit;
  if (error.kind === "forbidden" || error.kind === "notFound") return t.errors.forbidden;
  return t.errors.generic;
}

/** The code of a part title the schema refuses, as text; null when it is fine. */
function titleProblem(title: string): string | null {
  const parsed = storyPartTitleSchema.safeParse(title);
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message === PART_ERROR.titleTooLong
    ? t.validation.titleTooLong
    : t.validation.titleRequired;
}

/**
 * The story as a tree (Lucian 102): parts are folders, chapters are the files inside them, chapters in no part sit at
 * the top level. A folder opens and closes; every chapter has a "part" picker to move it, and a link to write it.
 * Parts are only labels: the chapters keep their reading order (the list below), so a part whose chapters are not
 * next to each other shows once per run. Anyone on the team adds and renames parts; owners and co-authors delete them.
 */
export function PartsPanel({
  storyId,
  chapters,
  canManage,
}: {
  storyId: string;
  chapters: readonly StudioChapter[];
  canManage: boolean;
}) {
  const toast = useAppToast();
  const parts = useStoryParts(storyId);
  const create = useCreatePart(storyId);
  const rename = useRenamePart(storyId);
  const remove = useDeletePart(storyId);
  const move = useSetChapterPart(storyId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PartRef | null>(null);

  const list = parts.data ?? [];
  const byId = new Map(list.map((part) => [part.id, part]));
  const live = sortChapters(chapters).filter((chapter) => !chapter.deleted);
  const runs = partRuns(live, (chapter) => (chapter.partId === null ? null : (byId.get(chapter.partId) ?? null)));
  const used = new Set(live.flatMap((chapter) => (chapter.partId === null ? [] : [chapter.partId])));
  const empty = list.filter((part) => !used.has(part.id));

  const chapterItem = (chapter: StudioChapter) => {
    const title = chapter.title.trim() === "" ? studioText.chapters.untitled : chapter.title;
    return (
      <li key={chapter.id} className="flex min-h-11 flex-wrap items-center gap-2 py-1 pl-3">
        <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <AppLink
          href={`/studio/story/${storyId}/chapter/${chapter.id}`}
          aria-label={t.openChapter(title)}
          className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
        >
          <span className="text-muted-foreground">{studioText.chapters.position(chapter.position)} · </span>
          {title}
        </AppLink>
        <Select
          value={chapter.partId ?? NO_PART}
          disabled={move.isPending}
          onValueChange={(value) =>
            move.mutate(
              { chapterId: chapter.id, partId: value === NO_PART ? null : value },
              {
                onSuccess: () => toast.success(t.moved),
                onError: (error) => toast.error(partErrorMessage(error)),
              },
            )
          }
        >
          <SelectTrigger size="sm" aria-label={t.partOf(title)} className="max-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PART}>{t.noPart}</SelectItem>
            {list.map((part) => (
              <SelectItem key={part.id} value={part.id}>
                {part.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </li>
    );
  };

  const folder = (part: PartRef, key: string, items: readonly StudioChapter[]) => (
    <li key={key}>
      <TreeFolder
        label={part.title}
        meta={t.chapterCount(items.length)}
        actions={
          <span role="group" aria-label={t.actions(part.title)} className="flex shrink-0 items-center">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t.rename}
              onClick={() => setRenaming(renaming === part.id ? null : part.id)}
            >
              <Pencil aria-hidden />
            </Button>
            {canManage ? (
              <Button type="button" size="icon" variant="ghost" aria-label={t.delete} onClick={() => setDeleting(part)}>
                <Trash2 aria-hidden />
              </Button>
            ) : null}
          </span>
        }
      >
        {renaming === part.id ? (
          <RenamePartForm
            part={part}
            busy={rename.isPending}
            onCancel={() => setRenaming(null)}
            onSave={(title) =>
              rename.mutate(
                { partId: part.id, title },
                {
                  onSuccess: () => {
                    setRenaming(null);
                    toast.success(t.renamed);
                  },
                  onError: (error) => toast.error(partErrorMessage(error)),
                },
              )
            }
          />
        ) : null}
        {items.length === 0 ? (
          <p className="py-2 pl-3 text-sm text-muted-foreground">{t.emptyPart}</p>
        ) : (
          <ul>{items.map(chapterItem)}</ul>
        )}
      </TreeFolder>
    </li>
  );

  return (
    <section aria-labelledby="parts-title" className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <h2 id="parts-title" className="text-base font-semibold">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      <ul aria-label={t.treeLabel} className="flex flex-col">
        {runs.map((run) =>
          run.part === null ? (
            <li key={run.key}>
              <ul>{run.items.map(chapterItem)}</ul>
            </li>
          ) : (
            folder(run.part, run.key, run.items)
          ),
        )}
        {empty.map((part) => folder(part, `empty-${part.id}`, []))}
      </ul>

      <AddPartForm
        busy={create.isPending}
        onAdd={(title, done) =>
          create.mutate(
            { id: newId(), title },
            {
              onSuccess: () => {
                done();
                toast.success(t.add.added);
              },
              onError: (error) => toast.error(partErrorMessage(error)),
            },
          )
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id).then(
            () => toast.success(t.deleted),
            (error: AppError) => toast.error(partErrorMessage(error)),
          );
        }}
      />
    </section>
  );
}

function AddPartForm({ busy, onAdd }: { busy: boolean; onAdd: (title: string, done: () => void) => void }) {
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = titleProblem(title);
    setProblem(issue);
    if (issue !== null) {
      input.current?.focus();
      return;
    }
    onAdd(title.trim(), () => setTitle(""));
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
      <Label htmlFor="new-part-title">{t.add.label}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          ref={input}
          id="new-part-title"
          value={title}
          placeholder={t.add.placeholder}
          aria-invalid={problem !== null}
          aria-describedby={problem === null ? undefined : "new-part-error"}
          onChange={(event) => setTitle(event.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" disabled={busy}>
          {t.add.submit}
        </Button>
      </div>
      {problem === null ? null : (
        <p id="new-part-error" role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
    </form>
  );
}

function RenamePartForm({
  part,
  busy,
  onSave,
  onCancel,
}: {
  part: PartRef;
  busy: boolean;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(part.title);
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <form
      noValidate
      className="flex flex-col gap-1.5 py-2 pl-3"
      onSubmit={(event) => {
        event.preventDefault();
        const issue = titleProblem(title);
        setProblem(issue);
        if (issue === null) onSave(title.trim());
      }}
    >
      <div className="flex flex-wrap gap-2">
        <Input
          autoFocus
          value={title}
          aria-label={t.renameLabel(part.title)}
          aria-invalid={problem !== null}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" disabled={busy}>
          {t.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
      {problem === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
    </form>
  );
}
