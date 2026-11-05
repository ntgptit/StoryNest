"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { useFlip } from "@storynest/ui/lib/use-flip";
import { StoryCard, type StoryCardVariant } from "@storynest/ui/widgets/story-card";
import { StoryViewToggle, useStoredView } from "@storynest/ui/widgets/story-view-toggle";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useStoryPeek } from "../../_shared/story-peek.tsx";
import { toStoryCardData, type StorySummary } from "../model/story-card.ts";
import { discoveryText } from "../strings.ts";

/** Grid of story tiles, the same on every list page. */
export const STORY_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";
/** The list view: one row per story, two columns on wide screens. */
export const STORY_LIST = "grid grid-cols-1 gap-3 lg:grid-cols-2";

export const storyListClassName = (view: StoryCardVariant) => (view === "list" ? STORY_LIST : STORY_GRID);

/** localStorage key of the reader's grid/list choice (one choice for every story list). */
export const STORY_VIEW_STORAGE_KEY = "storynest.story-view";

/**
 * A story card wired to the app: opening it morphs the cover into the story page (view transition, where supported),
 * a long-press or the context menu opens the story peek when the app provides one (StoryPeekProvider).
 */
export function StoryTile({
  story,
  locale,
  coverUrlFor,
  variant = "grid",
}: {
  story: StorySummary;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
  variant?: StoryCardVariant;
}) {
  const navigation = useNavigation();
  const peek = useStoryPeek();
  const card = toStoryCardData(story, coverUrlFor);
  return (
    <StoryCard
      story={card}
      labels={{ reads: discoveryText.card.reads, votes: discoveryText.card.votes, updated: discoveryText.card.updated }}
      LinkComponent={AppLink}
      locale={locale}
      variant={variant}
      onNavigate={navigation.push}
      onPeek={peek ? () => peek({ id: story.id, card }) : undefined}
    />
  );
}

/**
 * The grid/list choice of a story list (remembered in this browser) and the FLIP that morphs the covers when it
 * changes. Put `containerRef` on the element around the list.
 */
export function useStoryView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const capture = useFlip(containerRef);
  const [view, setView] = useStoredView(STORY_VIEW_STORAGE_KEY);
  return {
    view,
    containerRef,
    listClassName: storyListClassName(view),
    toggle: (
      <StoryViewToggle
        value={view}
        onChange={(next) => {
          capture();
          setView(next);
        }}
        labels={discoveryText.view}
      />
    ),
  };
}

/** Wrapper around a story list that the morph (and the card text fade) works in. */
export function StoryListFrame({
  frameRef,
  children,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div ref={frameRef} className="group/stories">
      {children}
    </div>
  );
}
