"use client";

import { useCallback, useState, type ReactNode } from "react";
import { StoryPeekSheet } from "@storynest/ui/widgets/story-peek-sheet";
import { currentLocale } from "../../_shared/i18n.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { StoryPeekContext, type StoryPeekTarget } from "../../_shared/story-peek.tsx";
import { discoveryText } from "../../discovery/index.ts";
import { storyText } from "../strings.ts";
import { StoryActions } from "./story-actions.tsx";

/**
 * Lets every story card of the app open a quick look (long-press on touch, or the context menu): cover, synopsis,
 * counters and the story page's own Follow / Save / Add to list buttons (StoryActions, same rules and API), plus a
 * link to the story. Mount once around the app's pages.
 */
export function StoryPeekProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<StoryPeekTarget | null>(null);
  const [open, setOpen] = useState(false);
  const peek = useCallback((next: StoryPeekTarget) => {
    setTarget(next);
    setOpen(true);
  }, []);

  return (
    <StoryPeekContext value={peek}>
      {children}
      <StoryPeekSheet
        story={target?.card ?? null}
        open={open}
        onOpenChange={setOpen}
        LinkComponent={AppLink}
        locale={currentLocale()}
        labels={{
          reads: discoveryText.card.reads,
          votes: discoveryText.card.votes,
          open: storyText.peek.open,
          close: storyText.peek.close,
        }}
        actions={target ? <StoryActions key={target.id} storyId={target.id} /> : null}
      />
    </StoryPeekContext>
  );
}
