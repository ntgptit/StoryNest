/* Lucian UX/UI Prompt #128 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#128 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ArrowRight, CaseSensitive, ChevronDown, ChevronUp, Replace, ReplaceAll, X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export interface FindReplaceBarLabels {
  region: string;
  find: string;
  replace: string;
  caseSensitive: string;
  previous: string;
  next: string;
  replaceOne: string;
  replaceAll: string;
  close: string;
}

/**
 * Find-and-replace panel: what to find → what to put instead, "replace all" at the end of that row, and under it the
 * match count ("3/12"), previous/next, a case-sensitive toggle, "replace" (the current match) and close.
 * Keyboard: Enter / Shift+Enter in the find field go to the next / previous match, Enter in the replace field replaces
 * the current one, Esc closes, Ctrl/Cmd+F selects the find field again. Presentation only: the host does the searching
 * and announces results through `status` (a polite live region).
 */
export function FindReplaceBar({
  find,
  replace,
  caseSensitive,
  current,
  total,
  status,
  focusRequest,
  labels,
  onFindChange,
  onReplaceChange,
  onCaseSensitiveChange,
  onNext,
  onPrevious,
  onReplace,
  onReplaceAll,
  onClose,
  className,
}: {
  find: string;
  replace: string;
  caseSensitive: boolean;
  /** 1-based index of the current match; 0 when there is none. */
  current: number;
  total: number;
  /** Text for screen readers ("3 of 12", "No matches", "5 replaced"). */
  status: string;
  /** Changes whenever the host asks for the find field to be focused (again); also focused on mount. */
  focusRequest: number;
  labels: FindReplaceBarLabels;
  onFindChange: (value: string) => void;
  onReplaceChange: (value: string) => void;
  onCaseSensitiveChange: (value: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
  className?: string;
}) {
  const findRef = useRef<HTMLInputElement>(null);
  const findId = useId();
  const replaceId = useId();

  useEffect(() => {
    findRef.current?.focus();
    findRef.current?.select();
  }, [focusRequest]);

  const none = total === 0;

  const common = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return true;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      findRef.current?.focus();
      findRef.current?.select();
      return true;
    }
    return false;
  };

  const inputClass =
    "h-9 w-full min-w-0 rounded-none border-0 border-b border-input bg-transparent px-0.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring md:text-sm";

  return (
    <div
      role="search"
      aria-label={labels.region}
      data-slot="find-replace-bar"
      className={cn(
        "flex flex-col gap-2 rounded-xs border-t-2 border-primary bg-card px-4 pt-3 pb-2 text-card-foreground shadow-md",
        className,
      )}
      onKeyDown={(event) => void common(event)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1.5">
        <label htmlFor={findId} className="sr-only">
          {labels.find}
        </label>
        <input
          ref={findRef}
          id={findId}
          type="text"
          value={find}
          placeholder={labels.find}
          autoComplete="off"
          spellCheck={false}
          className={inputClass}
          onChange={(event) => onFindChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (event.shiftKey) onPrevious();
            else onNext();
          }}
        />
        <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
        <label htmlFor={replaceId} className="sr-only">
          {labels.replace}
        </label>
        <input
          id={replaceId}
          type="text"
          value={replace}
          placeholder={labels.replace}
          autoComplete="off"
          spellCheck={false}
          className={inputClass}
          onChange={(event) => onReplaceChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onReplace();
          }}
        />
        <Button type="button" size="icon" aria-label={labels.replaceAll} disabled={none} onClick={onReplaceAll}>
          <ReplaceAll aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="min-w-12 text-xs text-muted-foreground tabular-nums" aria-hidden>
          {`${current}/${total}`}
        </span>
        <span className="sr-only" aria-live="polite">
          {status}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={labels.previous}
          disabled={none}
          onClick={onPrevious}
        >
          <ChevronUp aria-hidden className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label={labels.next} disabled={none} onClick={onNext}>
          <ChevronDown aria-hidden className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={caseSensitive ? "secondary" : "ghost"}
          aria-label={labels.caseSensitive}
          aria-pressed={caseSensitive}
          onClick={() => onCaseSensitiveChange(!caseSensitive)}
        >
          <CaseSensitive aria-hidden className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={none} onClick={onReplace}>
          <Replace aria-hidden className="size-4" />
          {labels.replaceOne}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={labels.close}
          className="ml-auto"
          onClick={onClose}
        >
          <X aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}
