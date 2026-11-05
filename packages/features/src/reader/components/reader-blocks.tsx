"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCount } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@storynest/ui/components/sheet";
import { CopyLinkButton } from "@storynest/ui/widgets/copy-link-button";
import { DetentSheetContent } from "@storynest/ui/widgets/detent-sheet";
import { SelectionToolbar, useBlockSelection } from "@storynest/ui/widgets/selection-toolbar";
import { CommentThread, commentText, useBlockCommentCounts } from "../../comments/index.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { blockAnchor, type ReaderBlock } from "../model/chapter.ts";
import { useFocusedBlock, useReaderFocusMode } from "../hooks/use-reader-focus.ts";
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
 *  - focus mode (a device setting) dims every block but the one at the reading line.
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
      {quoteText ? (
        <SelectionToolbar
          rect={selection && selected ? selection.rect : null}
          label={readerText.quote.toolbar}
          onDismiss={clear}
          toolbarRef={toolbar}
        >
          {selection ? (
            <>
              <CopyLinkButton
                value={() => quoteText(selection.text, selection.blockId)}
                label={readerText.quote.copy}
                copiedLabel={readerText.quote.copied}
                variant="ghost"
                size="sm"
                onCopied={() => setTimeout(clear, HIDE_AFTER_COPY_MS)}
                onCopyFailed={() => toast.error(readerText.quote.copyFailed)}
              />
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
