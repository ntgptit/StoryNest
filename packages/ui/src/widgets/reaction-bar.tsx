/* Lucian UX/UI Prompt #077 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#077 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { SmilePlus } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "../lib/utils.ts";

export interface ReactionOption<T extends string> {
  value: T;
  /** What is drawn (an emoji). */
  emoji: string;
  /** Its name for screen readers ("Laugh"). */
  label: string;
}

/** Popover width (the element's 260px at the reader's 16px root) and how far it stays from the screen edge. */
const POPOVER_REM = 15;
const EDGE_PX = 8;
const COLUMNS = 6;

/**
 * Emoji reactions under a message (Lucian 077): a chip per reaction that has any (emoji + count, pressed when it is
 * mine; pressing toggles it) and a smiley button that opens a small picker growing out of it, with its arrow pointing
 * back at the button. Picking an emoji adds that reaction (or just bumps its chip when it is already mine) and the
 * picker shrinks back into the button. Arrow keys move inside the picker, Esc or a press outside closes it, and focus
 * returns to the button. A chip pops only when the reader changes it, never on first render.
 * `onToggle(value, on)` does the work; `disabled` (e.g. a guest) makes the controls call `onDisabledPress` instead.
 */
export function ReactionBar<T extends string>({
  options,
  counts,
  mine,
  onToggle,
  label,
  addLabel,
  pickerLabel,
  chipLabel,
  disabled = false,
  onDisabledPress,
  className,
}: {
  options: readonly ReactionOption<T>[];
  counts: Partial<Record<T, number>>;
  mine: readonly T[];
  onToggle: (value: T, on: boolean) => void;
  /** Name of the group of chips ("Reactions"). */
  label: string;
  /** Name of the smiley button ("Add a reaction"). */
  addLabel: string;
  /** Name of the picker ("Pick a reaction"). */
  pickerLabel: string;
  /** Name of one chip, e.g. "Laugh, 3 people, including you". */
  chipLabel: (option: ReactionOption<T>, count: number, mineToo: boolean) => string;
  disabled?: boolean;
  onDisabledPress?: (() => void) | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [bumps, setBumps] = useState<Partial<Record<T, number>>>({});
  const [place, setPlace] = useState({ left: 0, arrow: 24 });
  const rootRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pickerId = useId();

  const bump = (value: T) => setBumps((current) => ({ ...current, [value]: (current[value] ?? 0) + 1 }));
  const isMine = (value: T) => mine.includes(value);

  const toggle = (value: T) => {
    if (disabled) {
      onDisabledPress?.();
      return;
    }
    bump(value);
    onToggle(value, !isMine(value));
  };

  const close = (backToButton: boolean) => {
    setOpen(false);
    if (backToButton) addRef.current?.focus({ preventScroll: true });
  };

  const pick = (value: T) => {
    bump(value);
    if (!isMine(value)) onToggle(value, true);
    close(true);
  };

  // Place the picker over the button, inside the screen (the element's ax - 40 with a 10px edge).
  useLayoutEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const add = addRef.current;
    if (!root || !add) return;
    const rootBox = root.getBoundingClientRect();
    const centre = add.offsetLeft + add.offsetWidth / 2;
    const width = popRef.current?.offsetWidth || POPOVER_REM * 16;
    const viewport = typeof window === "undefined" ? width + 2 * EDGE_PX : window.innerWidth;
    const minLeft = EDGE_PX - rootBox.left;
    const maxLeft = viewport - EDGE_PX - width - rootBox.left;
    const left = Math.max(minLeft, Math.min(maxLeft, centre - 40));
    setPlace({ left, arrow: Math.max(14, Math.min(width - 14, centre - left)) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    emojiRefs.current[active]?.focus({ preventScroll: true });
    // Only when it opens: moving inside the picker focuses the next button itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popRef.current?.contains(target) || addRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);

  const onPickerKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (((active + step) % options.length) + options.length) % options.length;
    setActive(next);
    emojiRefs.current[next]?.focus();
  };

  const shown = options.filter((option) => (counts[option.value] ?? 0) > 0);

  return (
    <div ref={rootRef} className={cn("relative flex flex-wrap items-center gap-1.5", className)}>
      <div role="group" aria-label={label} className="contents">
        {shown.map((option) => {
          const count = counts[option.value] ?? 0;
          const pressed = isMine(option.value);
          const times = bumps[option.value] ?? 0;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={disabled ? undefined : pressed}
              aria-label={chipLabel(option, count, pressed)}
              onClick={() => toggle(option.value)}
              className={cn(
                "inline-flex h-7 items-center rounded-full bg-muted px-2 text-sm outline-none [transition:box-shadow_0.2s,background-color_0.2s,transform_0.3s_var(--ease-spring)] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-90",
                pressed && "bg-accent shadow-[inset_0_0_0_1.5px_var(--color-primary)]",
              )}
            >
              <span
                key={times}
                className={cn("inline-flex items-center gap-1", times > 0 && "motion-safe:animate-chip-pop")}
              >
                <span aria-hidden>{option.emoji}</span>
                <span
                  className={cn("text-xs font-bold tabular-nums", pressed ? "text-primary" : "text-muted-foreground")}
                >
                  {count}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        ref={addRef}
        type="button"
        aria-label={addLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={pickerId}
        onClick={() => {
          if (disabled) {
            onDisabledPress?.();
            return;
          }
          setOpen((current) => !current);
        }}
        className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground outline-none [transition:background-color_0.2s,transform_0.3s_var(--ease-spring)] hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-expanded:bg-accent aria-expanded:text-foreground"
      >
        <SmilePlus aria-hidden className="size-4" />
      </button>
      <div
        ref={popRef}
        id={pickerId}
        role="dialog"
        aria-label={pickerLabel}
        inert={!open}
        aria-hidden={open ? undefined : true}
        data-open={open}
        onKeyDown={onPickerKey}
        style={{ left: place.left, transformOrigin: `${place.arrow}px calc(100% + 10px)` }}
        className={cn(
          "absolute bottom-full z-30 mb-3 w-60 max-w-[calc(100vw-1rem)] rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg",
          open
            ? "scale-100 opacity-100 [transition:transform_0.45s_var(--ease-spring),opacity_0.2s]"
            : "pointer-events-none scale-[0.3] opacity-0 [transition:transform_0.3s_var(--ease-soft),opacity_0.2s]",
        )}
      >
        <div className="grid grid-cols-6 gap-0.5">
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(node) => {
                emojiRefs.current[index] = node;
              }}
              type="button"
              tabIndex={index === active ? 0 : -1}
              aria-label={option.label}
              aria-pressed={isMine(option.value)}
              onClick={() => pick(option.value)}
              onFocus={() => setActive(index)}
              className="h-9 rounded-xl text-xl leading-none outline-none [transition:transform_0.25s_var(--ease-spring),background-color_0.15s] hover:scale-[1.18] hover:bg-muted focus-visible:scale-[1.18] focus-visible:bg-muted active:scale-90"
            >
              <span aria-hidden>{option.emoji}</span>
            </button>
          ))}
        </div>
        <span
          aria-hidden
          style={{ left: place.arrow }}
          className="absolute -bottom-1.5 -ml-1.5 size-3 rotate-45 rounded-[2px] border-r border-b bg-popover"
        />
      </div>
    </div>
  );
}
