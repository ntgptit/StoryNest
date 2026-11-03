import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

/** Failure panel. Text is supplied by the caller (translated, chosen from AppError.kind); this stays presentational. */
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
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra action, e.g. a sign-in link for "unauthenticated". */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", className)}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            {retryLabel ?? "Retry"}
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}
