"use client";

import { BookMarked, BookOpen, Bell, EyeOff, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { StoryCard } from "@storynest/ui/widgets/story-card";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { discoveryText, storyHref, toStoryCardData } from "../../discovery/index.ts";
import { useLibraryList, useRemoveFromLibrary } from "../hooks/use-library.ts";
import { LIBRARY_TABS, libraryErrorMessage, type LibraryEntry, type LibraryTab } from "../model/library.ts";
import { libraryText } from "../strings.ts";

const t = libraryText;

const EMPTY_ICON: Record<LibraryTab, LucideIcon> = {
  reading: BookOpen,
  saved: BookMarked,
  following: Bell,
};

/** The reader's shelf: what they are reading (continue in one tap), what they saved and what they follow. */
export function LibraryScreen({
  locale = "vi",
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const [tab, setTab] = useState<LibraryTab>("reading");
  return (
    <section aria-label={t.title} className="flex flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as LibraryTab)}>
        <TabsList aria-label={t.tabsLabel}>
          {LIBRARY_TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t.tabs[value]}
            </TabsTrigger>
          ))}
        </TabsList>
        {LIBRARY_TABS.map((value) => (
          <TabsContent key={value} value={value} className="pt-4">
            <LibraryList tab={value} locale={locale} coverUrlFor={coverUrlFor} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function LibraryList({
  tab,
  locale,
  coverUrlFor,
}: {
  tab: LibraryTab;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const list = useLibraryList(tab);

  if (list.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => void list.refetch()}
      />
    );
  }
  if (list.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" aria-hidden />
        ))}
      </div>
    );
  }
  if (list.data.length === 0) {
    const Icon = EMPTY_ICON[tab];
    return <EmptyState icon={Icon} title={t.empty[tab].title} description={t.empty[tab].description} />;
  }
  return (
    <ul aria-label={t.listLabel(t.tabs[tab])} className="flex flex-col gap-4">
      {list.data.map((entry) => (
        <li key={entry.storyId}>
          <LibraryItem tab={tab} entry={entry} locale={locale} coverUrlFor={coverUrlFor} />
        </li>
      ))}
    </ul>
  );
}

const WHEN = { reading: t.readAt, saved: t.savedAt, following: t.followedAt } as const;

function LibraryItem({
  tab,
  entry,
  locale,
  coverUrlFor,
}: {
  tab: LibraryTab;
  entry: LibraryEntry;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const remove = useRemoveFromLibrary(tab);
  const toast = useAppToast();
  const labels = {
    reads: discoveryText.card.reads,
    votes: discoveryText.card.votes,
    updated: discoveryText.card.updated,
  };

  return (
    <div className="flex flex-col gap-2">
      {entry.story ? (
        <StoryCard story={toStoryCardData(entry.story, coverUrlFor)} labels={labels} LinkComponent={AppLink} />
      ) : (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm">
          <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">{t.unavailable.title}</p>
            <p className="text-muted-foreground">{t.unavailable.description}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {tab === "reading" && entry.resume ? (
          <Button asChild size="sm">
            <AppLink href={entry.resume.href}>{t.continueReading(entry.resume.number)}</AppLink>
          </Button>
        ) : null}
        {tab !== "reading" && entry.story ? (
          <Button asChild size="sm" variant="outline">
            <AppLink href={storyHref(entry.story)}>{t.openStory}</AppLink>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(entry.storyId, {
              onSuccess: () => toast.success(t.removed[tab]),
              onError: (error) => toast.error(libraryErrorMessage(error)),
            })
          }
        >
          {t.remove[tab]}
        </Button>
        <span className="text-xs text-muted-foreground">{WHEN[tab](formatRelativeTime(entry.at, locale))}</span>
      </div>
    </div>
  );
}
