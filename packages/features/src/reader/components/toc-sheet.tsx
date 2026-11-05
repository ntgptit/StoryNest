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
import { ScrubIndex, scrollRowToTop } from "@storynest/ui/widgets/scrub-index";
import { SectionOutline, type OutlineItem } from "@storynest/ui/widgets/section-outline";
import { useRef, useState, type ReactNode, type UIEvent } from "react";
import { AppLink } from "../../_shared/platform.tsx";
import { chapterHref, chapterRanges, isLongStory, type ChapterListItem, type StoryDetail } from "../../story/index.ts";
import { blockAnchor } from "../model/chapter.ts";
import { currentSection, readingLinePx } from "../model/sections.ts";
import { readerText } from "../strings.ts";

/**
 * Table of contents in a sheet: jump to any published chapter; the current one is marked. The reader opens it from
 * its toolbar (side sheet, current = the open chapter); the story page's sticky reading bar opens it as a bottom
 * sheet with its own trigger, marking the chapter the reader would continue in.
 *
 * In the reader, a chapter with headings (`sections`) also gets an "In this chapter" outline at the top, marking the
 * section on screen when the sheet opened; an entry closes the sheet and brings that heading under the reader bar.
 * A long story gets a scrub rail of chapter ranges beside the list (drag or press a mark to jump the list).
 */
export function TocSheet({
  story,
  chapters,
  currentSlug,
  currentKind = "page",
  side = "right",
  trigger,
  sections = [],
}: {
  story: Pick<StoryDetail, "id" | "slug">;
  chapters: readonly ChapterListItem[];
  currentSlug?: string | undefined;
  /** aria-current of the marked chapter: "page" in the reader (it is the open page), "step" for "where you are". */
  currentKind?: "page" | "step";
  side?: "right" | "bottom";
  /** Replaces the default "Contents" button. */
  trigger?: ReactNode;
  /** Headings of the open chapter (block id + text), in reading order. Shown when there are at least two. */
  sections?: readonly OutlineItem[];
}) {
  const [open, setOpen] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const goTo = useRef<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const long = isLongStory(chapters.length);
  const ranges = long ? chapterRanges(chapters) : [];
  const [activeRange, setActiveRange] = useState(0);
  const showOutline = sections.length >= 2;

  const onOpenChange = (next: boolean) => {
    if (next && showOutline) {
      const tops = sections.map(
        (section) => document.getElementById(blockAnchor(section.id))?.getBoundingClientRect().top ?? Infinity,
      );
      setCurrentSectionId(sections[currentSection(tops, readingLinePx())]?.id ?? null);
    }
    setOpen(next);
  };

  const jumpToRange = (index: number) => {
    setActiveRange(index);
    const start = ranges[index]?.start ?? 0;
    const row = list.current?.querySelector<HTMLElement>(`[data-index="${start}"]`);
    if (row && scroller.current) scrollRowToTop(scroller.current, row);
  };

  // Keeps the rail's mark in step when the list is scrolled by hand.
  const onListScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!long) return;
    const box = event.currentTarget.getBoundingClientRect();
    let index = 0;
    ranges.forEach((range, i) => {
      const row = list.current?.querySelector<HTMLElement>(`[data-index="${range.start}"]`);
      if (row && row.getBoundingClientRect().top <= box.top + 8) index = i;
    });
    if (index !== activeRange) setActiveRange(index);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
        onCloseAutoFocus={(event) => {
          const id = goTo.current;
          goTo.current = null;
          const heading = id ? document.getElementById(blockAnchor(id)) : null;
          if (!heading) return;
          // Land on the heading instead of the Contents button: keyboard and screen-reader users continue there.
          event.preventDefault();
          heading.setAttribute("tabindex", "-1");
          heading.scrollIntoView({ block: "start" });
          heading.focus({ preventScroll: true });
        }}
        className={cn(
          "overflow-hidden",
          side === "bottom" ? "mx-auto max-h-[80dvh] w-full max-w-xl rounded-t-2xl pb-safe" : "w-[min(22rem,90vw)]",
        )}
      >
        <SheetHeader>
          <SheetTitle>{readerText.toc.title}</SheetTitle>
          <SheetDescription>{readerText.toc.description}</SheetDescription>
        </SheetHeader>
        <div className="relative flex min-h-0 flex-1">
          <div
            ref={scroller}
            onScroll={onListScroll}
            className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-6", long && "pr-12")}
          >
            {showOutline ? (
              <SectionOutline
                title={readerText.toc.inChapter}
                items={sections}
                currentId={currentSectionId}
                onSelect={(id) => {
                  goTo.current = id;
                  setOpen(false);
                }}
                className="mb-4 border-b pb-4"
              />
            ) : null}
            <ol ref={list} className="flex flex-col gap-1">
              {chapters.map((chapter, index) => {
                const current = currentSlug !== undefined && chapter.slug === currentSlug;
                return (
                  <li key={chapter.id} data-index={index} className="scroll-mt-2">
                    <AppLink
                      href={chapterHref(story, chapter)}
                      aria-current={current ? currentKind : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        current && "bg-accent font-medium",
                      )}
                    >
                      <span className="block text-xs text-muted-foreground">
                        {readerText.chapterLabel(chapter.number)}
                      </span>
                      {chapter.title}
                    </AppLink>
                  </li>
                );
              })}
            </ol>
          </div>
          {long ? (
            <ScrubIndex
              label={readerText.toc.scrub}
              marks={ranges.map((range) => String(range.firstNumber))}
              active={activeRange}
              onSelect={jumpToRange}
              markLabel={readerText.toc.scrubMark}
              className="absolute inset-y-2 right-2"
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
