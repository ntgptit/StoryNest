"use client";

import { Eraser, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCount } from "@storynest/utils";
import { HIGHLIGHT_STYLES, type HighlightStyle } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@storynest/ui/components/sheet";
import { CopyLinkButton } from "@storynest/ui/widgets/copy-link-button";
import { DetentSheetContent } from "@storynest/ui/widgets/detent-sheet";
import { SelectionToolbar, useBlockSelection } from "@storynest/ui/widgets/selection-toolbar";
import { CommentThread, commentText, useBlockCommentCounts } from "../../comments/index.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { blockAnchor, type ReaderBlock } from "../model/chapter.ts";
import { useFocusedBlock, useReaderFocusMode } from "../hooks/use-reader-focus.ts";
import { useAddHighlight, useMyHighlights, useRemoveHighlights } from "../hooks/use-highlights.ts";
import { highlightRange, highlightsByBlock, overlapping } from "../model/highlights.ts";
import { readerText } from "../strings.ts";
import { BlockView } from "./block-view.tsx";
import { currentLocale } from "../../_shared/i18n.ts";

const EXCERPT_LENGTH = 120;
/** After a copy the check shows for a moment before the quote tools go away (the element's 700ms). */
const HIDE_AFTER_COPY_MS = 700;

function excerptOf(block: ReaderBlock): string {
  if (block.type !== "paragraph" && block.type !== "heading") return "";
  const text = block.text.trim();
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
}

/** The block the reader landed on (deep link or resume) and how many landings there have been. */
export interface Landing {
  blockId: string;
  count: number;
}

/**
 * The blocks of a chapter, each text block with a small button at the end that opens that paragraph's comments in a
 * bottom sheet with three heights (the count beside the icon when there are any). One counts query serves the whole
 * chapter. Also:
 *  - selecting text inside one paragraph shows quote tools: copy the quote with a link to the paragraph
 *    (`quoteText`; without it there are no quote tools), or open that paragraph's comments;
 *  - opening the chapter on a block's anchor (`#b-<id>`) reports it to `onLand`, and the `landing` block's text gets
 *    a highlighter sweep;
 *  - focus mode (a device setting) dims every block but the one at the reading line;
 *  - a signed-in reader can mark the selected words with a pen (underline, circle, box, strike; Lucian 392). The marks
 *    are private (only the reader sees them), drawn stroke by stroke when made, and a mark whose paragraph the author
 *    has since changed is not drawn (the server says it is stale); "Delete old marks" clears those.
 */
