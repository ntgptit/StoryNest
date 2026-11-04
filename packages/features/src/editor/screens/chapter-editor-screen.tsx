"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { FileQuestion } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCount, formatRelativeTime } from "@storynest/utils";
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
import { PublishPanel } from "../components/publish-panel.tsx";
import { useChapterDraft, useSaveChapterDraft } from "../hooks/use-chapter-draft.ts";
import { createAutosaver, type Autosaver, type AutosaveStatus, type SaveOutcome } from "../model/autosaver.ts";
import { bodyToDoc, type EditorNode } from "../model/body-converter.ts";
import { checkDraft, isDraftConflict, wordCountOf } from "../model/draft-form.ts";
import { editorExtensions } from "../model/extensions.ts";
import { clearBackup, differsFromServer, readBackup, writeBackup, type DraftBackup } from "../model/local-backup.ts";
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
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const revision = useRef(draft.revision);
  const titleRef = useRef(title);
  titleRef.current = title;
  // Counts every change; a save only counts as "everything saved" if nothing changed while it was running.
  const edits = useRef(0);
  const savedEdits = useRef(0);
  const [unsaved, setUnsaved] = useState(false);
  // Text typed on this device that never reached the server (lost connection, closed tab, a conflict).
  const [backup, setBackup] = useState<DraftBackup | null>(() => {
    const stored = readBackup(draft.chapterId);
    return stored && differsFromServer(stored, draft) ? stored : null;
  });
  const backupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorRef = useRef<Editor | null>(null);
  // The Save button asks for a confirmation toast; background autosaves stay quiet (the footer shows their status).
  const manualSave = useRef(false);

  const snapshot = useCallback(() => {
    const current = editorRef.current;
    return current ? checkDraft(titleRef.current, current.getJSON() as EditorNode) : null;
  }, []);

  const writeLocalBackup = useCallback(() => {
    const checked = snapshot();
    if (checked?.ok) {
      writeBackup(draft.chapterId, {
        baseRevision: revision.current,
        title: checked.title,
        body: checked.body,
        savedAt: new Date().toISOString(),
      });
    }
  }, [draft.chapterId, snapshot]);

  /** One save attempt with what is on screen now. Throws on a failure worth retrying (offline, server error). */
  const saveOnce = useCallback(async (): Promise<SaveOutcome> => {
    const checked = snapshot();
    if (!checked) return "saved";
    if (!checked.ok) {
      manualSave.current = false;
      setFieldError(checked.message);
      return "invalid";
    }
    setFieldError(null);
    const sentEdits = edits.current;
    try {
      const next = await save.mutateAsync({
        title: checked.title,
        body: checked.body,
        expectedRevision: revision.current,
      });
      revision.current = next;
      savedEdits.current = Math.max(savedEdits.current, sentEdits);
      const clean = edits.current === savedEdits.current;
      setUnsaved(!clean);
      if (clean) clearBackup(draft.chapterId);
      if (manualSave.current) toast.success(t.saved);
      manualSave.current = false;
      return "saved";
    } catch (error) {
      manualSave.current = false;
      if (isDraftConflict(error as Parameters<typeof isDraftConflict>[0])) {
        writeLocalBackup(); // what the author typed survives the reload that resolves the conflict
        return "conflict";
      }
      throw error;
    }
  }, [draft.chapterId, save, snapshot, toast, writeLocalBackup]);

  const saveOnceRef = useRef(saveOnce);
  saveOnceRef.current = saveOnce;
  // Created in an effect, not in render: React (Strict Mode in development) runs effect cleanups and then the effects
  // again on the same component, and a disposed autosaver would stay dead after that.
  const autosaver = useRef<Autosaver | null>(null);
  useEffect(() => {
    const created = createAutosaver({ save: () => saveOnceRef.current(), onStatus: setStatus });
    autosaver.current = created;
    return () => {
      created.dispose();
      autosaver.current = null;
    };
  }, []);

  const touched = useCallback(() => {
    edits.current += 1;
    setUnsaved(true);
    autosaver.current?.markDirty();
    clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(writeLocalBackup, 500);
  }, [writeLocalBackup]);

  const editor = useEditor({
    extensions: editorExtensions(),
    content: bodyToDoc(draft.body),
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": t.bodyLabel, role: "textbox", "aria-multiline": "true" } },
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
      onEditor?.(created);
    },
    onUpdate: ({ editor: updated }) => {
      touched();
      setWords(wordCountOf(updated.getJSON() as EditorNode));
    },
    onDestroy: () => {
      editorRef.current = null;
      onEditor?.(null);
    },
  });

  // Never lose a typed change silently: warn on leaving, save when the tab is hidden, retry when the network returns.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (edits.current === savedEdits.current) return;
      writeLocalBackup();
      event.preventDefault();
      event.returnValue = t.leaveWarning;
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden" && edits.current !== savedEdits.current) {
        writeLocalBackup();
        void autosaver.current?.saveNow();
      }
    };
    const onOnline = () => autosaver.current?.retryNow();
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("online", onOnline);
      clearTimeout(backupTimer.current);
      if (edits.current !== savedEdits.current) writeLocalBackup(); // leaving inside the app keeps the text too
    };
  }, [writeLocalBackup]);

  const restoreBackup = () => {
    if (!backup || !editor) return;
    setTitle(backup.title);
    titleRef.current = backup.title;
    editor.commands.setContent(bodyToDoc(backup.body), { emitUpdate: true });
    setBackup(null);
    touched();
    toast.success(t.backup.restored);
  };

  /** The revision to publish: unsaved text is saved first; null when that did not work (invalid, conflict, offline). */
  const ensureSaved = async (): Promise<number | null> => {
    if (edits.current !== savedEdits.current) await autosaver.current?.saveNow();
    const clean = edits.current === savedEdits.current;
    return clean ? revision.current : null;
  };

  const onSaveClick = () => {
    manualSave.current = true;
    void autosaver.current?.saveNow();
  };

  const conflict = status === "conflict";
  const statusText = t.status[status];

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AppLink
          href={`/studio/story/${storyId}/chapters`}
          className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t.backToChapters}
        </AppLink>
        <div className="flex gap-1.5">
          <Button asChild size="sm" variant="outline">
            <AppLink href={`/studio/story/${storyId}/chapter/${draft.chapterId}/preview`}>{t.links.preview}</AppLink>
          </Button>
          <Button asChild size="sm" variant="outline">
            <AppLink href={`/studio/story/${storyId}/chapter/${draft.chapterId}/history`}>{t.links.history}</AppLink>
          </Button>
        </div>
      </div>

      {backup ? (
        <div role="status" className="flex flex-col gap-2 rounded-md border bg-card p-3 text-sm">
          <p className="font-medium">{t.backup.title}</p>
          <p className="text-muted-foreground">
            {t.backup.description(formatRelativeTime(backup.savedAt, locale))}
            {backup.baseRevision < draft.revision ? ` ${t.backup.olderBase}` : ""}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={restoreBackup} disabled={!editor}>
              {t.backup.restore}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                clearBackup(draft.chapterId);
                setBackup(null);
              }}
            >
              {t.backup.discard}
            </Button>
          </div>
        </div>
      ) : null}

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
            titleRef.current = event.target.value;
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

      <PublishPanel chapterId={draft.chapterId} locale={locale} ensureSaved={ensureSaved} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t.words(formatCount(words, locale))}
          {statusText !== "" ? ` · ${statusText}` : unsaved ? ` · ${t.unsaved}` : ""}
        </p>
        <Button type="button" onClick={onSaveClick} disabled={status === "saving" || !editor}>
          {status === "saving" ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
