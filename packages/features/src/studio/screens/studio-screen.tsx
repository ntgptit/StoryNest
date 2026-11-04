"use client";

import { BookMarked, Eye, Globe, Link2, Lock } from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { formatRelativeTime } from "@storynest/utils";
import type { Visibility } from "@storynest/validation";
import { AppLink } from "../../_shared/platform.tsx";
import { discoveryText, statusLabel, storyHref } from "../../discovery/index.ts";
import { useMyStories } from "../hooks/use-my-stories.ts";
import type { StudioStory } from "../model/studio-story.ts";
import { studioText } from "../strings.ts";

const VISIBILITY_ICON: Record<Visibility, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};

function StudioStoryRow({
  story,
  locale,
  coverUrlFor,
}: {
  story: StudioStory;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const VisibilityIcon = VISIBILITY_ICON[story.visibility];
  const coverUrl = story.coverStorageKey && coverUrlFor ? coverUrlFor(story.coverStorageKey) : null;
  return (
    <li className="flex gap-4 rounded-xl border bg-card p-3 text-card-foreground sm:p-4">
      <StoryCover title={story.title} coverUrl={coverUrl} className="w-16 shrink-0 sm:w-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="truncate text-base font-semibold">{story.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{statusLabel(story.status)}</Badge>
          <Badge variant="secondary" className="gap-1">
            <VisibilityIcon aria-hidden className="size-3" />
            {studioText.visibility[story.visibility]}
          </Badge>
          {story.isMature ? <Badge variant="destructive">{discoveryText.mature}</Badge> : null}
          {story.role !== "owner" ? <Badge>{studioText.role[story.role]}</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {studioText.chapterCount(story.chapterCount)} ·{" "}
          {studioText.updated(formatRelativeTime(story.updatedAt, locale))}
        </p>
        <div className="flex gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <AppLink href={storyHref(story)}>
              <Eye aria-hidden className="size-4" />
              {studioText.view}
            </AppLink>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Author workspace home: every story I own or was invited to, with its state and quick actions. */
export function StudioScreen({
  locale = "vi",
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const stories = useMyStories();

  return (
    <section aria-label={studioText.title} className="flex flex-col gap-6">
      <PageHeader title={studioText.title} description={studioText.description} />
      {stories.isError ? (
        <ErrorState
          title={studioText.error.title}
          description={studioText.error.description}
          retryLabel={studioText.error.retry}
          onRetry={() => void stories.refetch()}
        />
      ) : stories.isPending ? (
        <div className="flex flex-col gap-3" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : stories.data.length === 0 ? (
        <EmptyState icon={BookMarked} title={studioText.empty.title} description={studioText.empty.description} />
      ) : (
        <ul aria-label={studioText.listLabel} className="flex flex-col gap-3">
          {stories.data.map((story) => (
            <StudioStoryRow key={story.id} story={story} locale={locale} coverUrlFor={coverUrlFor} />
          ))}
        </ul>
      )}
    </section>
  );
}
