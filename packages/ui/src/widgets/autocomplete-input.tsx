/* Lucian UX/UI Prompt #034 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#034 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useId, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";

import { Input } from "../components/input.tsx";
import { cn } from "../lib/utils.ts";

export interface AutocompleteOption {
  id: string;
  /** What goes into the field when the option is chosen. */
  value: string;
  primary: string;
  secondary?: string;
  /** Avatar or icon on the left (decorative). */
  leading?: ReactNode;
}

/** Row height in rem (h-12), so the highlight can glide from row to row. */
const ROW_REM = 3;

/** `text` with the first case-insensitive occurrence of `query` marked. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const at = needle === "" ? -1 : text.toLowerCase().indexOf(needle);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent text-primary">{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

/**
 * Text field that suggests values as you type (a combobox, aria-autocomplete="both"). The rest of the first matching
 * value shows faintly after the cursor and Tab accepts it; arrow keys move a highlight that glides between rows;
 * Enter or a press chooses the highlighted row; Escape closes the list. What the person typed is always kept: Enter
 * without a highlighted row submits the form as usual, so suggestions never stand in the way of an exact value.
 *
 * The caller owns the value and the options (already filtered); `loading` and `emptyText` describe the list while
 * it has nothing to show. Extra props go to the <input> (id, aria-invalid, aria-describedby...).
 */
export function AutocompleteInput({
  value,
  onValueChange,
  options,
  onSelect,
  listLabel,
  loading = false,
  loadingText,
  emptyText,
  className,
  ...inputProps
}: Omit<ComponentProps<"input">, "value" | "onChange" | "role"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AutocompleteOption[];
  onSelect?: (option: AutocompleteOption) => void;
  listLabel: string;
  loading?: boolean;
  loadingText?: string;
  /** Shown when the list is open, not loading and has no option; without it the list just stays closed. */
  emptyText?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const count = options.length;
  const current = active >= 0 && active < count ? active : -1;

  const status = loading ? loadingText : count === 0 ? emptyText : undefined;
  const showList = open && value.trim() !== "" && (count > 0 || status !== undefined);

  // Ghost completion: the rest of the highlighted (or first) option when it continues what was typed.
  const candidate = options[current >= 0 ? current : 0];
  const ghost =
    showList && candidate && value !== "" && candidate.value.toLowerCase().startsWith(value.toLowerCase())
      ? candidate.value.slice(value.length)
      : "";

  const choose = (option: AutocompleteOption | undefined) => {
    if (!option) return;
    onValueChange(option.value);
    onSelect?.(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    inputProps.onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" && count > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % count);
    } else if (event.key === "ArrowUp" && count > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? count - 1 : index - 1));
    } else if (event.key === "Enter" && showList && current >= 0) {
      event.preventDefault();
      choose(options[current]);
    } else if (event.key === "Tab" && !event.shiftKey && ghost !== "") {
      event.preventDefault();
      choose(candidate);
    } else if (event.key === "Escape" && showList) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {/* Same box and font as the Input, behind its transparent background. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center overflow-hidden border border-transparent px-3 py-1 text-base whitespace-pre text-muted-foreground/70 md:text-sm"
        >
          <span className="invisible">{value}</span>
          {ghost}
        </span>
        <Input
          {...inputProps}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="both"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && current >= 0 ? `${listId}-${current}` : undefined}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={(event) => {
            inputProps.onFocus?.(event);
            setOpen(true);
          }}
          onBlur={(event) => {
            inputProps.onBlur?.(event);
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <div
        className={cn(
          "absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
          !showList && "hidden",
        )}
        // Keeps the focus in the field while a row is pressed (the field's blur would close the list first).
        onMouseDown={(event) => event.preventDefault()}
      >
        <ul id={listId} role="listbox" aria-label={listLabel} className="relative">
          {current >= 0 ? (
            <li
              role="presentation"
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-12 rounded-md bg-accent transition-transform duration-350 ease-spring"
              style={{ transform: `translateY(${current * ROW_REM}rem)` }}
            />
          ) : null}
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={current === index}
              className="relative flex h-12 cursor-pointer items-center gap-3 rounded-md px-2 text-sm motion-safe:animate-option-rise"
              style={{ animationDelay: `${index * 35}ms` }}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option.leading ? <span className="shrink-0">{option.leading}</span> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  <Highlighted text={option.primary} query={value} />
                </span>
                {option.secondary ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    <Highlighted text={option.secondary} query={value} />
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {count === 0 && status ? (
          <p role="status" className="px-2 py-3 text-sm text-muted-foreground">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
