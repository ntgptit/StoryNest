"use client";

import { Search, UserRound, Tag as TagIcon, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { useSwipeTabs } from "@storynest/ui/widgets/swipe-tabs";
import { UserAvatar, firstLetter } from "../../_shared/avatar.tsx";
import { useNavigation, AppLink } from "../../_shared/platform.tsx";
import { authorHref } from "../../author/index.ts";
import { STORY_GRID, StoryListFrame, StoryTile, homeHref, useStoryView } from "../../discovery/index.ts";
import { TrendingTerms } from "@storynest/ui/widgets/trending-terms";
import { markReadSource } from "../../progress/index.ts";
import {
  useLogSearch,
  useSearchAuthors,
  useSearchStories,
  useSearchTags,
  useTrendingSearches,
} from "../hooks/use-search.ts";
import {
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  SEARCH_TABS,
  normalizeTerm,
  searchHref,
  termState,
  type AuthorHit,
  type SearchTab,
  type TagHit,
} from "../model/search.ts";
import { searchText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = searchText;

/**
 * Results page. The term and the tab come from the address (props), so a search can be shared and survives a reload;
 * changing either replaces the address instead of keeping state here.
 */
export function SearchScreen({
  term: rawTerm,
  tab,
  locale = currentLocale(),
  coverUrlFor,
}: {
  term: string;
  tab: SearchTab;
  locale?: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const navigation = useNavigation();
  const term = normalizeTerm(rawTerm);
  const [draft, setDraft] = useState(rawTerm);
  const state = termState(term);
  useLogSearch(state === "ok" ? term : "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigation.replace(searchHref(draft, tab));
  };

  return (
    <section aria-label={t.title} className="flex flex-col gap-4">
      <PageHeader title={t.title} />
      <form role="search" onSubmit={submit} className="flex gap-2">
        <Input
          type="search"
          aria-label={t.inputLabel}
          placeholder={t.placeholder}
          autoComplete="off"
          maxLength={SEARCH_MAX_LENGTH + 20}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit">
          <Search aria-hidden />
          {t.submit}
        </Button>
      </form>

      {state !== "ok" ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {state === "long" ? t.tooLong(SEARCH_MAX_LENGTH) : t.hint(SEARCH_MIN_LENGTH)}
          </p>
          <Trending
            onPick={(picked) => {
              setDraft(picked);
              navigation.replace(searchHref(picked, tab));
            }}
          />
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold tracking-tight">{t.resultsFor(term)}</h2>
          <ResultTabs term={term} tab={tab} locale={locale} coverUrlFor={coverUrlFor} />
        </>
      )}
    </section>
  );
}

/**
 * The three result tabs. The tab lives in the address: clicking, the arrow keys or swiping the results sideways on a
 * touch screen (the underline follows the finger) all replace the address.
 */
function ResultTabs({
  term,
  tab,
  locale,
  coverUrlFor,
}: {
  term: string;
  tab: SearchTab;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const navigation = useNavigation();
  const select = (next: SearchTab) => navigation.replace(searchHref(term, next));
  const swipe = useSwipeTabs({ values: SEARCH_TABS, value: tab, onValueChange: select });
  const storyView = useStoryView();
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <Tabs value={tab} onValueChange={(next) => select(next as SearchTab)}>
          <TabsList variant="line" swipe={swipe.swipe}>
            {SEARCH_TABS.map((name) => (
              <TabsTrigger key={name} value={name}>
                {t.tabs[name]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {tab === "stories" ? storyView.toggle : null}
      </div>
      {/* A story opened from the results is a read from search (an in-app source, see markReadSource). */}
      <div className="overflow-x-clip" onClickCapture={() => markReadSource("search")}>
        <div key={swipe.panelKey} {...swipe.panelProps}>
          {tab === "stories" ? (
            <StoryResults term={term} locale={locale} coverUrlFor={coverUrlFor} storyView={storyView} />
          ) : null}
          {tab === "authors" ? <AuthorResults term={term} /> : null}
          {tab === "tags" ? <TagResults term={term} /> : null}
        </div>
      </div>
    </>
  );
}

/** The trending searches (Lucian 322) under an empty search box; nothing at all while there are none. */
function Trending({ onPick }: { onPick: (term: string) => void }) {
  const trending = useTrendingSearches();
  const items = trending.data ?? [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <TrendingTerms
        items={items}
        onPick={onPick}
        text={{
          title: t.trending.title,
          open: t.trending.open,
          close: t.trending.close,
          list: t.trending.list,
          isNew: t.trending.isNew,
          up: t.trending.up,
          down: t.trending.down,
          same: t.trending.same,
          pick: t.trending.pick,
        }}
      />
      <p className="text-xs text-muted-foreground">{t.trending.note}</p>
    </div>
  );
}

function Loading({ grid = false }: { grid?: boolean }) {
  return (
    <div className={grid ? STORY_GRID : "flex flex-col gap-2"} aria-busy role="status" aria-label={t.searching}>
      {Array.from({ length: grid ? 8 : 4 }, (_, i) => (
        <Skeleton key={i} className={grid ? "aspect-[2/3] w-full rounded-xl" : "h-14 w-full rounded-xl"} aria-hidden />
      ))}
    </div>
  );
}

function Failed({ onRetry }: { onRetry: () => Promise<unknown> }) {
  return (
    <ErrorState title={t.error.title} description={t.error.description} retryLabel={t.error.retry} onRetry={onRetry} />
  );
}

function Empty({ tab, icon }: { tab: SearchTab; icon: LucideIcon }) {
  return <EmptyState icon={icon} title={t.empty[tab].title} description={t.empty[tab].description} />;
}

function StoryResults({
  term,
  locale,
  coverUrlFor,
  storyView,
}: {
  term: string;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
  storyView: ReturnType<typeof useStoryView>;
}) {
  const results = useSearchStories(term);
  const stories = results.data?.pages.flatMap((page) => page.items) ?? [];

  if (results.isError && stories.length === 0) return <Failed onRetry={() => results.refetch()} />;
  if (results.isPending) return <Loading grid />;
  if (stories.length === 0) return <Empty tab="stories" icon={Search} />;
  return (
    <StoryListFrame frameRef={storyView.containerRef}>
      <InfiniteList
        items={stories}
        getKey={(story) => story.id}
        listClassName={storyView.listClassName}
        renderItem={(story) => (
          <StoryTile story={story} locale={locale} coverUrlFor={coverUrlFor} variant={storyView.view} />
        )}
        hasMore={results.hasNextPage}
        isLoadingMore={results.isFetchingNextPage}
        onLoadMore={() => void results.fetchNextPage()}
        loadMoreLabel={t.loadMore}
        loadError={results.isError ? { title: t.error.title, retryLabel: t.error.retry } : undefined}
        loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
        endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{t.endOfResults}</p>}
      />
    </StoryListFrame>
  );
}

function AuthorResults({ term }: { term: string }) {
  const results = useSearchAuthors(term);
  const authors = results.data?.pages.flatMap((page) => page.items) ?? [];

  if (results.isError && authors.length === 0) return <Failed onRetry={() => results.refetch()} />;
  if (results.isPending) return <Loading />;
  if (authors.length === 0) return <Empty tab="authors" icon={UserRound} />;
  return (
    <>
      <ul aria-label={t.tabs.authors} className="flex flex-col gap-2">
        {authors.map((author) => (
          <li key={author.userId}>
            <AuthorRow author={author} />
          </li>
        ))}
      </ul>
      {results.hasNextPage ? (
        <Button variant="outline" disabled={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()}>
          {t.loadMore}
        </Button>
      ) : null}
    </>
  );
}

// Author rows open the author page; tag rows open the home feed filtered by that tag.
function AuthorRow({ author }: { author: AuthorHit }) {
  return (
    <AppLink
      href={authorHref(author.username)}
      className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent"
    >
      <UserAvatar storageKey={author.avatarStorageKey} fallback={firstLetter(author.displayName)} />
      <div className="min-w-0">
        <p className="truncate font-medium">{author.displayName}</p>
        <p className="truncate text-sm text-muted-foreground">
          @{author.username} · {t.storiesCount(author.storiesCount)}
        </p>
      </div>
    </AppLink>
  );
}

function TagResults({ term }: { term: string }) {
  const results = useSearchTags(term);

  if (results.isError) return <Failed onRetry={() => results.refetch()} />;
  if (results.isPending) return <Loading />;
  if (results.data.length === 0) return <Empty tab="tags" icon={TagIcon} />;
  return (
    <ul aria-label={t.tabs.tags} className="flex flex-col gap-2">
      {results.data.map((tag: TagHit) => (
        <li key={tag.id}>
          <AppLink
            href={homeHref({ tagSlug: tag.slug })}
            className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-accent"
          >
            <span className="truncate font-medium">#{tag.name}</span>
            <span className="shrink-0 text-sm text-muted-foreground">{t.tagStoriesCount(tag.storiesCount)}</span>
          </AppLink>
        </li>
      ))}
    </ul>
  );
}
