"use client";

import { BookMarked, BookOpen, Bell, BellOff, BookmarkMinus, EyeOff, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "@storynest/utils";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { SwipeToRemove } from "@storynest/ui/widgets/swipe-to-remove";
import { useSwipeTabs } from "@storynest/ui/widgets/swipe-tabs";
import type { AppError } from "../../_shared/errors.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { MyLists } from "../../lists/index.ts";
import { ReadingStreakChip } from "../../reading-habits/index.ts";
import { STORY_GRID, StoryTile, storyHref } from "../../discovery/index.ts";
import {
  isUndoable,
  useLibraryList,
  useRemoveFromLibrary,
  useRestoreToLibrary,
  type UndoableLibraryTab,
} from "../hooks/use-library.ts";
import { LIBRARY_TABS, libraryErrorMessage, type LibraryEntry, type LibraryTab } from "../model/library.ts";
import { libraryText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = libraryText;
/** The fourth tab belongs to the lists feature, so it is not one of the three the library loads itself. */
const LISTS_TAB = "lists";
type ShelfTab = LibraryTab | typeof LISTS_TAB;
const SHELF_TABS: readonly ShelfTab[] = [...LIBRARY_TABS, LISTS_TAB];

const EMPTY_ICON: Record<LibraryTab, LucideIcon> = {
  reading: BookOpen,
  saved: BookMarked,
  following: Bell,
};
const REMOVE_ICON: Record<UndoableLibraryTab, LucideIcon> = { saved: BookmarkMinus, following: BellOff };

/**
 * The reader's shelf: what they are reading (continue in one tap), what they saved and what they follow. On a touch
 * screen the tabs also switch by swiping the shelf sideways, and a saved or followed story can be swiped away (the
 * toast offers Undo).
 */
export function LibraryScreen({
  locale = currentLocale(),
  coverUrlFor,
}: {
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const [tab, setTab] = useState<ShelfTab>("reading");
  const swipe = useSwipeTabs({ values: SHELF_TABS, value: tab, onValueChange: setTab });
  return (
    <section aria-label={t.title} className="flex flex-col gap-6">
      <PageHeader title={t.title} description={t.description} actions={<ReadingStreakChip />} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as ShelfTab)}>
        {/* Four tabs can be wider than a phone: the row scrolls instead of the page. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList aria-label={t.tabsLabel} variant="line" swipe={swipe.swipe}>
            {LIBRARY_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {t.tabs[value]}
              </TabsTrigger>
            ))}
            <TabsTrigger value={LISTS_TAB}>{t.tabs.lists}</TabsTrigger>
          </TabsList>
        </div>
        <div className="overflow-x-clip">
          <div key={swipe.panelKey} {...swipe.panelProps}>
            {LIBRARY_TABS.map((value) => (
              <TabsContent key={value} value={value} className="pt-4">
                <LibraryList tab={value} locale={locale} coverUrlFor={coverUrlFor} />
              </TabsContent>
            ))}
            <TabsContent value={LISTS_TAB} className="pt-4">
              <MyLists locale={locale} coverUrlFor={coverUrlFor} />
            </TabsContent>
          </div>
        </div>
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
  // Stories swiped away are hidden at once, before the list is read again (and shown again on Undo or an error).
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const setShown = (storyId: string, shown: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (shown) next.delete(storyId);
      else next.add(storyId);
      return next;
    });

  if (list.isError) {
    return (
      <ErrorState
        title={t.error.title}
        description={t.error.description}
        retryLabel={t.error.retry}
        onRetry={() => list.refetch()}
      />
    );
  }
  if (list.isPending) {
    return (
      <div className={STORY_GRID} aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" aria-hidden />
        ))}
      </div>
    );
  }
  const entries = list.data.filter((entry) => !hidden.has(entry.storyId));
  if (entries.length === 0) {
    const Icon = EMPTY_ICON[tab];
    return <EmptyState icon={Icon} title={t.empty[tab].title} description={t.empty[tab].description} />;
  }
  return (
    <ul aria-label={t.listLabel(t.tabs[tab])} className={STORY_GRID}>
      {entries.map((entry) => (
        <li key={entry.storyId}>
          <LibraryItem
            tab={tab}
            entry={entry}
            locale={locale}
            coverUrlFor={coverUrlFor}
            onShownChange={(shown) => setShown(entry.storyId, shown)}
          />
        </li>
      ))}
    </ul>
  );
}

// A function, not a constant: the phrase is read when it is drawn, so it follows the language.
const when = (tab: LibraryTab, relative: string) =>
  ({ reading: t.readAt, saved: t.savedAt, following: t.followedAt })[tab](relative);

function LibraryItem({
  tab,
  entry,
  locale,
  coverUrlFor,
  onShownChange,
}: {
  tab: LibraryTab;
  entry: LibraryEntry;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
  onShownChange: (shown: boolean) => void;
}) {
  const remove = useRemoveFromLibrary(tab);
  const restore = useRestoreToLibrary(tab === "reading" ? "saved" : tab);
  const toast = useAppToast();

  // Promises (mutateAsync), not mutate callbacks: the item is gone from the list by the time the toast's Undo is
  // pressed (and often by the time the removal settles), and mutate callbacks do not run for an unmounted component.
  const undo = () => {
    onShownChange(true);
    restore.mutateAsync(entry.storyId).then(
      () => isUndoable(tab) && toast.success(t.restored[tab]),
      (error: AppError) => toast.error(libraryErrorMessage(error)),
    );
  };

  const removeNow = () => {
    remove.mutateAsync(entry.storyId).then(
      () =>
        isUndoable(tab)
          ? toast.success(t.removed[tab], { action: { label: t.undo, onClick: undo } })
          : toast.success(t.removed[tab]),
      (error: AppError) => {
        onShownChange(true);
        toast.error(libraryErrorMessage(error));
      },
    );
  };

  const card = (
    <div className="flex h-full flex-col gap-2 bg-background">
      {entry.story ? (
        <StoryTile story={entry.story} locale={locale} coverUrlFor={coverUrlFor} />
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
        <Button type="button" size="sm" variant="ghost" disabled={remove.isPending} onClick={removeNow}>
          {t.remove[tab]}
        </Button>
        <span className="w-full text-xs text-muted-foreground">{when(tab, formatRelativeTime(entry.at, locale))}</span>
      </div>
    </div>
  );

  if (!isUndoable(tab)) return card;
  return (
    <SwipeToRemove
      label={t.remove[tab]}
      icon={REMOVE_ICON[tab]}
      disabled={remove.isPending}
      onRemove={() => {
        onShownChange(false);
        removeNow();
      }}
    >
      {card}
    </SwipeToRemove>
  );
}
