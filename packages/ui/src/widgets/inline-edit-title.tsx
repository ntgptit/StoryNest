/* Lucian UX/UI Prompt #033 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#033 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Check, Pencil, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

const SHAKE = "motion-safe:animate-title-shake";

/**
 * A page title its owner edits in place: pressing the title (or the pencil) turns it into a field in the same type,
 * with an underline drawn in from the left. Enter or the check saves, Esc or the cross puts the title back; leaving the
 * field saves too. `validate` returns the message for a refused value (the field shakes and says why); `onSave`
 * rejects with the message to show when the save fails, and the field stays open. A saved title gets a short gleam.
 * The heading stays a real `<h1>` (visually hidden while editing), so the page outline never changes.
 */
export function InlineEditTitle({
  value,
  onSave,
  validate,
  editLabel,
  inputLabel,
  saveLabel,
  cancelLabel,
  className,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  validate?: (next: string) => string | null | undefined;
  /** Accessible name of the title button, e.g. `Rename: ${value}`. */
  editLabel: string;
  inputLabel: string;
  saveLabel: string;
  cancelLabel: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refusals, setRefusals] = useState(0);
  const [saves, setSaves] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);
  const titleButton = useRef<HTMLButtonElement | null>(null);
  const problemId = useId();
  // Whether the field is open right now (a ref: a blur arriving while Esc closes it must not save).
  const open = useRef(false);
  // Replays the gleam on each save (never on mount, see useTriggerCount).
  const gleam = useTriggerCount(saves, (previous, next) => next > previous);

  const start = () => {
    setDraft(value);
    setProblem(null);
    open.current = true;
    setEditing(true);
  };

  const close = () => {
    open.current = false;
    setEditing(false);
    setProblem(null);
  };

  // Focus follows the mode once it is in the DOM: the field (all selected, like the element) when editing starts, the
  // title button when it ends. Never on mount (nor on the second effect run of StrictMode): only a real change moves it.
  const shownMode = useRef(editing);
  const row = useRef<HTMLDivElement | null>(null);
  // A refused value shakes the field; restarting the class replays it for each refusal (the field keeps its focus).
  useEffect(() => {
    const node = row.current;
    if (refusals === 0 || !node) return;
    node.classList.remove(SHAKE);
    void node.offsetWidth;
    node.classList.add(SHAKE);
  }, [refusals]);
  useEffect(() => {
    if (shownMode.current === editing) return;
    shownMode.current = editing;
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else {
      titleButton.current?.focus();
    }
  }, [editing]);

  const refuse = (message: string) => {
    setProblem(message);
    setRefusals((n) => n + 1);
    input.current?.focus();
  };

  const save = async () => {
    if (!open.current || saving) return;
    const next = draft.trim();
    if (next === value.trim()) return close();
    const message = validate?.(next);
    if (message) return refuse(message);
    setSaving(true);
    try {
      await onSave(next);
      setSaves((n) => n + 1);
      close();
    } catch (error) {
      refuse(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return; // an IME is still composing (Vietnamese Telex, CJK)
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  // The action buttons keep the focus in the field (pointerdown default prevented), so pressing Cancel never first
  // saves through the field's blur (Safari does not focus a pressed button).
  const keepFocus = (event: React.PointerEvent) => event.preventDefault();

  if (!editing) {
    return (
      <h1 className={cn("group relative flex min-w-0 items-center gap-1", className)}>
        <button
          ref={titleButton}
          type="button"
          aria-label={editLabel}
          onClick={start}
          className="relative -ml-1.5 min-w-0 cursor-text truncate overflow-hidden rounded-md px-1.5 text-left text-2xl font-semibold tracking-tight transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {value}
          {gleam > 0 ? (
            <span
              key={gleam}
              aria-hidden
              className="pointer-events-none absolute inset-0 hidden bg-linear-to-r from-transparent via-primary/25 to-transparent motion-safe:block motion-safe:animate-title-sweep"
            />
          ) : null}
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={start}
          className="touch-target inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent [@media(hover:none)]:opacity-100"
        >
          <Pencil className="size-4" />
        </button>
      </h1>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <h1 className="sr-only">{value}</h1>
      <div ref={row} className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <input
            ref={input}
            type="text"
            value={draft}
            aria-label={inputLabel}
            aria-invalid={problem !== null}
            aria-describedby={problem ? problemId : undefined}
            readOnly={saving}
            aria-busy={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={(event) => {
              if (event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget as Node | null))
                return;
              void save();
            }}
            className="h-9 w-full min-w-0 bg-transparent text-2xl font-semibold tracking-tight outline-none read-only:opacity-70"
          />
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full motion-safe:animate-title-line",
              problem ? "bg-destructive" : "bg-primary",
            )}
          />
        </div>
        <button
          type="button"
          aria-label={saveLabel}
          disabled={saving}
          onPointerDown={keepFocus}
          onClick={() => void save()}
          className="touch-target inline-flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
        >
          <Check aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-label={cancelLabel}
          disabled={saving}
          onPointerDown={keepFocus}
          onClick={close}
          className="touch-target inline-flex shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      {problem ? (
        <p id={problemId} role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
