"use client";

import { createContext, useContext } from "react";
import type { StoryCardData } from "@storynest/ui/widgets/story-card";

/** The story a long-press (or the context menu) on a card asks to peek at. */
export interface StoryPeekTarget {
  id: string;
  card: StoryCardData;
}

/**
 * Opens the story peek (StoryPeekProvider in the story feature). It lives here so story cards in any feature can ask
 * for it without importing the story feature (which itself builds on discovery). Undefined without a provider: cards
 * then simply have no peek.
 */
export const StoryPeekContext = createContext<((target: StoryPeekTarget) => void) | undefined>(undefined);

export function useStoryPeek(): ((target: StoryPeekTarget) => void) | undefined {
  return useContext(StoryPeekContext);
}
