"use client";

import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import { Columns2, FileQuestion } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { formatCount, formatRelativeTime } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { AutosaveIcon, type AutosaveIconState } from "@storynest/ui/widgets/autosave-icon";
import { DropZone } from "@storynest/ui/widgets/drop-zone";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InlineAlert } from "@storynest/ui/widgets/inline-alert";
import { SplitPane, useMinWidth } from "@storynest/ui/widgets/split-pane";
import { SpotlightTour, type TourStep } from "@storynest/ui/widgets/spotlight-tour";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import type { ChapterDraft } from "../api/draft.api.ts";
import { chapterImageUrl } from "../api/images.api.ts";
import { DraftMergeView } from "../components/draft-merge-view.tsx";
import { EditorToolbar } from "../components/editor-toolbar.tsx";
import { FindReplacePanel } from "../components/find-replace-panel.tsx";
import { PublishPanel } from "../components/publish-panel.tsx";
import { EditLockPanel } from "../components/edit-lock-panel.tsx";
import { ReviewPanel } from "../components/review-panel.tsx";
import { useChapterDraft, useSaveChapterDraft } from "../hooks/use-chapter-draft.ts";
import { useUploadChapterImage } from "../hooks/use-chapter-image.ts";
import { createAutosaver, type Autosaver, type AutosaveStatus, type SaveOutcome } from "../model/autosaver.ts";
import { NODE, STORAGE_KEY_ATTRIBUTE, bodyToDoc, type EditorNode } from "../model/body-converter.ts";
import { imageErrorMessage } from "../model/image-messages.ts";
import { pastedImage } from "../model/pasted-image.ts";
import { checkBody, checkDraft, checkTitle, isDraftConflict, wordCountOf } from "../model/draft-form.ts";
import { editorExtensions } from "../model/extensions.ts";
import { clearBackup, differsFromServer, readBackup, writeBackup, type DraftBackup } from "../model/local-backup.ts";
import {
  SPLIT_DEFAULT,
  SPLIT_MAX,
  SPLIT_MIN,
  isTourDone,
  markTourDone,
  readSplitPrefs,
  writeSplitPrefs,
  type SplitPrefs,
} from "../model/workspace-prefs.ts";
import { editorText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";
import { ChapterPreviewArticle } from "../../_shared/chapter-preview.tsx";
import { bodyToReaderBlocks } from "../../_shared/block-diff.ts";
import type { ChapterBody } from "@storynest/validation";

/** From this window width up the editor can show the live preview beside it (Tailwind's lg). */
const SPLIT_MIN_WINDOW = 1024;

/** How each autosave status looks in the footer cloud icon. */
const AUTOSAVE_ICON: Record<AutosaveStatus, AutosaveIconState> = {
  idle: "idle",
  dirty: "pending",
  saving: "saving",
  saved: "saved",
  error: "failed",
  conflict: "failed",
  invalid: "failed",
};

const t = editorText;

/** Editor for one chapter's draft: title, formatted text, word count, and a save that never overwrites newer work. */
export function ChapterEditorScreen({
  storyId,
  chapterId,
  onEditor,
  locale = currentLocale(),
  firstRunTour = false,
  teamTools = false,
}: {
  storyId: string;
  chapterId: string;
  /** Hands the editor instance to the host (tests, shortcuts); not needed to use the screen. */
  onEditor?: ((editor: Editor | null) => void) | undefined;
  locale?: string;
  /** Offer the short guided tour on this device's first visit (the app turns it on; off in embeds and tests). */
  firstRunTour?: boolean;
  /**
   * Show the team tools: who is editing (advisory edit lock with hand-over, Lucian 196) and the draft sign-off
   * (Lucian 180). The app turns them on; embeds and tests leave them off.
   */
  teamTools?: boolean;
}) {
  const draft = useChapterDraft(chapterId);
  // Bumped to throw the editor away and start again from the saved draft (after a conflict).
  const [session, setSession] = useState(0);
  // The reload was asked for to merge: the fresh editor opens the merge of the kept copy with the new draft.
  const [mergeOnOpen, setMergeOnOpen] = useState(false);

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
        onRetry={() => draft.refetch()}
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
      firstRunTour={firstRunTour}
      teamTools={teamTools}
      startMerge={mergeOnOpen}
      onReload={async (options) => {
        await draft.refetch();
        setMergeOnOpen(options?.merge === true);
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
  startMerge = false,
  firstRunTour,
  teamTools,
}: {
  draft: ChapterDraft;
  storyId: string;
  locale: string;
  onEditor?: ((editor: Editor | null) => void) | undefined;
  /** `merge`: open the merge view on the fresh draft (when this device kept a copy that differs). */
  onReload: (options?: { merge?: boolean }) => Promise<void>;
  startMerge?: boolean;
  firstRunTour: boolean;
  teamTools: boolean;
}) {
  const toast = useAppToast();
  const save = useSaveChapterDraft(draft.chapterId);
  const [title, setTitle] = useState(draft.title);
  // The document on screen, after every change: word count, the publish checklist and the live preview follow it.
  const [doc, setDoc] = useState<EditorNode>(() => bodyToDoc(draft.body));
  const words = useMemo(() => wordCountOf(doc), [doc]);
  const settledDoc = useDeferredValue(doc);
  const bodyCheck = useMemo(() => checkBody(settledDoc), [settledDoc]);
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
  const [merging, setMerging] = useState(() => startMerge && backup !== null);
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

  // Pictures show from their public address, which the client builds (no request). No client: an empty frame.
  const getClient = useDataClientGetter();
  const imageUrl = useCallback(
    (key: string) => {
      try {
        return chapterImageUrl(getClient(), key);
      } catch {
        return null;
      }
    },
    [getClient],
  );
  const imageUpload = useUploadChapterImage(storyId);
  /** The latest insertImage, for the editor's drop/paste handlers (set once, when the editor is created). */
  const insertImageRef = useRef<(file: File) => void>(() => undefined);

  const editor = useEditor({
    extensions: editorExtensions({ imageUrl }),
    content: bodyToDoc(draft.body),
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": t.bodyLabel, role: "textbox", "aria-multiline": "true" },
      // A picture dropped or pasted into the text goes through the same upload as the toolbar button (Lucian 032).
      handleDrop: (view, event, _slice, moved) => {
        const file = moved ? undefined : event.dataTransfer?.files[0];
        if (!file) return false;
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (at) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at.pos))));
        insertImageRef.current(file);
        return true;
      },
      handlePaste: (_view, event) => {
        const file = pastedImage(event);
        if (!file) return false;
        insertImageRef.current(file);
        return true;
      },
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
      onEditor?.(created);
    },
    onUpdate: ({ editor: updated }) => {
      touched();
      setDoc(updated.getJSON() as EditorNode);
    },
    onDestroy: () => {
      editorRef.current = null;
      onEditor?.(null);
    },
  });

  const insertImage = (file: File) =>
    imageUpload.mutate(file, {
      onSuccess: (key) =>
        editor
          ?.chain()
          .focus()
          .insertContent({ type: NODE.image, attrs: { [STORAGE_KEY_ATTRIBUTE]: key } })
          .run(),
      onError: (error) => toast.error(imageErrorMessage(error)),
    });

  insertImageRef.current = insertImage;

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

  /** Puts a title and body in the editor as an ordinary edit: autosave saves it against the current revision. */
  const loadContent = (next: { title: string; body: ChapterDraft["body"] }) => {
    if (!editor) return false;
    setTitle(next.title);
    titleRef.current = next.title;
    editor.commands.setContent(bodyToDoc(next.body), { emitUpdate: true });
    setBackup(null);
    setMerging(false);
    touched();
    return true;
  };

  const restoreBackup = () => {
    if (backup && loadContent(backup)) toast.success(t.backup.restored);
  };

  const applyMergedVersion = (merged: { title: string; body: ChapterDraft["body"] }) => {
    if (loadContent(merged)) toast.success(t.merge.applied);
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

  // Side-by-side live preview (wide windows only), remembered on this device.
  const wide = useMinWidth(SPLIT_MIN_WINDOW);
  const [workspace, setWorkspace] = useState<SplitPrefs>({ on: false, split: SPLIT_DEFAULT });
  useEffect(() => setWorkspace(readSplitPrefs()), []);
  const updateWorkspace = (next: SplitPrefs) => {
    setWorkspace(next);
    writeSplitPrefs(next);
  };
  const splitView = wide && workspace.on;
  // The last body that converts cleanly: the preview keeps showing it while a part that cannot be saved is on screen.
  const lastGoodBody = useRef<ChapterBody>(draft.body);
  if (bodyCheck.ok) lastGoodBody.current = bodyCheck.body;
  const previewBlocks = useMemo(
    () => (splitView ? bodyToReaderBlocks(bodyCheck.ok ? bodyCheck.body : lastGoodBody.current) : []),
    [splitView, bodyCheck],
  );

  // First-run tour: once per device, after the editor is ready; finishing or skipping both end it for good.
  const rootRef = useRef<HTMLDivElement>(null);
  const [touring, setTouring] = useState(false);
  useEffect(() => {
    if (firstRunTour && editor && !isTourDone()) setTouring(true);
  }, [firstRunTour, editor]);
  const find = (selector: string) => () => rootRef.current?.querySelector(selector) ?? null;
  const tourSteps: TourStep[] = [
    { id: "toolbar", target: find('[role="toolbar"]'), title: t.tour.toolbar.title, body: t.tour.toolbar.body },
    {
      id: "autosave",
      target: find('[data-tour="autosave"]'),
      title: t.tour.autosave.title,
      body: t.tour.autosave.body,
    },
    { id: "publish", target: find('[data-tour="publish"]'), title: t.tour.publish.title, body: t.tour.publish.body },
    { id: "find", target: find('[data-tool="find"]'), title: t.tour.find.title, body: t.tour.find.body },
  ];

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <AppLink
        href={`/studio/story/${storyId}/chapters`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t.backToChapters}
      </AppLink>
      <div className="flex gap-1.5">
        {wide ? (
          <Button
            type="button"
            size="sm"
            variant={workspace.on ? "secondary" : "outline"}
            aria-pressed={workspace.on}
            onClick={() => updateWorkspace({ ...workspace, on: !workspace.on })}
          >
            <Columns2 aria-hidden className="size-4" />
            {t.livePreview.toggle}
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <AppLink href={`/studio/story/${storyId}/chapter/${draft.chapterId}/preview`}>{t.links.preview}</AppLink>
        </Button>
        <Button asChild size="sm" variant="outline">
          <AppLink href={`/studio/story/${storyId}/chapter/${draft.chapterId}/history`}>{t.links.history}</AppLink>
        </Button>
      </div>
    </div>
  );

  const column = (
    <div className="flex min-w-0 flex-col gap-4">
      {teamTools ? <EditLockPanel chapterId={draft.chapterId} /> : null}
      {backup && merging ? (
        <DraftMergeView mine={backup} server={draft} onApply={applyMergedVersion} onCancel={() => setMerging(false)} />
      ) : backup ? (
        <InlineAlert
          title={t.backup.title}
          actions={
            <>
              <Button type="button" size="sm" onClick={restoreBackup} disabled={!editor}>
                {t.backup.restore}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setMerging(true)} disabled={!editor}>
                {t.merge.open}
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
            </>
          }
        >
          {t.backup.description(formatRelativeTime(backup.savedAt, locale))}
          {backup.baseRevision < draft.revision ? ` ${t.backup.olderBase}` : ""}
        </InlineAlert>
      ) : null}

      {conflict ? (
        // Not dismissable: the draft cannot be saved again until it is reloaded or merged.
        <InlineAlert
          tone="danger"
          title={t.conflict.title}
          actions={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => void onReload()}>
                {t.conflict.reload}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void onReload({ merge: true })}>
                {t.merge.conflictOpen}
              </Button>
            </>
          }
        >
          {t.conflict.description}
        </InlineAlert>
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

      {editor ? (
        <>
          <EditorToolbar editor={editor} onImage={insertImage} imageBusy={imageUpload.isPending} />
          <FindReplacePanel editor={editor} />
        </>
      ) : (
        <Skeleton className="h-11 w-full rounded-lg" aria-hidden />
      )}

      {/* Highlights while a file is dragged over the text; the editor's handleDrop inserts it where it lands. */}
      <DropZone
        label={t.toolbar.imageDrop}
        disabled={imageUpload.isPending}
        onFiles={(files) => insertImage(files[0]!)}
      >
        <EditorContent
          editor={editor}
          className="reader-text min-h-[50vh] rounded-lg border bg-card p-4 text-card-foreground [&_.ProseMirror]:min-h-[45vh] [&_.ProseMirror]:outline-none [&_.ProseMirror>*+*]:mt-[1em] [&_h2]:text-xl [&_h2]:font-semibold [&_hr]:my-6 [&_hr]:border-border [&_figure]:min-h-16 [&_figure]:rounded-md [&_figure]:border [&_figure]:border-dashed [&_figure]:p-2 [&_figure_img]:mx-auto [&_figure_img]:max-h-[60vh] [&_figure_img]:rounded-sm [&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-ring [&_.find-match]:rounded-xs [&_.find-match]:bg-primary/15 [&_.find-match-current]:bg-primary/35 [&_.find-match-current]:ring-1 [&_.find-match-current]:ring-primary [&_.find-replaced]:animate-replace-flash"
        />
      </DropZone>

      <div data-tour="publish">
        <PublishPanel
          chapterId={draft.chapterId}
          locale={locale}
          ensureSaved={ensureSaved}
          draft={{ title: checkTitle(title), body: bodyCheck }}
        />
      </div>

      {teamTools ? (
        <ReviewPanel chapterId={draft.chapterId} ensureSaved={ensureSaved} currentRevision={revision.current} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          data-tour="autosave"
          className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {t.words(formatCount(words, locale))}
          {statusText !== "" || unsaved ? (
            // Spaces keep the announced text "N words · status"; in the flex row they collapse and the gap spaces it.
            <>
              {" "}
              <span aria-hidden>·</span> <AutosaveIcon state={statusText !== "" ? AUTOSAVE_ICON[status] : "pending"} />{" "}
              {statusText !== "" ? statusText : t.unsaved}
            </>
          ) : null}
        </p>
        <Button type="button" onClick={onSaveClick} disabled={status === "saving" || !editor}>
          {status === "saving" ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );

  const tour = touring ? (
    <SpotlightTour
      steps={tourSteps}
      labels={{
        dialog: t.tour.dialog,
        next: t.tour.next,
        back: t.tour.back,
        done: t.tour.done,
        skip: t.tour.skip,
        progress: t.tour.progress,
      }}
      onEnd={() => {
        markTourDone();
        setTouring(false);
      }}
    />
  ) : null;

  if (!splitView) {
    return (
      <div ref={rootRef} className="flex max-w-3xl flex-col gap-4">
        {header}
        {column}
        {tour}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      {header}
      <SplitPane
        value={workspace.split}
        defaultValue={SPLIT_DEFAULT}
        min={SPLIT_MIN}
        max={SPLIT_MAX}
        onValueChange={(split) => updateWorkspace({ ...workspace, split })}
        separatorLabel={t.livePreview.divider}
        start={column}
        end={
          <section
            aria-label={t.livePreview.region}
            className="@container sticky top-below-header flex max-h-[calc(100dvh-var(--app-header-offset,0px)-2rem)] flex-col overflow-y-auto rounded-lg border bg-background"
          >
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">{t.livePreview.note}</p>
            <ChapterPreviewArticle
              title={title.trim()}
              blocks={previewBlocks}
              emptyText={t.livePreview.empty}
              imageUrlFor={(key) => imageUrl(key) ?? ""}
              contained
              className="px-4"
            />
          </section>
        }
      />
      {tour}
    </div>
  );
}
