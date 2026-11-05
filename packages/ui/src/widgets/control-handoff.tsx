/* Lucian UX/UI Prompt #196 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#196 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { MousePointer2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.ts";

export interface HandoffPerson {
  id: string;
  name: string;
  /** Holds the edit control now. */
  editing: boolean;
  /** Asked for the control. */
  asked: boolean;
}

/**
 * Shared control hand-off (Lucian 196, the control part): the people on a draft as cursor tags. The one holding the
 * control is filled and lifted, with "editing" after the name; someone who asked for it is marked. When the control
 * moves, the lift glides to the new holder (0.6 s, the element's curve); nothing moves on first render, and the global
 * reduced-motion clamp makes it a jump. The caller supplies the status line and the buttons (ask, hand over, keep).
 */
export function ControlHandoff({
  people,
  editingLabel,
  askedLabel,
  status,
  label,
  children,
  className,
}: {
  people: readonly HandoffPerson[];
  /** "editing". */
  editingLabel: string;
  /** "asked to edit". */
  askedLabel: string;
  status: ReactNode;
  /** Name of the list, e.g. "Who is editing". */
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-sm", className)}>
      <ul aria-label={label} className="flex flex-wrap gap-2 pt-2">
        {people.map((person) => (
          <li
            key={person.id}
            className={cn(
              "flex items-start gap-1 transition-[translate,opacity] duration-600 ease-handoff",
              person.editing ? "-translate-y-1.5 opacity-100" : "opacity-75",
            )}
          >
            <MousePointer2
              aria-hidden
              className={cn("size-4 shrink-0", person.editing ? "fill-primary text-primary" : "text-muted-foreground")}
            />
            <span
              className={cn(
                "mt-2 rounded-sm px-2 py-1 text-xs font-medium",
                person.editing ? "bg-primary text-primary-foreground shadow-sm" : "border bg-background",
                person.asked && !person.editing && "border-dashed border-primary text-primary",
              )}
            >
              {person.name}
              {person.editing ? ` · ${editingLabel}` : person.asked ? ` · ${askedLabel}` : ""}
            </span>
          </li>
        ))}
      </ul>
      <p role="status" className="text-muted-foreground">
        {status}
      </p>
      {children === undefined ? null : <div className="flex flex-wrap gap-2">{children}</div>}
    </section>
  );
}
