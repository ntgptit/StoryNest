/* Lucian UX/UI Prompt #090 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#090 */ // token-check-ignore: element number in the required license line, not a colour
"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/**
 * Failure panel. Text is supplied by the caller (translated, chosen from AppError.kind); this stays presentational.
 *
 * Retry feedback (adapted from Lucian 090, the widget that plugs back in): when `onRetry` returns a promise (e.g.
 * `() => query.refetch()`), the button shows a spinning ring and is busy until it settles. If the panel is still on
 * screen afterwards the retry failed: the icon shakes once and screen readers hear the title again. No retry happens
 * on its own; automatic retries stay with the data layer.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  action,
  className,
}: {
  title: string;
  description?: string;
  onRetry?: () => void | Promise<unknown>;
  retryLabel?: string;
  /** Extra action, e.g. a sign-in link for "unauthenticated". */
  action?: ReactNode;
  className?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  // Bumped after each retry that settled with the panel still here: replays the shake and the announcement.
  const [failedAgain, setFailedAgain] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const retry = () => {
    if (!onRetry || retrying) return;
    const result = onRetry();
    if (!(result instanceof Promise)) return;
    setRetrying(true);
    void result
      .catch(() => undefined)
      .finally(() => {
        if (!mounted.current) return;
        setRetrying(false);
        setFailedAgain((count) => count + 1);
      });
  };

  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", className)}
    >
      <div
        key={failedAgain}
        data-failed-again={failedAgain > 0 ? "" : undefined}
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive",
          failedAgain > 0 && "animate-shake",
        )}
      >
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {/* The alert region speaks a changed text: after a failed retry it says the title again. */}
      <span className="sr-only">{failedAgain > 0 ? `${title}${failedAgain % 2 === 0 ? "" : " "}` : ""}</span>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button variant="outline" aria-disabled={retrying} aria-busy={retrying} onClick={retry}>
            {retrying ? (
              <span
                aria-hidden
                data-retrying=""
                className="size-4 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
              />
            ) : null}
            {retryLabel ?? "Retry"}
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}
