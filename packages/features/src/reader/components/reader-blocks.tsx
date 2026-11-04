"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { formatCount } from "@storynest/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@storynest/ui/components/sheet";
import { CommentThread, commentText, useBlockCommentCounts } from "../../comments/index.ts";
import type { ReaderBlock } from "../model/chapter.ts";
import { BlockView } from "./block-view.tsx";
import { currentLocale } from "../../_shared/i18n.ts";

const EXCERPT_LENGTH = 120;

function excerptOf(block: ReaderBlock): string {
  if (block.type !== "paragraph" && block.type !== "heading") return "";
  const text = block.text.trim();
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
}

/**
 * The blocks of a chapter, each text block with a small button at the end that opens that paragraph's comments in a
 * sheet (the count beside the icon when there are any). One counts query serves the whole chapter.
 */
export function ReaderBlocks({
  chapterId,
  blocks,
  imageUrlFor,
  locale = currentLocale(),
}: {
  chapterId: string;
  blocks: readonly ReaderBlock[];
  imageUrlFor?: ((key: string) => string) | undefined;
  locale?: string;
}) {
  const counts = useBlockCommentCounts(chapterId);
  const [open, setOpen] = useState<ReaderBlock | null>(null);

  return (
    <>
      {blocks.map((block) => {
        const count = counts.data?.[block.id] ?? 0;
        const commentable = block.type === "paragraph" || block.type === "heading";
        return (
          <BlockView
            key={block.id}
            block={block}
            imageUrlFor={imageUrlFor}
            trailing={
              commentable ? (
                <button
                  type="button"
                  aria-label={commentText.inline.open(count)}
                  onClick={() => setOpen(block)}
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
      <Sheet open={open !== null} onOpenChange={(next) => (next ? undefined : setOpen(null))}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{commentText.inline.title}</SheetTitle>
            <SheetDescription>{open ? excerptOf(open) : commentText.inline.description}</SheetDescription>
          </SheetHeader>
          {open ? (
            <div className="mx-auto w-full max-w-2xl px-4 pb-6">
              <CommentThread chapterId={chapterId} blockId={open.id} locale={locale} />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
