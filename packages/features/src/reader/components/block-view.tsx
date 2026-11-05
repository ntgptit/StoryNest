import type { ReactNode } from "react";
import { HandDrawnMarks, type PenMark } from "@storynest/ui/widgets/hand-drawn-marks";
import { HighlightSweep } from "@storynest/ui/widgets/highlight-sweep";
import { ImageLightbox } from "@storynest/ui/widgets/image-lightbox";
import { cn } from "@storynest/ui/lib/utils";
import { blockAnchor, type ReaderBlock } from "../model/chapter.ts";
import { readerText } from "../strings.ts";
import { RichText } from "./rich-text.tsx";

/** Focus mode dims every block but the one being read (the element's opacity and blur, on `--ease-soft`). */
const DIM =
  "[transition:opacity_0.45s_var(--ease-soft),filter_0.45s_var(--ease-soft)] data-[dimmed=true]:opacity-25 data-[dimmed=true]:blur-[1.2px]";

/**
 * One block of a chapter. Every block has a stable anchor id, the target of deep links and paragraph comments; text
 * blocks also carry `data-block-id` (what the quote toolbar reads from a selection). An image opens full screen.
 * `marks` are the reader's own highlights on a text block, drawn as pen marks over the text (Lucian 392); the
 * trailing button is left out of the text the ranges count (`data-marks-skip`).
 */
export function BlockView({
  block,
  imageUrlFor,
  trailing,
  highlight = 0,
  dimmed = false,
  marks,
  drawIds,
}: {
  block: ReaderBlock;
  imageUrlFor?: ((key: string) => string) | undefined;
  /** Placed at the end of a paragraph or heading (the button that opens the paragraph's comments). */
  trailing?: ReactNode;
  /** Bumped when the reader lands on this block (deep link, resume): its text gets a highlighter sweep. */
  highlight?: number;
  /** Focus mode: this block is not the one being read. */
  dimmed?: boolean;
  /** The reader's highlights in this block (text blocks only). */
  marks?: readonly PenMark[] | undefined;
  /** Highlights to draw stroke by stroke (just made). */
  drawIds?: readonly string[] | undefined;
}) {
  const pen = marks && marks.length > 0 ? <HandDrawnMarks marks={marks} drawIds={drawIds} /> : null;
  const tail = trailing ? <span data-marks-skip="">{trailing}</span> : null;
  const id = blockAnchor(block.id);
  const dim = dimmed ? true : undefined;
  switch (block.type) {
    case "paragraph":
      return (
        <p
          id={id}
          data-block-id={block.id}
          data-dimmed={dim}
          className={cn("relative scroll-mt-below-reader-bar whitespace-pre-line", DIM)}
        >
          <HighlightSweep play={highlight}>
            <RichText text={block.text} marks={block.marks} />
          </HighlightSweep>
          {tail}
          {pen}
        </p>
      );
    case "heading":
      return (
        <h2
          id={id}
          data-block-id={block.id}
          data-dimmed={dim}
          className={cn("relative scroll-mt-below-reader-bar pt-4 text-xl font-semibold tracking-tight", DIM)}
        >
          <HighlightSweep play={highlight}>
            <RichText text={block.text} marks={block.marks} />
          </HighlightSweep>
          {tail}
          {pen}
        </h2>
      );
    case "image": {
      const src = imageUrlFor?.(block.storageKey);
      return src ? (
        <figure id={id} data-dimmed={dim} className={cn("scroll-mt-below-reader-bar", DIM)}>
          <ImageLightbox
            src={src}
            alt=""
            openLabel={readerText.image.open}
            closeLabel={readerText.image.close}
            title={readerText.image.title}
            hint={readerText.image.hint}
            className="mx-auto w-fit max-w-full"
          >
            <img src={src} alt="" loading="lazy" className="mx-auto h-auto max-w-full rounded-lg" />
          </ImageLightbox>
        </figure>
      ) : null;
    }
    case "divider":
      return <hr id={id} className="my-4 scroll-mt-below-reader-bar border-border" />;
  }
}
