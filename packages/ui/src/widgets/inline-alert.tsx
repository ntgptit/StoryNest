/* Lucian UX/UI Prompt #072 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#072 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { AlertCircle, Info, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { cn } from "../lib/utils.ts";

/** Fold (0.45 s) after its 0.12 s delay, as in the element; the alert leaves the tree once it has folded. */
export const INLINE_ALERT_FOLD_MS = 570;

export type InlineAlertTone = "info" | "danger";

const TONE = {
  info: { box: "border-border bg-card", bar: "bg-primary", icon: "bg-primary text-primary-foreground", title: "" },
  danger: {
    box: "border-destructive/30 bg-destructive/10",
    bar: "bg-destructive",
    icon: "bg-destructive text-destructive-foreground",
    title: "text-destructive",
  },
} as const;

/**
 * One inline alert row (Lucian 072): a tinted box with a tone bar and icon, a title, a description and actions.
 * With `onDismiss`, an × folds it away: the box slides aside while its height collapses so what is below moves up,
 * then `onDismiss` runs and focus moves to `focusAfterDismiss` (the button that had it is gone). Without `onDismiss` it
 * cannot be closed (e.g. a conflict that must be resolved).
 * Nothing moves on first render; the fold only plays after a press. `role` is "alert" for errors (announced at once)
 * and "status" otherwise.
 */
export function InlineAlert({
  tone = "info",
  title,
  children,
  actions,
  role = tone === "danger" ? "alert" : "status",
  onDismiss,
  dismissLabel,
  focusAfterDismiss,
  className,
}: {
  tone?: InlineAlertTone;
  title?: ReactNode;
  /** The description under the title (or the only text). */
  children?: ReactNode;
  actions?: ReactNode;
  role?: "alert" | "status";
  onDismiss?: (() => void) | undefined;
  /** Accessible name of the × (required with `onDismiss`). */
  dismissLabel?: string | undefined;
  focusAfterDismiss?: RefObject<HTMLElement | null> | undefined;
  className?: string | undefined;
}) {
  const [folding, setFolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const look = TONE[tone];
  const Icon = tone === "danger" ? AlertCircle : Info;

  useEffect(() => () => clearTimeout(timer.current), []);

  const dismiss = () => {
    if (folding || !onDismiss) return;
    setFolding(true);
    timer.current = setTimeout(() => {
      onDismiss();
      focusAfterDismiss?.current?.focus({ preventScroll: true });
    }, INLINE_ALERT_FOLD_MS);
  };

  return (
    <div
      data-slot="inline-alert"
      data-state={folding ? "folding" : "open"}
      inert={folding || undefined}
      className={cn(
        "grid [transition:grid-template-rows_0.45s_var(--ease-soft)_0.12s]",
        folding ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          role={role}
          className={cn(
            "relative flex gap-3 rounded-md border py-3 pr-2 pl-3 text-sm [transition:transform_0.4s_var(--ease-soft),opacity_0.3s]",
            look.box,
            folding && "translate-x-10 opacity-0",
          )}
        >
          <span aria-hidden className={cn("absolute top-3 bottom-3 left-0 w-[3px] rounded-r-[3px]", look.bar)} />
          <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-md", look.icon)}>
            <Icon className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {title ? <p className={cn("font-medium", look.title)}>{title}</p> : null}
            {children ? <div className={cn(title ? "text-muted-foreground" : look.title)}>{children}</div> : null}
            {actions ? <div className="mt-1 flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {onDismiss ? (
            <button
              type="button"
              aria-label={dismissLabel}
              onClick={dismiss}
              className="-mt-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-[background-color,color,transform] duration-300 ease-spring hover:bg-foreground/10 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-85"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
