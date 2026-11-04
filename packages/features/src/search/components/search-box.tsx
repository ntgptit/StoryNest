"use client";

import { Search } from "lucide-react";
import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { storyHref } from "../../discovery/index.ts";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useDebouncedValue, useSuggestions } from "../hooks/use-search.ts";
import { SUGGESTION_DELAY_MS, isSearchable, normalizeTerm, searchHref } from "../model/search.ts";
import { searchText } from "../strings.ts";

/**
 * Search field of the app header. Typing shows up to five matching stories after a short pause; Enter (or the last
 * row) opens the full results page. On a narrow screen only an icon is shown and it opens the results page, where the
 * field is the first thing. The field is a combobox: arrow keys move through the suggestions, Escape closes them.
 */
export function SearchBox() {
  const navigation = useNavigation();
  const listId = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = normalizeTerm(value);
  const debounced = useDebouncedValue(term, SUGGESTION_DELAY_MS);
  const suggestions = useSuggestions(debounced);
  const stories = isSearchable(debounced) && isSearchable(term) ? (suggestions.data ?? []) : [];
  const showList = open && isSearchable(term);
  // The rows: each story, then "see all". `active` indexes into them.
  const rowCount = stories.length + 1;

  const goToResults = () => {
    setOpen(false);
    navigation.push(searchHref(term));
  };

  const goToStory = (index: number) => {
    const story = stories[index];
    if (!story) return;
    setOpen(false);
    navigation.push(storyHref(story));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (active >= 0 && active < stories.length) return goToStory(active);
    if (isSearchable(term)) goToResults();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current + 1) % rowCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? rowCount - 1 : current - 1));
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="icon" className="sm:hidden">
        <AppLink href={searchHref("")} aria-label={searchText.openSearch}>
          <Search aria-hidden />
        </AppLink>
      </Button>
      <form role="search" onSubmit={submit} className="relative hidden w-full max-w-sm sm:block">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          role="combobox"
          aria-label={searchText.inputLabel}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={searchText.placeholder}
          className="pl-8"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={searchText.suggestionsLabel}
            className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            {stories.map((story, index) => (
              <li
                key={story.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={active === index}
                className="cursor-pointer truncate px-3 py-2 text-sm aria-selected:bg-accent"
                onMouseDown={(event) => {
                  event.preventDefault();
                  goToStory(index);
                }}
              >
                {story.title}
              </li>
            ))}
            <li
              id={`${listId}-${stories.length}`}
              role="option"
              aria-selected={active === stories.length}
              className="cursor-pointer truncate border-t px-3 py-2 text-sm text-muted-foreground aria-selected:bg-accent"
              onMouseDown={(event) => {
                event.preventDefault();
                goToResults();
              }}
            >
              {searchText.seeAll(term)}
            </li>
          </ul>
        ) : null}
      </form>
    </>
  );
}
