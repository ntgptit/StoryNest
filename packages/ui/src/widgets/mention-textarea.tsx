/* Lucian UX/UI Prompt #268 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#268 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import {
  Fragment,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/utils.ts";

export interface MentionCandidate {
  username: string;
  /** Display name (falls back to the username). */
  name: string;
}

/** A name after @: the username rule of the server (3 to 30 of A-Z a-z 0-9 _), here 0 to 30 while it is being typed. */
const TYPING = /^[A-Za-z0-9_]{0,30}$/;
const BEFORE_AT = /[A-Za-z0-9_@]/;
/** Same rule as the server's comment_mentioned_usernames: not glued to a word or another @, not followed by one. */
const MENTION = /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,30})(?![A-Za-z0-9_])/g;

/** The @word being typed at `caret`: where its @ is and what follows it, or null when the caret is not in one. */
export function mentionQueryAt(text: string, caret: number): { start: number; query: string } | null {
  const start = text.lastIndexOf("@", caret - 1);
  if (start < 0) return null;
  const query = text.slice(start + 1, caret);
  if (!TYPING.test(query)) return null;
  if (start > 0 && BEFORE_AT.test(text[start - 1] ?? "")) return null;
  return { start, query };
}

/** `text` with the @word from `start` to `caret` replaced by `@username ` and the caret after it. */
export function insertMention(text: string, start: number, caret: number, username: string) {
  const inserted = `@${username} `;
  return { text: text.slice(0, start) + inserted + text.slice(caret), caret: start + inserted.length };
}

/** The distinct names mentioned in `text`, lower-cased, in order (what the server will look up). */
export function mentionedNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(MENTION)) {
    const name = (match[2] ?? "").toLowerCase();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** `text` cut into plain parts and @mentions, for the marks drawn behind the field (and for showing a comment). */
export function splitMentions(text: string): { text: string; mention: boolean }[] {
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const at = (match.index ?? 0) + (match[1] ?? "").length;
    if (at > last) parts.push({ text: text.slice(last, at), mention: false });
    parts.push({ text: text.slice(at, (match.index ?? 0) + match[0].length), mention: true });
    last = (match.index ?? 0) + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts;
}

/** `name` with the first case-insensitive occurrence of `query` in bold (the element's matching letters). */
function Matched({ name, query }: { name: string; query: string }) {
  const at = query === "" ? -1 : name.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, at)}
      <b className="font-extrabold text-primary">{name.slice(at, at + query.length)}</b>
      {name.slice(at + query.length)}
    </>
  );
}

// The field and the mirror behind it share every metric that decides where text wraps.
const BOX =
  "w-full rounded-md border px-3 py-2 text-base leading-6 break-words whitespace-pre-wrap md:text-sm md:leading-6";
/** Mirror styles copied from the field when measuring where the caret is. */
const COPIED = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
] as const;

/** Where the @ at `index` sits inside the field (px from the field's top-left), measured with a hidden copy. */
function caretPoint(field: HTMLTextAreaElement, index: number): { x: number; y: number } {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return { x: 0, y: 0 };
  const style = window.getComputedStyle(field);
  const copy = document.createElement("div");
  for (const key of COPIED) copy.style[key] = style[key];
  copy.style.position = "absolute";
  copy.style.top = "0";
  copy.style.left = "0";
  copy.style.visibility = "hidden";
  copy.style.whiteSpace = "pre-wrap";
  copy.style.overflowWrap = "break-word";
  copy.textContent = field.value.slice(0, index);
  const at = document.createElement("span");
  at.textContent = "@";
  copy.appendChild(at);
  field.parentElement?.appendChild(copy);
  const point = { x: at.offsetLeft, y: at.offsetTop + at.offsetHeight - field.scrollTop };
  copy.remove();
  return point;
}

/** List width (the element's 178px, a little wider for real names). */
const LIST_REM = 13;

/**
 * Comment box where typing @ opens a list of people right under the @ (Lucian 268): it narrows as you keep typing
 * (the matching letters in bold), ↑/↓ move, Enter or Tab or a press puts `@username ` into the text, Esc closes.
 * Mentions in the text get a soft mark behind them, and the people picked so far stack up below as initials under
 * `notifyLabel`. The field is a combobox (aria-autocomplete="list"); the list is a listbox. Candidates come from the
 * caller: `onQueryChange` reports the typed name (null when the list closes) and `candidates` are shown as they are.
 * The avatars pop in only when someone is added; nothing moves on first render. Other props go to the textarea.
 */
