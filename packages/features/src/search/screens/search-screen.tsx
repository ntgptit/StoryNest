"use client";

import { Search, UserRound, Tag as TagIcon, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Avatar, AvatarFallback } from "@storynest/ui/components/avatar";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { StoryCard } from "@storynest/ui/widgets/story-card";
import { useNavigation, AppLink } from "../../_shared/platform.tsx";
import { authorHref } from "../../author/index.ts";
import { discoveryText, homeHref, toStoryCardData } from "../../discovery/index.ts";
import { useSearchAuthors, useSearchStories, useSearchTags } from "../hooks/use-search.ts";
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
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

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
        <p role="status" className="text-sm text-muted-foreground">
          {state === "long" ? t.tooLong(SEARCH_MAX_LENGTH) : t.hint(SEARCH_MIN_LENGTH)}
        </p>
      ) : (
        <>
          <h2 className="text-lg font-semibold tracking-tight">{t.resultsFor(term)}</h2>
          <Tabs value={tab} onValueChange={(next) => navigation.replace(searchHref(term, next as SearchTab))}>
            <TabsList>
              {SEARCH_TABS.map((name) => (
                <TabsTrigger key={name} value={name}>
                  {t.tabs[name]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {tab === "stories" ? <StoryResults term={term} locale={locale} coverUrlFor={coverUrlFor} /> : null}
          {tab === "authors" ? <AuthorResults term={term} /> : null}
          {tab === "tags" ? <TagResults term={term} /> : null}
        </>
      )}
    </section>
  );
}

function Loading({ grid = false }: { grid?: boolean }) {
  return (
    <div className={grid ? GRID : "flex flex-col gap-2"} aria-busy role="status" aria-label={t.searching}>
      {Array.from({ length: grid ? 8 : 4 }, (_, i) => (
        <Skeleton key={i} className={grid ? "aspect-[2/3] w-full rounded-xl" : "h-14 w-full rounded-xl"} aria-hidden />
      ))}
    </div>
  );
}

function Failed({ onRetry }: { onRetry: () => void }) {
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
}: {
  term: string;
  locale: string;
  coverUrlFor?: ((key: string) => string) | undefined;
}) {
  const results = useSearchStories(term);
  const stories = results.data?.pages.flatMap((page) => page.items) ?? [];
  const labels = {
    reads: discoveryText.card.reads,
    votes: discoveryText.card.votes,
    updated: discoveryText.card.updated,
  };

  if (results.isError && stories.length === 0) return <Failed onRetry={() => void results.refetch()} />;
  if (results.isPending) return <Loading grid />;
  if (stories.length === 0) return <Empty tab="stories" icon={Search} />;
  return (
    <InfiniteList
      items={stories}
      getKey={(story) => story.id}
      listClassName={GRID}
      renderItem={(story) => (
        <StoryCard
          story={toStoryCardData(story, coverUrlFor)}
          labels={labels}
          LinkComponent={AppLink}
          locale={locale}
        />
      )}
      hasMore={results.hasNextPage}
      isLoadingMore={results.isFetchingNextPage}
      onLoadMore={() => void results.fetchNextPage()}
      loadMoreLabel={t.loadMore}
      loadingFallback={<Skeleton className="mt-4 h-10 w-full rounded-xl" aria-hidden />}
      endMessage={<p className="py-6 text-center text-sm text-muted-foreground">{t.endOfResults}</p>}
    />
  );
}

function AuthorResults({ term }: { term: string }) {
  const results = useSearchAuthors(term);
  const authors = results.data?.pages.flatMap((page) => page.items) ?? [];

  if (results.isError && authors.length === 0) return <Failed onRetry={() => void results.refetch()} />;
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
      <Avatar>
        <AvatarFallback>{Array.from(author.displayName)[0]?.toLocaleUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
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

  if (results.isError) return <Failed onRetry={() => void results.refetch()} />;
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
