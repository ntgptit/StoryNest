/* Lucian UX/UI Prompt #044 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#044 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  /** Small text at the end of the header, e.g. "50 chapters". */
  meta?: ReactNode;
  content: ReactNode;
}

/**
 * Accordion with one panel open at a time (adapted from Lucian 044): the open panel lifts and unfolds, and one stroke
 * of the plus lies down into a minus. Headers are buttons (aria-expanded / aria-controls); ↑/↓/Home/End move between
 * them. Controlled: `openId` is the open panel (null = all closed). A panel's content is mounted from the first time
 * it opens, so a long hidden list costs nothing until it is asked for; closed panels are inert.
 */
export function AccordionList({
  items,
  openId,
  onOpenChange,
  className,
}: {
  items: readonly AccordionItem[];
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  className?: string;
}) {
  const base = useId();
  const headers = useRef<(HTMLButtonElement | null)[]>([]);
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set(openId ? [openId] : []));
  if (openId && !visited.has(openId)) setVisited(new Set([...visited, openId]));

  const onKeyDown = (event: KeyboardEvent, i: number) => {
    const next =
      event.key === "ArrowDown"
        ? i + 1
        : event.key === "ArrowUp"
          ? i - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    headers.current[(next + items.length) % items.length]?.focus();
  };

  return (
    <div data-slot="accordion-list" className={cn("flex flex-col gap-2", className)}>
      {items.map((item, i) => {
        const open = item.id === openId;
        const headerId = `${base}-h${i}`;
        const panelId = `${base}-p${i}`;
        return (
          <div
            key={item.id}
            data-open={open}
            className="rounded-xl border bg-card [transition:box-shadow_0.5s_var(--ease-soft),translate_0.5s_var(--ease-spring)] data-[open=true]:-translate-y-0.5 data-[open=true]:shadow-md"
          >
            <button
              ref={(el) => {
                headers.current[i] = el;
              }}
              id={headerId}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => onOpenChange(open ? null : item.id)}
              onKeyDown={(event) => onKeyDown(event, i)}
              className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1 text-sm font-medium">{item.title}</span>
              {item.meta ? <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span> : null}
              <span
                aria-hidden
                className={cn(
                  "relative size-7 shrink-0 rounded-full group-hover:scale-110 group-active:scale-90 [transition:background-color_0.35s_var(--ease-soft),scale_0.45s_var(--ease-spring)]",
                  open ? "bg-foreground" : "bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 left-1/2 h-0.5 w-2.5 -translate-1/2 rounded-full [transition:background-color_0.3s]",
                    open ? "bg-background" : "bg-foreground",
                  )}
                />
                <span
                  className={cn(
                    "absolute top-1/2 left-1/2 h-0.5 w-2.5 -translate-1/2 rounded-full [transition:rotate_0.5s_var(--ease-spring),background-color_0.3s]",
                    open ? "rotate-180 bg-background" : "rotate-90 bg-foreground",
                  )}
                />
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              inert={!open}
              className={cn(
                "grid [transition:grid-template-rows_0.5s_var(--ease-soft)]",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "[transition:opacity_0.25s_var(--ease-soft),translate_0.45s_var(--ease-spring)]",
                    open ? "opacity-100 delay-120" : "-translate-y-2 opacity-0",
                  )}
                >
                  {visited.has(item.id) ? item.content : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
