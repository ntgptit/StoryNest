"use client";

// Expanding top-bar search on phones (adapted from Lucian UX/UI Prompt 027, MIT (c) 2026 Seokwoooo,
// lucianlabs.dev/uxui-prompt).

import { Search, X } from "lucide-react";
import { cn } from "@storynest/ui/lib/utils";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { storyHref } from "../../discovery/index.ts";
import { useNavigation } from "../../_shared/platform.tsx";
import { useDebouncedValue, useSuggestions } from "../hooks/use-search.ts";
import { SUGGESTION_DELAY_MS, isSearchable, normalizeTerm, searchHref } from "../model/search.ts";
import { searchText } from "../strings.ts";

/**
 * Search field of the app header. Typing shows up to five matching stories after a short pause; Enter (or the last
 * row) opens the full results page. The field is a combobox: arrow keys move through the suggestions, Escape closes
 * them. On a narrow screen only the search icon shows; pressing it opens the same field over the header row, growing
 * out of the icon, and Escape, the close button or leaving the field folds it back (focus returns to the icon).
 */
export function SearchBox() {
  const navigation = useNavigation();
  const listId = useId();
  const formId = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  /** Phone only: the field is open over the header. Ignored from `sm` up, where the field always shows. */
  const [expanded, setExpanded] = useState(false);
  const [origin, setOrigin] = useState<CSSProperties | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const term = normalizeTerm(value);
  const debounced = useDebouncedValue(term, SUGGESTION_DELAY_MS);
  const suggestions = useSuggestions(debounced);
  const stories = isSearchable(debounced) && isSearchable(term) ? (suggestions.data ?? []) : [];
  const showList = open && isSearchable(term);
  // The rows: each story, then "see all". `active` indexes into them.
  const rowCount = stories.length + 1;

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const expand = () => {
    // The field grows out of the icon: tell the animation where the icon sits inside the header row.
    const button = toggleRef.current;
    const row = button?.offsetParent as HTMLElement | null;
    if (button && row) {
      const box = button.getBoundingClientRect();
      const frame = row.getBoundingClientRect();
      setOrigin({
        "--search-from-left": `${box.left - frame.left}px`,
        "--search-from-right": `${frame.right - box.right}px`,
      } as CSSProperties);
    }
    setExpanded(true);
  };

  const collapse = (refocus: boolean) => {
    if (!expanded) return;
    setExpanded(false);
    setOpen(false);
    setActive(-1);
    if (refocus) window.requestAnimationFrame(() => toggleRef.current?.focus());
  };

  const goToResults = () => {
    setOpen(false);
    setExpanded(false);
    navigation.push(searchHref(term));
  };

  const goToStory = (index: number) => {
    const story = stories[index];
    if (!story) return;
    setOpen(false);
    setExpanded(false);
    navigation.push(storyHref(story));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (active >= 0 && active < stories.length) return goToStory(active);
    if (isSearchable(term)) goToResults();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // First Escape closes the suggestions; with none open it folds the phone field back.
      if (!showList) collapse(true);
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

  // Leaving the form (not moving between its own controls) folds the phone field back.
  const onFormBlur = (event: FocusEvent<HTMLFormElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    window.setTimeout(() => collapse(false), 120);
  };

  return (
    <>
      <Button
        ref={toggleRef}
        type="button"
        variant="ghost"
        size="icon"
        className={cn("sm:hidden", expanded && "invisible")}
        aria-label={searchText.openSearch}
        aria-expanded={expanded}
        aria-controls={formId}
        onClick={expand}
      >
        <Search aria-hidden />
      </Button>
      <form
        id={formId}
        role="search"
        onSubmit={submit}
        onBlur={onFormBlur}
        style={expanded ? origin : undefined}
        className={cn(
          "items-center gap-2 sm:relative sm:inset-auto sm:z-auto sm:flex sm:h-auto sm:w-full sm:max-w-sm sm:animate-none sm:bg-transparent sm:p-0",
          expanded
            ? "absolute inset-x-0 top-[env(safe-area-inset-top)] z-10 flex h-14 bg-background px-4 motion-safe:animate-search-expand"
            : "hidden",
        )}
      >
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
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
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 sm:hidden"
          aria-label={searchText.closeSearch}
          onClick={() => collapse(true)}
        >
          <X aria-hidden />
        </Button>
      </form>
    </>
  );
}
