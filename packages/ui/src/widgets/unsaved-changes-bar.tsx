/* Lucian UX/UI Prompt #250 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#250 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "../components/button.tsx";
import { useTriggerCount } from "../lib/use-trigger-count.ts";
import { cn } from "../lib/utils.ts";

/** How long the bar stays red after a blocked leave, before it shows the count again. */
export const LEAVE_WARNING_MS = 1600;

/**
 * While `dirty`, keeps the page from being left without a decision:
 *  - closing or reloading the tab asks the browser's own "leave site?" question (`message` for the browsers that still
 *    show one), the same beforeunload pattern as the chapter editor;
 *  - a click on an in-app link outside `allowInside` (e.g. the form, whose own Cancel link is an explicit choice) is
 *    stopped and `onBlocked` runs, so the host can point at its Save / Discard bar.
 * Links that open elsewhere (new tab, modifier keys, downloads, other origins) are left alone.
 */
export function useLeaveGuard({
  dirty,
  message,
  onBlocked,
  allowInside,
}: {
  dirty: boolean;
  message: string;
  onBlocked: () => void;
  allowInside?: RefObject<Element | null> | undefined;
}) {
  const blocked = useRef(onBlocked);
  blocked.current = onBlocked;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      if (allowInside?.current?.contains(link)) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page
      event.preventDefault();
      event.stopPropagation();
      blocked.current();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    // Capture phase: runs before the router's own link handler, which would navigate first.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message, allowInside]);
}

/**
 * Bar that rises from the bottom while a form has unsaved changes (Lucian 250): "N unsaved changes" with Discard and
 * Save. `warning` (a counter the host bumps when a leave was blocked) makes it shake, turn red and say `warningText`
 * for a moment, with focus moved to Save. Hidden while clean (inert, out of the tab order), so it never moves on
 * first render. On phones it sits above the BottomNav, from md up at the very bottom, like StickyActionBar.
 */
export function UnsavedChangesBar({
  dirty,
  message,
  warning,
  warningText,
  saveLabel,
  savingLabel,
  discardLabel,
  label,
  saving = false,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  /** "2 unsaved changes"; rolls in when it changes. */
  message: string;
  /** Bumped by the host when the user tried to leave. */
  warning: number;
  warningText: string;
  saveLabel: string;
  savingLabel: string;
  discardLabel: string;
  /** Accessible name of the bar's region. */
  label: string;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const saveRef = useRef<HTMLButtonElement>(null);
  const [warnUntil, setWarnUntil] = useState(0);
  const [lastWarning, setLastWarning] = useState(warning);
  if (warning !== lastWarning) {
    setLastWarning(warning);
    if (dirty) setWarnUntil(warning);
  }
  const warn = warnUntil > 0 && warnUntil === warning && dirty;

  useEffect(() => {
    if (!warn) return;
    saveRef.current?.focus({ preventScroll: true });
    const timer = setTimeout(() => setWarnUntil(0), LEAVE_WARNING_MS);
    return () => clearTimeout(timer);
  }, [warn, warning]);

  const text = warn ? warningText : message;
  const rolled = useTriggerCount(text, (previous, next) => previous !== next);

  return (
    <>
      {dirty ? <div aria-hidden data-part="spacer" className="h-16" /> : null}
      <div
        role="region"
        aria-label={label}
        aria-hidden={dirty ? undefined : true}
        inert={!dirty}
        data-state={dirty ? (warn ? "warning" : "visible") : "hidden"}
        className="pointer-events-none fixed inset-x-0 bottom-above-nav z-30 px-safe md:bottom-0"
      >
        <div
          key={warn ? `warn-${warning}` : "calm"}
          className={cn(
            "pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-2 rounded-t-2xl px-4 py-2 shadow-lg [transition:transform_0.45s_var(--ease-rise),opacity_0.3s_var(--ease-soft),background-color_0.3s] sm:px-6 md:pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            warn ? "animate-shake bg-destructive text-destructive-foreground" : "bg-foreground text-background",
            dirty ? "opacity-100" : "translate-y-[110%] opacity-0",
          )}
        >
          <p role="status" className="relative min-w-0 flex-1 overflow-hidden text-sm font-medium">
            <span key={rolled} className={cn("block truncate", rolled > 0 && "motion-safe:animate-label-roll")}>
              {text}
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-inherit hover:bg-background/15 hover:text-inherit"
            disabled={saving}
            onClick={onDiscard}
          >
            {discardLabel}
          </Button>
          <Button
            ref={saveRef}
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving}
            aria-busy={saving || undefined}
            onClick={onSave}
          >
            {saving ? savingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
