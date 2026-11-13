"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@storynest/ui/components/badge";
import { cn } from "@storynest/ui/lib/utils";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useStudioChapters } from "../hooks/use-chapter-management.ts";
import { useStoryForEdit } from "../hooks/use-story-editing.ts";
import { countPublished, readerAccess } from "../model/reader-access.ts";
import { activeWorkspaceTab, workspaceTabHref, workspaceTabsFor } from "../model/workspace-tabs.ts";
import { studioText } from "../strings.ts";

const t = studioText.workspace;

/**
 * The one bar on top of a story's workspace pages: the role, a link to the public page and a tab for each page this
 * role may open (so nobody lands on a page they cannot use). Renders nothing until the story is known, and for a story
 * that cannot be opened (the page below says so).
 */
export function StoryWorkspaceNav({ storyId }: { storyId: string }) {
  const story = useStoryForEdit(storyId);
  const chapters = useStudioChapters(storyId);
  const { pathname } = useNavigation();
  if (!story.data) return null;

  // Known only once the chapters are loaded: until then the chip is left out rather than guessed.
  const access = chapters.data
    ? readerAccess({ ...story.data.form, deleted: story.data.deletedAt !== null }, countPublished(chapters.data))
    : null;

  const active = activeWorkspaceTab(storyId, pathname);
  return (
    <div className="mb-4 flex max-w-2xl flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{studioText.role[story.data.role]}</Badge>
          {access ? (
            <Badge
              variant={access.state === "live" ? "default" : "outline"}
              title={access.reasons.map((reason) => studioText.access.reason[reason]).join(" · ") || undefined}
            >
              {studioText.access.state[access.state]}
            </Badge>
          ) : null}
        </div>
        <AppLink
          href={`/story/${storyId}/${story.data.form.slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {studioText.view}
          <ExternalLink aria-hidden className="size-3.5" />
        </AppLink>
      </div>
      <nav aria-label={t.label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1 border-b">
          {workspaceTabsFor(story.data.role).map((tab) => (
            <li key={tab}>
              <AppLink
                href={workspaceTabHref(storyId, tab)}
                aria-current={tab === active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                  tab === active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.tabs[tab]}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
