"use client";

import { List } from "lucide-react";
import { Button } from "@storynest/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@storynest/ui/components/sheet";
import { cn } from "@storynest/ui/lib/utils";
import type { ReactNode } from "react";
import { AppLink } from "../../_shared/platform.tsx";
import { chapterHref, type ChapterListItem, type StoryDetail } from "../../story/index.ts";
import { readerText } from "../strings.ts";

/**
 * Table of contents in a sheet: jump to any published chapter; the current one is marked. The reader opens it from
 * its toolbar (side sheet, current = the open chapter); the story page's sticky reading bar opens it as a bottom
 * sheet with its own trigger, marking the chapter the reader would continue in.
 */
export function TocSheet({
  story,
  chapters,
  currentSlug,
  currentKind = "page",
  side = "right",
  trigger,
}: {
  story: Pick<StoryDetail, "id" | "slug">;
  chapters: readonly ChapterListItem[];
  currentSlug?: string | undefined;
  /** aria-current of the marked chapter: "page" in the reader (it is the open page), "step" for "where you are". */
  currentKind?: "page" | "step";
  side?: "right" | "bottom";
  /** Replaces the default "Contents" button. */
  trigger?: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <List aria-hidden className="size-4" />
            {readerText.toc.open}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side={side}
        className={cn(
          "overflow-y-auto",
          side === "bottom" ? "mx-auto max-h-[80dvh] w-full max-w-xl rounded-t-2xl pb-safe" : "w-[min(22rem,90vw)]",
        )}
      >
        <SheetHeader>
          <SheetTitle>{readerText.toc.title}</SheetTitle>
          <SheetDescription>{readerText.toc.description}</SheetDescription>
        </SheetHeader>
        <ol className="flex flex-col gap-1 px-4 pb-6">
          {chapters.map((chapter) => {
            const current = currentSlug !== undefined && chapter.slug === currentSlug;
            return (
              <li key={chapter.id}>
                <AppLink
                  href={chapterHref(story, chapter)}
                  aria-current={current ? currentKind : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    current && "bg-accent font-medium",
                  )}
                >
                  <span className="block text-xs text-muted-foreground">{readerText.chapterLabel(chapter.number)}</span>
                  {chapter.title}
                </AppLink>
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
