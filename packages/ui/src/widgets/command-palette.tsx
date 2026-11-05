/* Lucian UX/UI Prompt #046 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#046 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "../components/dialog.tsx";

export interface PaletteItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
}

export interface PaletteGroup {
  key: string;
  label: string;
  items: readonly PaletteItem[];
}

/** The label with the first case-insensitive match of `term` marked, like the element's highlighted letters. */
function Highlighted({ label, term }: { label: string; term: string }): ReactNode {
  const at = term ? label.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return label;
  return (
    <>
      {label.slice(0, at)}
      <mark className="bg-transparent font-semibold text-primary">{label.slice(at, at + term.length)}</mark>
      {label.slice(at + term.length)}
    </>
  );
}

/**
 * Command palette (keyboard first, desktop): a dialog with one search field over grouped results. The field is a
 * combobox: ↑/↓ move the highlight through every row (wrapping), Enter runs the highlighted row, Escape closes, and
 * the mouse can pick a row too. The caller filters the groups for `query` (so suggestions can come from the server);
 * matched letters are marked. Pure presentation.
 */
export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  labels,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  groups: readonly PaletteGroup[];
  labels: { title: string; input: string; placeholder: string; empty: string; results: string };
  /** Optional line under the list, e.g. the key hints. */
  footer?: ReactNode;
}) {
  const listId = useId();
  const [active, setActive] = useState(0);
  const visible = groups.filter((group) => group.items.length > 0);
  const rows = visible.flatMap((group) => group.items);
  const current = rows.length === 0 ? -1 : Math.min(active, rows.length - 1);

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (rows.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(current <= 0 ? rows.length - 1 : current - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(rows[current]);
    }
  };

  // Index of each group's first row in `rows`, for the option ids and the highlight.
  const starts = visible.map((_, at) => visible.slice(0, at).reduce((sum, group) => sum + group.items.length, 0));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{labels.title}</DialogTitle>
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <input
            role="combobox"
            aria-label={labels.input}
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={current >= 0 ? `${listId}-${current}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={labels.placeholder}
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div
          id={listId}
          role="listbox"
          aria-label={labels.results}
          className="max-h-[min(24rem,60dvh)] overflow-y-auto p-2"
        >
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            visible.map((group, groupAt) => (
              <div key={group.key} role="group" aria-label={group.label}>
                <p
                  aria-hidden
                  className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {group.label}
                </p>
                {group.items.map((item, itemAt) => {
                  const at = (starts[groupAt] ?? 0) + itemAt;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      id={`${listId}-${at}`}
                      role="option"
                      aria-selected={at === current}
                      onMouseMove={() => setActive(at)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => run(item)}
                      className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground aria-selected:shadow-[inset_3px_0_0_var(--primary)]"
                    >
                      {Icon ? <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
                      <span className="min-w-0 truncate">
                        <Highlighted label={item.label} term={query.trim()} />
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {footer ? (
          <div aria-hidden className="flex items-center gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
