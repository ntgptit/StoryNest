import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@storynest/ui/lib/utils";
import { buttonVariants } from "@storynest/ui/components/button";
import { AppLink } from "../../_shared/platform.tsx";
import { chapterHref, type ChapterListItem, type StoryDetail } from "../../story/index.ts";
import { adjacentChapters } from "../model/chapter.ts";
import { readerText } from "../strings.ts";

/** Previous / next chapter links. A missing neighbour renders a disabled placeholder so the layout does not jump. */
export function ChapterNav({
  story,
  chapters,
  chapterSlug,
}: {
  story: Pick<StoryDetail, "id" | "slug">;
  chapters: readonly ChapterListItem[];
  chapterSlug: string;
}) {
  const { previous, next } = adjacentChapters(chapters, chapterSlug);
  const base = buttonVariants({ variant: "outline" });
  return (
    <nav aria-label={readerText.nav.label} className="flex items-center justify-between gap-3">
      {previous ? (
        <AppLink href={chapterHref(story, previous)} rel="prev" className={base}>
          <ChevronLeft aria-hidden className="size-4" />
          {readerText.nav.previous}
        </AppLink>
      ) : (
        <span aria-disabled className={cn(base, "pointer-events-none opacity-50")}>
          <ChevronLeft aria-hidden className="size-4" />
          {readerText.nav.previous}
        </span>
      )}
      {next ? (
        <AppLink href={chapterHref(story, next)} rel="next" className={base}>
          {readerText.nav.next}
          <ChevronRight aria-hidden className="size-4" />
        </AppLink>
      ) : (
        <span aria-disabled className={cn(base, "pointer-events-none opacity-50")}>
          {readerText.nav.next}
          <ChevronRight aria-hidden className="size-4" />
        </span>
      )}
    </nav>
  );
}
