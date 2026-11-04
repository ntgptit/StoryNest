"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { FileQuestion } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { formatCount } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import type { ChapterDraft } from "../api/draft.api.ts";
import { EditorToolbar } from "../components/editor-toolbar.tsx";
import { useChapterDraft, useSaveChapterDraft } from "../hooks/use-chapter-draft.ts";
import { bodyToDoc, type EditorNode } from "../model/body-converter.ts";
import { checkDraft, isDraftConflict, saveErrorMessage, wordCountOf } from "../model/draft-form.ts";
import { editorExtensions } from "../model/extensions.ts";
import { editorText } from "../strings.ts";

const t = editorText;

/** Editor for one chapter's draft: title, formatted text, word count, and a save that never overwrites newer work. */
export function ChapterEditorScreen({
  storyId,
  chapterId,
  onEditor,
  locale = "vi",
}: {
  storyId: string;
  chapterId: string;
  /** Hands the editor instance to the host (tests, shortcuts); not needed to use the screen. */
  onEditor?: ((editor: Editor | null) => void) | undefined;
  locale?: string;
}) {
  const draft = useChapterDraft(chapterId);
  // Bumped to throw the editor away and start again from the saved draft (after a conflict).
  const [session, setSession] = useState(0);

  if (draft.isPending) return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" aria-busy />;
  if (draft.isError) {
    if (draft.error.kind === "invalid") {
      return <EmptyState icon={FileQuestion} title={t.cannotOpen.title} description={t.cannotOpen.description} />;
    }
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

  return (
    <DraftEditor
      key={session}
      draft={draft.data}
      storyId={storyId}
      locale={locale}
      onEditor={onEditor}
      onReload={async () => {
        await draft.refetch();
        setSession((value) => value + 1);
      }}
    />
  );
}

function DraftEditor({
  draft,
  storyId,
  locale,
  onEditor,
  onReload,
}: {
  draft: ChapterDraft;
  storyId: string;
  locale: string;
  onEditor?: ((editor: Editor | null) => void) | undefined;
  onReload: () => Promise<void>;
}) {
  const toast = useAppToast();
  const save = useSaveChapterDraft(draft.chapterId);
  const [title, setTitle] = useState(draft.title);
  const [words, setWords] = useState(() => wordCountOf(bodyToDoc(draft.body)));
  const [conflict, setConflict] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const revision = useRef(draft.revision);
  // Counts every change; a save only clears "unsaved" if nothing changed while it was running.
  const edits = useRef(0);
  const [savedEdits, setSavedEdits] = useState(0);
  const [editCount, setEditCount] = useState(0);

  const touched = useCallback(() => {
    edits.current += 1;
    setEditCount(edits.current);
  }, []);

  const editor = useEditor({
    extensions: editorExtensions(),
    content: bodyToDoc(draft.body),
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": t.bodyLabel, role: "textbox", "aria-multiline": "true" } },
    onCreate: ({ editor: created }) => onEditor?.(created),
    onUpdate: ({ editor: updated }) => {
      touched();
      setWords(wordCountOf(updated.getJSON() as EditorNode));
    },
    onDestroy: () => onEditor?.(null),
  });

  const dirty = editCount !== savedEdits;

  const submit = () => {
    if (!editor) return;
    setFieldError(null);
    const checked = checkDraft(title, editor.getJSON() as EditorNode);
    if (!checked.ok) {
      setFieldError(checked.message);
      return;
    }
    const sentEdits = edits.current;
    save.mutate(
      { title: checked.title, body: checked.body, expectedRevision: revision.current },
      {
        onSuccess: (next) => {
          revision.current = next;
          setSavedEdits(sentEdits);
          setConflict(false);
          toast.success(t.saved);
        },
        onError: (error) => {
          if (isDraftConflict(error)) setConflict(true);
          else toast.error(saveErrorMessage(error));
        },
      },
    );
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <AppLink
        href={`/studio/story/${storyId}/chapters`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t.backToChapters}
      </AppLink>

      {conflict ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
        >
          <p className="font-medium text-destructive">{t.conflict.title}</p>
          <p className="text-muted-foreground">{t.conflict.description}</p>
          <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => void onReload()}>
            {t.conflict.reload}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chapter-title">{t.chapterTitle}</Label>
        <Input
          id="chapter-title"
          value={title}
          placeholder={t.chapterTitlePlaceholder}
          maxLength={400}
          onChange={(event) => {
            setTitle(event.target.value);
            touched();
          }}
        />
        {fieldError ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldError}
          </p>
        ) : null}
      </div>

      {editor ? <EditorToolbar editor={editor} /> : <Skeleton className="h-11 w-full rounded-lg" aria-hidden />}

      <EditorContent
        editor={editor}
        className="reader-text min-h-[50vh] rounded-lg border bg-card p-4 text-card-foreground [&_.ProseMirror]:min-h-[45vh] [&_.ProseMirror]:outline-none [&_.ProseMirror>*+*]:mt-[1em] [&_h2]:text-xl [&_h2]:font-semibold [&_hr]:my-6 [&_hr]:border-border [&_figure]:rounded-md [&_figure]:border [&_figure]:border-dashed [&_figure]:p-6"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t.words(formatCount(words, locale))}
          {dirty ? ` · ${t.unsaved}` : ""}
        </p>
        <Button type="button" onClick={submit} disabled={save.isPending || !editor}>
          {save.isPending ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
