"use client";

// A chapter drawn with the reader's own components, shared by the draft preview screen (history) and the editor's
// side-by-side live preview. Lives in _shared so neither feature imports the other (see block-diff.ts).
import { cn } from "@storynest/ui/lib/utils";
import { BlockView, type ReaderBlock } from "../reader/index.ts";

/**
 * Title and blocks as readers will see them once published. `contained`: the article sits in a size container (a
 * preview frame or pane), so its type scale follows that width instead of the window's.
 */
export function ChapterPreviewArticle({
  title,
  blocks,
  emptyText,
  imageUrlFor,
  contained = false,
  className,
}: {
  title: string;
  blocks: readonly ReaderBlock[];
  /** Shown instead of the blocks when there are none. */
  emptyText: string;
  imageUrlFor?: ((key: string) => string) | undefined;
  contained?: boolean;
  className?: string | undefined;
}) {
  return (
    <article
      className={cn("reader-text mx-auto flex w-full max-w-[var(--reader-measure)] flex-col gap-6 py-8", className)}
    >
      <h1
        className={cn(
          "text-2xl font-semibold tracking-tight text-balance",
          contained ? "@min-[40rem]:text-3xl" : "sm:text-3xl",
        )}
      >
        {title}
      </h1>
      {blocks.length === 0 ? (
        <p className="text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-[1em]">
          {blocks.map((block) => (
            <BlockView key={block.id} block={block} imageUrlFor={imageUrlFor} />
          ))}
        </div>
      )}
    </article>
  );
}
