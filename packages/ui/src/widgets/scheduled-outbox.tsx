/* Lucian UX/UI Prompt #190 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#190 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";

import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

/**
 * A list of things that will go out at a set time, in time order, hung on a vertical rail. Children are
 * `ScheduledOutboxItem`s.
 */
export function ScheduledOutbox({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-slot="scheduled-outbox" className={cn("flex flex-col gap-2", className)}>
      <div>
        <h2 id={headingId} className="text-base font-semibold">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <ol aria-labelledby={headingId} className="flex flex-col gap-3 border-l border-input pl-4">
        {children}
      </ol>
    </section>
  );
}

/**
 * One scheduled item: its time on top (a button that opens `editor` to change it), the title, a line of details
 * and the actions. When `when` changes after the first render (rescheduled), the time dips in to show it moved.
 */
export function ScheduledOutboxItem({
  when,
  whenDetail,
  editLabel,
  editing,
  onEditingChange,
  editor,
  title,
  meta,
  actions,
  notice,
  editable = true,
  className,
}: {
  /** The time as people say it ("in 3 hours"). */
  when: string;
  /** The exact time ("5 Nov 2026, 14:30 (Asia/Ho_Chi_Minh)"). */
  whenDetail: string;
  /** Accessible name of the time button, e.g. "Change the time of Chapter 3". */
  editLabel: string;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  editor: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Shown under the actions, e.g. why the last action failed. */
  notice?: ReactNode;
  /** false: the time is shown as text, without the button that opens `editor`. */
  editable?: boolean;
  className?: string;
}) {
  const editorId = useId();
  const moved = useTriggerCount(whenDetail, (previous, next) => previous !== next);
  const time = (
    <span key={moved} className={cn("inline-flex flex-wrap gap-x-1.5", moved > 0 && "animate-outbox-moved")}>
      <span className="font-medium text-foreground">{when}</span>
      <span>· {whenDetail}</span>
    </span>
  );
  return (
    <li
      data-slot="scheduled-outbox-item"
      className={cn(
        "flex flex-col gap-3 rounded-l-sm rounded-r-xl border bg-card px-4 py-3.5 text-card-foreground",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        {editable ? (
          <button
            type="button"
            aria-expanded={editing}
            aria-controls={editorId}
            aria-label={`${editLabel}: ${when}, ${whenDetail}`}
            onClick={() => onEditingChange(!editing)}
            className="flex w-fit flex-wrap items-center gap-x-1.5 rounded-sm font-mono text-xs text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {time}
            <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", editing && "rotate-180")} />
          </button>
        ) : (
          <p className="flex flex-wrap gap-x-1.5 font-mono text-xs text-muted-foreground tabular-nums">{time}</p>
        )}
        <div id={editorId} hidden={!(editable && editing)}>
          {editable && editing ? editor : null}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-base font-semibold">{title}</div>
        {meta ? <div className="truncate pt-0.5 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      {notice}
    </li>
  );
}