export function MentionTextarea({
  value,
  onValueChange,
  candidates,
  onQueryChange,
  listLabel,
  emptyLabel,
  notifyLabel,
  className,
  onKeyDown,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  candidates: readonly MentionCandidate[];
  onQueryChange: (query: string | null) => void;
  /** Name of the list ("People"). */
  listLabel: string;
  /** Shown when nobody matches ("Nobody by that name"). */
  emptyLabel: string;
  /** Title of the row of picked people ("Mentioned"); the row is hidden while nobody is mentioned. */
  notifyLabel: string;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<{ start: number; query: string } | null>(null);
  const [selected, setSelected] = useState(0);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [picked, setPicked] = useState<MentionCandidate[]>([]);
  const [fieldWidth, setFieldWidth] = useState(0);
  const listId = useId();

  const open = query !== null;
  const optionId = (index: number) => `${listId}-o${index}`;

  const current = useRef<{ start: number; query: string } | null>(null);
  const report = (next: { start: number; query: string } | null) => {
    const before = current.current;
    current.current = next;
    setQuery(next);
    if (before?.query !== next?.query || before?.start !== next?.start) {
      onQueryChange(next ? next.query : null);
      setSelected(0);
    }
  };

  const update = (field: HTMLTextAreaElement) => {
    const next = mentionQueryAt(field.value, field.selectionStart ?? field.value.length);
    if (next) {
      setPoint(caretPoint(field, next.start));
      setFieldWidth(field.offsetWidth);
    }
    report(next);
  };

  const choose = (candidate: MentionCandidate) => {
    const field = fieldRef.current;
    if (!field || !query) return;
    const result = insertMention(value, query.start, field.selectionStart ?? value.length, candidate.username);
    onValueChange(result.text);
    setPicked((current) =>
      current.some((p) => p.username.toLowerCase() === candidate.username.toLowerCase())
        ? current
        : [...current, candidate],
    );
    report(null);
    requestAnimationFrame(() => {
      field.focus({ preventScroll: true });
      field.setSelectionRange(result.caret, result.caret);
    });
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && candidates.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setSelected((current) => (current + step + candidates.length) % candidates.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const candidate = candidates[selected];
        if (candidate) {
          event.preventDefault();
          choose(candidate);
          return;
        }
      }
    }
    if (open && event.key === "Escape") {
      event.preventDefault();
      report(null);
      return;
    }
    onKeyDown?.(event);
  };

  // The marks scroll with the text.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    const mirror = mirrorRef.current;
    if (field && mirror) mirror.scrollTop = field.scrollTop;
  });

  const names = mentionedNames(value);
  const shownPeople = picked.filter((p) => names.includes(p.username.toLowerCase()));
  const listWidth = LIST_REM * 16;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-md bg-transparent dark:bg-input/30">
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn(
            BOX,
            "pointer-events-none absolute inset-0 overflow-hidden border-transparent text-transparent",
          )}
        >
          {splitMentions(value).map((part, index) =>
            part.mention ? (
              <mark
                key={index}
                className="rounded-sm bg-mention text-transparent shadow-[0_0_0_2px_var(--color-mention)]"
              >
                {part.text}
              </mark>
            ) : (
              <Fragment key={index}>{part.text}</Fragment>
            ),
          )}
          {"​"}
        </div>
        <textarea
          ref={fieldRef}
          {...props}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && candidates[selected] ? optionId(selected) : undefined}
          spellCheck={false}
          onChange={(event) => {
            onValueChange(event.target.value);
            update(event.target);
          }}
          onClick={(event) => update(event.currentTarget)}
          onKeyDown={onKey}
          onBlur={(event) => {
            props.onBlur?.(event);
            setTimeout(() => report(null), 150);
          }}
          onScroll={(event) => {
            if (mirrorRef.current) mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
          className={cn(
            BOX,
            "relative field-sizing-content min-h-16 resize-none border-input bg-transparent caret-primary shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className,
          )}
        />
        <div
          id={listId}
          role="listbox"
          aria-label={listLabel}
          data-open={open}
          style={{ left: Math.max(0, Math.min(point.x, (fieldWidth || listWidth) - listWidth)), top: point.y + 4 }}
          className={cn(
            "absolute z-30 w-52 max-w-full origin-top-left rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg [transition:transform_0.2s_var(--ease-mention-pop),opacity_0.12s]",
            open ? "scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-90 opacity-0",
          )}
        >
          {open && candidates.length === 0 ? (
            <p className="p-2 text-xs font-semibold text-muted-foreground">{emptyLabel}</p>
          ) : null}
          {open
            ? candidates.map((candidate, index) => (
                <div
                  key={candidate.username}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(candidate)}
                  className={cn(
                    "flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-muted",
                    index === selected && "bg-muted",
                  )}
                >
                  <Initial name={candidate.name || candidate.username} />
                  <span className="min-w-0 flex-1 truncate">
                    <Matched name={candidate.name || candidate.username} query={query?.query ?? ""} />
                  </span>
                  <small className="truncate text-xs text-muted-foreground">
                    @<Matched name={candidate.username} query={query?.query ?? ""} />
                  </small>
                </div>
              ))
            : null}
        </div>
      </div>
      {shownPeople.length > 0 ? (
        <div className="flex items-center gap-2">
          <small className="text-xs font-bold whitespace-nowrap text-muted-foreground">{notifyLabel}</small>
          <span className="flex min-h-7 items-center pl-1.5">
            {shownPeople.map((person) => (
              <Initial
                key={person.username}
                name={person.name || person.username}
                title={`@${person.username}`}
                className="-ml-1.5 size-7 ring-[2.5px] ring-background motion-safe:animate-mention-in"
              />
            ))}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Initial({ name, title, className }: { name: string; title?: string; className?: string }): ReactNode {
  return (
    <i
      aria-hidden={title ? undefined : true}
      title={title}
      className={cn(
        "grid size-6 flex-none place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground not-italic",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </i>
  );
}
