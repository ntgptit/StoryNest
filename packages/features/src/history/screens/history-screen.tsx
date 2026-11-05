"use client";

import { FileQuestion, History } from "lucide-react";
import { useId, useRef, useState } from "react";
import { formatCount, formatRelativeTime } from "@storynest/utils";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Label } from "@storynest/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Switch } from "@storynest/ui/components/switch";
import { cn } from "@storynest/ui/lib/utils";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { ChangeStepper, FoldRow, FoldToggle } from "@storynest/ui/widgets/diff-folds";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useChapterDraft } from "../../editor/index.ts";
import { BlockView, type ReaderBlock } from "../../reader/index.ts";
import { useChapterVersions, useRestoreVersion, useVersionBlocks } from "../hooks/use-history.ts";
import {
  DIFF_STATUS,
  bodyToReaderBlocks,
  diffBlocks,
  groupDiff,
  hasDifferences,
  historyErrorMessage,
  summarizeDiff,
  type ChapterVersion,
  type DiffEntry,
} from "../model/history.ts";
import { historyText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = historyText;
const DRAFT = "draft";

/** Published versions of one chapter: read them, compare them with the draft or each other, restore one into the draft. */
export function HistoryScreen({
  storyId,
  chapterId,
  imageUrlFor,
  locale = currentLocale(),
}: {
  storyId: string;
  chapterId: string;
  imageUrlFor?: ((key: string) => string) | undefined;
  locale?: string;
}) {
  const draft = useChapterDraft(chapterId);
  const versions = useChapterVersions(chapterId);

  if (draft.isPending || versions.isPending) return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" aria-busy />;
  if (draft.isError || versions.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => {
          void draft.refetch();
          void versions.refetch();
        }}
      />
    );
  }
  if (!draft.data || draft.data.storyId !== storyId) {
    return <EmptyState icon={FileQuestion} title={t.notFound.title} description={t.notFound.description} />;
  }

  return (
    <HistoryContent
      storyId={storyId}
      chapterId={chapterId}
      chapterTitle={draft.data.title}
      draftBlocks={bodyToReaderBlocks(draft.data.body)}
      versions={versions.data}
      imageUrlFor={imageUrlFor}
      locale={locale}
    />
  );
}

