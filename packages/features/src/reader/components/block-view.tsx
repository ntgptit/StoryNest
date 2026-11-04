import type { ReactNode } from "react";
import { blockAnchor, type ReaderBlock } from "../model/chapter.ts";
import { RichText } from "./rich-text.tsx";

/** One block of a chapter. Every block has a stable anchor id, the target of deep links and paragraph comments. */
export function BlockView({
  block,
  imageUrlFor,
  trailing,
}: {
  block: ReaderBlock;
  imageUrlFor?: ((key: string) => string) | undefined;
  /** Placed at the end of a paragraph or heading (the button that opens the paragraph's comments). */
  trailing?: ReactNode;
}) {
  const id = blockAnchor(block.id);
  switch (block.type) {
    case "paragraph":
      return (
        <p id={id} className="scroll-mt-20 whitespace-pre-line">
          <RichText text={block.text} marks={block.marks} />
          {trailing}
        </p>
      );
    case "heading":
      return (
        <h2 id={id} className="scroll-mt-20 pt-4 text-xl font-semibold tracking-tight">
          <RichText text={block.text} marks={block.marks} />
          {trailing}
        </h2>
      );
    case "image": {
      const src = imageUrlFor?.(block.storageKey);
      return src ? (
        <figure id={id} className="scroll-mt-20">
          <img src={src} alt="" loading="lazy" className="mx-auto h-auto max-w-full rounded-lg" />
        </figure>
      ) : null;
    }
    case "divider":
      return <hr id={id} className="my-4 scroll-mt-20 border-border" />;
  }
}
