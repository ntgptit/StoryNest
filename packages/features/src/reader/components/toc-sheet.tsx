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
import { AppLink } from "../../_shared/platform.tsx";
import { chapterHref, type ChapterListItem, type StoryDetail } from "../../story/index.ts";
import { readerText } from "../strings.ts";

/** Table of contents in a side sheet: jump to any published chapter; the current one is marked. */
export function TocSheet({
  story,
  chapters,
  currentSlug,
}: {
  story: Pick<StoryDetail, "id" | "slug">;
  chapters: readonly ChapterListItem[];
  currentSlug: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <List aria-hidden className="size-4" />
          {readerText.toc.open}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{readerText.toc.title}</SheetTitle>
          <SheetDescription>{readerText.toc.description}</SheetDescription>
        </SheetHeader>
        <ol className="flex flex-col gap-1 px-4 pb-6">
          {chapters.map((chapter) => {
            const current = chapter.slug === currentSlug;
            return (
              <li key={chapter.id}>
                <AppLink
                  href={chapterHref(story, chapter)}
                  aria-current={current ? "page" : undefined}
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