function HistoryContent({
  storyId,
  chapterId,
  chapterTitle,
  draftBlocks,
  versions,
  imageUrlFor,
  locale,
}: {
  storyId: string;
  chapterId: string;
  chapterTitle: string;
  draftBlocks: ReaderBlock[];
  versions: ChapterVersion[];
  imageUrlFor?: ((key: string) => string) | undefined;
  locale: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(versions[0]?.id ?? null);
  const selected = versions.find((version) => version.id === selectedId) ?? null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description(chapterTitle || t.untitled)} />
      <AppLink
        href={`/studio/story/${storyId}/chapter/${chapterId}`}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t.backToEditor}
      </AppLink>

      {versions.length === 0 ? (
        <EmptyState icon={History} title={t.empty.title} description={t.empty.description} />
      ) : (
        <>
          <ol aria-label={t.listLabel} className="flex flex-col gap-2">
            {versions.map((version) => (
              <li key={version.id}>
                <button
                  type="button"
                  aria-pressed={version.id === selectedId}
                  onClick={() => setSelectedId(version.id)}
                  className="flex w-full flex-col gap-1 rounded-xl border bg-card p-3 text-left text-card-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-accent"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{t.versionLabel(version.number)}</span>
                    {version.live ? <Badge>{t.live}</Badge> : null}
                  </span>
                  <span className="truncate text-sm">{version.title || t.untitled}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.words(formatCount(version.wordCount, locale))}
                    {version.publishedAt ? ` · ${t.publishedAt(formatRelativeTime(version.publishedAt, locale))}` : ""}
                    {version.authorName ? ` · ${t.by(version.authorName)}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {selected ? (
            <VersionViewer
              key={selected.id}
              chapterId={chapterId}
              storyId={storyId}
              version={selected}
              versions={versions}
              draftBlocks={draftBlocks}
              imageUrlFor={imageUrlFor}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t.select}</p>
          )}
        </>
      )}
    </div>
  );
}

function VersionViewer({
  chapterId,
  storyId,
  version,
  versions,
  draftBlocks,
  imageUrlFor,
}: {
  chapterId: string;
  storyId: string;
  version: ChapterVersion;
  versions: ChapterVersion[];
  draftBlocks: ReaderBlock[];
  imageUrlFor?: ((key: string) => string) | undefined;
}) {
  const toast = useAppToast();
  const blocks = useVersionBlocks(version.id);
  const [mode, setMode] = useState<"content" | "compare">("content");
  const [base, setBase] = useState<string>(DRAFT);
  const baseVersion = versions.find((candidate) => candidate.id === base) ?? null;
  const baseBlocks = useVersionBlocks(baseVersion ? baseVersion.id : null);
  const restore = useRestoreVersion(chapterId);
  const [confirming, setConfirming] = useState(false);
  const [restored, setRestored] = useState(false);

  if (blocks.isPending) return <Skeleton className="h-64 w-full rounded-xl" aria-busy />;
  if (blocks.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => blocks.refetch()}
      />
    );
  }

  const baseLabel = baseVersion ? t.compare.version(baseVersion.number) : t.compare.draft;
  const baseContent = baseVersion ? baseBlocks.data : draftBlocks;
  const diff = baseContent ? diffBlocks(baseContent, blocks.data) : null;

  return (
    <section aria-label={t.viewerLabel(version.number)} className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group">
          {(["content", "compare"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? "default" : "outline"}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {t.view[value]}
            </Button>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
          {t.restore.action}
        </Button>
      </div>

      {restored ? (
        <p role="status" className="flex flex-wrap items-center gap-2 text-sm">
          {t.restore.done}
          <AppLink
            href={`/studio/story/${storyId}/chapter/${chapterId}`}
            className="font-medium underline underline-offset-4"
          >
            {t.restore.openEditor}
          </AppLink>
        </p>
      ) : null}

      {mode === "compare" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare-base">{t.compare.against}</Label>
            <Select value={base} onValueChange={setBase}>
              <SelectTrigger id="compare-base" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DRAFT}>{t.compare.draft}</SelectItem>
                {versions
                  .filter((candidate) => candidate.id !== version.id)
                  .map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {t.compare.version(candidate.number)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {diff === null ? (
            <Skeleton className="h-32 w-full rounded-lg" aria-busy />
          ) : (
            <DiffView
              key={base}
              diff={diff}
              caption={t.compare.caption(version.number, baseLabel)}
              imageUrlFor={imageUrlFor}
            />
          )}
        </div>
      ) : blocks.data.length === 0 ? (
        <p className="text-muted-foreground">{t.emptyVersion}</p>
      ) : (
        <article className="reader-text flex flex-col gap-[1em]">
          <h2 className="text-xl font-semibold tracking-tight">{version.title}</h2>
          {blocks.data.map((block) => (
            <BlockView key={block.id} block={block} imageUrlFor={imageUrlFor} />
          ))}
        </article>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.restore.title}
        description={t.restore.description}
        confirmLabel={t.restore.confirm}
        cancelLabel={t.restore.cancel}
        onConfirm={async () => {
          try {
            await restore.mutateAsync({ title: version.title, blocks: blocks.data });
            setRestored(true);
            toast.success(t.restore.done);
          } catch (error) {
            toast.error(historyErrorMessage(error as Parameters<typeof historyErrorMessage>[0]));
            throw error;
          }
        }}
      />
    </section>
  );
}

const STATUS_STYLE: Record<DiffEntry["status"], string> = {
  same: "",
  added: "border-l-4 border-primary pl-3",
  changed: "border-l-4 border-primary/50 pl-3",
  removed: "border-l-4 border-destructive pl-3 opacity-70 line-through",
};

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * The comparison. "Only show changes" folds every run of unchanged paragraphs into one "N unchanged paragraphs" row
 * that opens on its own; previous / next change step through the changes (a change is one or more changed blocks in a
 * row), scrolling each into view and moving focus to it. Nothing is restored from here: restore takes a whole version.
 */
function DiffView({
  diff,
  caption,
  imageUrlFor,
}: {
  diff: DiffEntry[];
  caption: string;
  imageUrlFor?: ((key: string) => string) | undefined;
}) {
  const baseId = useId();
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const [current, setCurrent] = useState(-1);
  const changeRefs = useRef(new Map<number, HTMLElement>());

  const summary = summarizeDiff(diff);
  if (!hasDifferences(summary)) return <p className="text-sm text-muted-foreground">{t.compare.identical}</p>;

  const segments = groupDiff(diff);
  const total = segments.filter((segment) => segment.kind === "change").length;

  const step = (index: number) => {
    const target = changeRefs.current.get(index);
    if (!target) return;
    setCurrent(index);
    target.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
  };

  const toggle = (key: string) =>
    setOpened((now) => {
      const next = new Set(now);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const entryView = (entry: DiffEntry) => (
    <>
      {entry.status === DIFF_STATUS.SAME ? null : (
        <Badge variant={entry.status === DIFF_STATUS.REMOVED ? "destructive" : "secondary"} className="mb-1">
          {t.compare[entry.status]}
        </Badge>
      )}
      <BlockView block={entry.block} imageUrlFor={imageUrlFor} />
      {entry.previous && (entry.previous.type === "paragraph" || entry.previous.type === "heading") ? (
        <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground line-through">
          <span className="sr-only">{t.compare.before} </span>
          {entry.previous.text}
        </p>
      ) : null}
    </>
  );

  // Spacing sits inside each item (pt-[1em], the list pulls the first one up): a folded item must leave no gap behind.
  const items = segments.flatMap((segment) => {
    if (segment.kind === "same") {
      const folded = onlyChanges && !opened.has(segment.key);
      const ids = segment.entries.map((_, index) => `${baseId}-${segment.key}-${index}`);
      const rows = segment.entries.map((entry, index) => (
        <FoldRow key={`${entry.status}-${entry.block.id}`} id={ids[index]} folded={folded}>
          <div className="pt-[1em]">{entryView(entry)}</div>
        </FoldRow>
      ));
      return onlyChanges
        ? [
            <li key={`fold-${segment.key}`}>
              <div className="pt-[1em]">
                <FoldToggle expanded={!folded} controls={ids.join(" ")} onToggle={() => toggle(segment.key)}>
                  {folded
                    ? t.compare.unchanged(segment.entries.length)
                    : t.compare.hideUnchanged(segment.entries.length)}
                </FoldToggle>
              </div>
            </li>,
            ...rows,
          ]
        : rows;
    }
    const isCurrent = segment.index === current;
    return segment.entries.map((entry, index) => (
      <li key={`${entry.status}-${entry.block.id}`}>
        <div className="pt-[1em]">
          <div
            ref={
              index === 0
                ? (element) => {
                    if (element) changeRefs.current.set(segment.index, element);
                    else changeRefs.current.delete(segment.index);
                  }
                : undefined
            }
            tabIndex={index === 0 ? -1 : undefined}
            data-current={isCurrent || undefined}
            className={cn(
              STATUS_STYLE[entry.status],
              "rounded-r-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[current]:bg-accent/60",
              index === 0 && "motion-safe:data-[current]:animate-hunk-nudge",
            )}
          >
            {entryView(entry)}
          </div>
        </div>
      </li>
    ));
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{caption}</p>
      <p className="text-sm font-medium" aria-live="polite">
        {t.compare.summary(summary.added, summary.removed, summary.changed)}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={onlyChanges}
            onCheckedChange={(checked) => {
              setOnlyChanges(checked);
              setOpened(new Set());
            }}
          />
          {t.compare.onlyChanges}
        </label>
        <ChangeStepper
          current={current}
          total={total}
          status={current < 0 ? t.compare.changeCount(total) : t.compare.changePosition(current + 1, total)}
          previousLabel={t.compare.previousChange}
          nextLabel={t.compare.nextChange}
          onStep={step}
        />
      </div>
      <ul aria-label={t.view.compare} className="reader-text -mt-[1em] flex flex-col">
        {items}
      </ul>
    </div>
  );
}
