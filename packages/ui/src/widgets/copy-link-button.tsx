/* Lucian UX/UI Prompt #008 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#008 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** How long the check (and the "Copied" bubble) stays before the button goes back to its copy icon. */
export const COPIED_RESET_MS = 1800;

/**
 * Puts `text` on the clipboard. Uses the async Clipboard API where the page may (secure context), otherwise the old
 * select-and-copy command on a temporary off-screen field. The field goes into `container` (default: <body>), so a
 * focus trap such as an open dialog does not pull focus away before the copy runs. Resolves to whether it worked.
 */
export async function copyText(text: string, container?: HTMLElement | null): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext !== false) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // permission refused or no focus: try the fallback below
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.setAttribute("aria-hidden", "true");
    Object.assign(field.style, { position: "fixed", top: "0", left: "0", opacity: "0", pointerEvents: "none" });
    (container ?? document.body).appendChild(field);
    field.select();
    const copied = typeof document.execCommand === "function" && document.execCommand("copy");
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

/** The check from the Lucian element, drawn on the same 24px grid as the Lucide icon it replaces. */
const CHECK_PATH = "M5.5 12.5l4.2 4.2L18.5 8";

/**
 * Copy button whose icon is redrawn as a check once the text is on the clipboard: the copy icon spins out, the check
 * springs in and draws itself, and after a moment it turns back. Icon-only buttons also pop a small "Copied" bubble.
 * The result is announced politely (a live region next to the button) for screen readers. Nothing moves on first
 * render; the movement plays only after a press. If copying fails, `onCopyFailed` runs and the icon stays as it is.
 */
export function CopyLinkButton({
  value,
  label,
  copiedLabel,
  iconOnly = false,
  variant = "outline",
  size,
  className,
  onCopied,
  onCopyFailed,
}: {
  /** The text to copy, or a function that builds it at press time. */
  value: string | (() => string);
  /** Visible text (or the accessible name when `iconOnly`), e.g. "Copy link". */
  label: string;
  /** Shown and announced after a successful copy, e.g. "Copied". */
  copiedLabel: string;
  iconOnly?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  onCopied?: () => void;
  onCopyFailed?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await copyText(typeof value === "function" ? value() : value, wrapper.current);
    if (!ok) {
      onCopyFailed?.();
      return;
    }
    clearTimeout(timer.current);
    setCopied(true);
    onCopied?.();
    timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <span ref={wrapper} data-slot="copy-link-button" className="relative inline-flex">
      <Button
        type="button"
        variant={variant}
        size={size ?? (iconOnly ? "icon" : "default")}
        aria-label={iconOnly ? label : undefined}
        data-state={copied ? "copied" : "idle"}
        className={cn(!iconOnly && "px-3", className)}
        onClick={() => void copy()}
      >
        <span
          aria-hidden
          className={cn("relative inline-flex size-4 shrink-0", copied && variant !== "default" && "text-chart-2")}
        >
          <Copy
            className={cn(
              "absolute inset-0 size-4 [transition:opacity_0.25s_var(--ease-soft),transform_0.5s_var(--ease-spring)]",
              copied ? "scale-40 rotate-30 opacity-0" : "opacity-100",
            )}
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "absolute inset-0 size-4 [transition:opacity_0.25s_var(--ease-soft),transform_0.5s_var(--ease-spring)]",
              copied ? "opacity-100" : "scale-40 -rotate-30 opacity-0",
            )}
          >
            <path
              data-part="check"
              d={CHECK_PATH}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={copied ? 0 : 1}
              className="[transition:stroke-dashoffset_0.4s_var(--ease-soft)_0.1s]"
            />
          </svg>
        </span>
        {iconOnly ? null : <span>{copied ? copiedLabel : label}</span>}
      </Button>
      {iconOnly ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-9 right-0 rounded-md bg-foreground px-2 py-1 text-xs font-semibold whitespace-nowrap text-background [transition:opacity_0.25s_var(--ease-soft),transform_0.5s_var(--ease-spring)]",
            copied ? "opacity-100" : "translate-y-2 scale-80 opacity-0",
          )}
        >
          {copiedLabel}
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </span>
  );
}