export function ReaderBlocks({
  chapterId,
  blocks,
  imageUrlFor,
  locale = currentLocale(),
  landing = null,
  onLand,
  quoteText,
}: {
  chapterId: string;
  blocks: readonly ReaderBlock[];
  imageUrlFor?: ((key: string) => string) | undefined;
  locale?: string;
  landing?: Landing | null;
  onLand?: ((blockId: string) => void) | undefined;
  /** The text "Copy quote" puts on the clipboard for `quote` selected in block `blockId`. */
  quoteText?: ((quote: string, blockId: string) => string) | undefined;
}) {
  const counts = useBlockCommentCounts(chapterId);
  const toast = useAppToast();
  const [open, setOpen] = useState<ReaderBlock | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const { selection, clear } = useBlockSelection(container, toolbar);
  const focus = useReaderFocusMode();
  const highlights = useMyHighlights(chapterId);
  const addHighlight = useAddHighlight(chapterId);
  const removeHighlights = useRemoveHighlights(chapterId);
  const [justDrawn, setJustDrawn] = useState<string[]>([]);
  const mine = useMemo(() => highlights.data ?? [], [highlights.data]);
  const marksByBlock = useMemo(() => highlightsByBlock(mine), [mine]);
  const staleIds = useMemo(() => mine.filter((h) => h.stale).map((h) => h.id), [mine]);

  const focusable = useMemo(() => blocks.filter((b) => b.type !== "divider"), [blocks]);
  const anchors = useMemo(() => focusable.map((b) => blockAnchor(b.id)), [focusable]);
  const focusIndex = useFocusedBlock(anchors, focus.on, container);
  const focusedId = focusIndex >= 0 ? (focusable[focusIndex]?.id ?? null) : null;

  // The sheet's content unmounts when it closes, so it starts at its middle height every time.
  const openComments = (block: ReaderBlock) => setOpen(block);

  // A deep link to a block (a reply notification, a shared quote): bring it into view if needed and mark it.
  const latest = useRef({ blocks, onLand });
  latest.current = { blocks, onLand };
  useEffect(() => {
    const land = () => {
      const anchor = decodeURIComponent(window.location.hash.slice(1));
      const block = latest.current.blocks.find((b) => blockAnchor(b.id) === anchor);
      const element = block ? document.getElementById(anchor) : null;
      if (!block || !element) return;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) element.scrollIntoView({ block: "start" });
      latest.current.onLand?.(block.id);
    };
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, []);

  const selected = selection ? blocks.find((b) => b.id === selection.blockId) : undefined;
  const selectedText =
    selected && (selected.type === "paragraph" || selected.type === "heading") ? selected.text : null;
  const range =
    selection && selectedText !== null ? highlightRange(selection.start, selection.end, selectedText.length) : null;
  const under = selection && range ? overlapping(mine, selection.blockId, range.start, range.end) : [];
  const canMark = highlights.signedIn && range !== null;

  const mark = (style: HighlightStyle) => {
    if (!selection || !range) return;
    const blockId = selection.blockId;
    clear();
    addHighlight.mutate(
      { blockId, ...range, style },
      {
        onSuccess: (id) => {
          setJustDrawn([id]);
          toast.success(readerText.highlight.added);
        },
        onError: (error) =>
          toast.error(
            error.kind === "invalid" && error.details === "highlight_limit"
              ? readerText.highlight.limit
              : readerText.highlight.failed,
          ),
      },
    );
  };

  const unmark = (ids: readonly string[], done: string) => {
    clear();
    removeHighlights.mutate(ids, {
      onSuccess: () => toast.success(done),
      onError: () => toast.error(readerText.highlight.failed),
    });
  };

  return (
    <div ref={container} className="flex flex-col gap-[1em]">
      {blocks.map((block) => {
        const count = counts.data?.[block.id] ?? 0;
        const commentable = block.type === "paragraph" || block.type === "heading";
        return (
          <BlockView
            key={block.id}
            block={block}
            imageUrlFor={imageUrlFor}
            highlight={landing?.blockId === block.id ? landing.count : 0}
            marks={marksByBlock[block.id]}
            drawIds={justDrawn}
            dimmed={focusedId !== null && block.id !== focusedId}
            trailing={
              commentable ? (
                <button
                  type="button"
                  aria-label={commentText.inline.open(count)}
                  onClick={() => openComments(block)}
                  className="ml-1.5 inline-flex items-center gap-0.5 rounded align-baseline text-xs text-muted-foreground opacity-50 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <MessageSquare aria-hidden className="size-3.5" />
                  {count > 0 ? <span>{formatCount(count, locale)}</span> : null}
                </button>
              ) : null
            }
          />
        );
      })}
      {staleIds.length > 0 ? (
        <p role="note" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {readerText.highlight.stale(staleIds.length)}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={removeHighlights.isPending}
            onClick={() => unmark(staleIds, readerText.highlight.removed)}
          >
            {readerText.highlight.clearStale}
          </Button>
        </p>
      ) : null}
      {quoteText || highlights.signedIn ? (
        <SelectionToolbar
          rect={selection && selected ? selection.rect : null}
          label={readerText.quote.toolbar}
          onDismiss={clear}
          toolbarRef={toolbar}
        >
          {selection ? (
            <>
              {canMark ? (
                <div role="group" aria-label={readerText.highlight.group} className="flex items-center">
                  {HIGHLIGHT_STYLES.map((style) => (
                    <Button
                      key={style}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={addHighlight.isPending}
                      onClick={() => mark(style)}
                    >
                      <PenIcon style={style} />
                      <span className="sr-only sm:not-sr-only">{readerText.highlight.pens[style]}</span>
                    </Button>
                  ))}
                  {under.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={removeHighlights.isPending}
                      onClick={() =>
                        unmark(
                          under.map((h) => h.id),
                          readerText.highlight.removed,
                        )
                      }
                    >
                      <Eraser aria-hidden />
                      <span className="sr-only sm:not-sr-only">{readerText.highlight.remove}</span>
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {quoteText ? (
                <CopyLinkButton
                  value={() => quoteText(selection.text, selection.blockId)}
                  label={readerText.quote.copy}
                  copiedLabel={readerText.quote.copied}
                  variant="ghost"
                  size="sm"
                  onCopied={() => setTimeout(clear, HIDE_AFTER_COPY_MS)}
                  onCopyFailed={() => toast.error(readerText.quote.copyFailed)}
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clear();
                  if (selected) openComments(selected);
                }}
              >
                <MessageSquare aria-hidden />
                {readerText.quote.comment}
              </Button>
            </>
          ) : null}
        </SelectionToolbar>
      ) : null}
      <Sheet open={open !== null} onOpenChange={(next) => (next ? undefined : setOpen(null))}>
        <DetentSheetContent
          handleLabel={commentText.inline.sheetHeight}
          onDismiss={() => setOpen(null)}
          bodyClassName="px-4 pb-6"
          header={
            <SheetHeader className="pt-1">
              <SheetTitle>{commentText.inline.title}</SheetTitle>
              <SheetDescription>{open ? excerptOf(open) : commentText.inline.description}</SheetDescription>
            </SheetHeader>
          }
        >
          {open ? (
            <div className="mx-auto w-full max-w-2xl">
              <CommentThread chapterId={chapterId} blockId={open.id} locale={locale} />
            </div>
          ) : null}
        </DetentSheetContent>
      </Sheet>
    </div>
  );
}

/** A tiny drawing of each pen (decorative: the button says its name). */
function PenIcon({ style }: { style: HighlightStyle }) {
  const d = {
    underline: "M3 17 Q12 20 21 16",
    circle: "M6 7 C 1 12, 7 19, 13 18 S 23 9, 15 6 S 6 6, 5 9",
    box: "M4 6 L20 5 L20 18 L4 18 Z",
    strike: "M3 12 Q12 10 21 12",
  }[style];
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 text-pen" fill="none">
      <text x="12" y="15" textAnchor="middle" className="fill-foreground text-[9px] font-bold">
        Aa
      </text>
      <path d={d} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
