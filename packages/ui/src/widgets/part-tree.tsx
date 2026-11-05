/* Lucian UX/UI Prompt #102 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#102 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { ChevronRight, FolderClosed, FolderOpen } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/**
 * One folder of a nested tree (Lucian 102): a full-width button that opens and closes it, and its contents indented
 * below behind a guide line. The arrow turns when it opens (0.2 s, nothing moves on first render). Used for a story's
 * parts: the chapters of a part sit inside its folder, chapters outside any part sit at the top level.
 *
 * Controlled (`open` + `onOpenChange`) or not (`defaultOpen`). `actions` sit beside the toggle (rename, delete...),
 * outside the button so they stay separate controls.
 */
export function TreeFolder({
  label,
  meta,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  actions,
  children,
  className,
}: {
  label: ReactNode;
  /** Short text after the label, e.g. "3 chapters". */
  meta?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const open = openProp ?? own;
  const branchId = useId();
  const Icon = open ? FolderOpen : FolderClosed;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={branchId}
          onClick={() => {
            setOwn(!open);
            onOpenChange?.(!open);
          }}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 text-left text-sm font-semibold hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ChevronRight
            aria-hidden
            className={cn("size-3.5 shrink-0 transition-transform duration-200", open && "rotate-90")}
          />
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{label}</span>
          {meta === undefined ? null : (
            <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">{meta}</span>
          )}
        </button>
        {actions}
      </div>
      <div id={branchId} hidden={!open} className="ml-5 border-l pl-2.5">
        {children}
      </div>
    </div>
  );
}
