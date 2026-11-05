import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export function PageHeader({
  title,
  heading,
  description,
  actions,
  onBack,
  backLabel,
  className,
}: {
  title: string;
  /** Replaces the plain `<h1>` (e.g. an InlineEditTitle for the owner); it must render the page's `<h1>` itself. */
  heading?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** Shows a back button when provided; `backLabel` is its accessible name. */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {onBack ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={backLabel ?? "Back"}
          className="-ml-2 shrink-0"
        >
          <ArrowLeft />
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        {heading ?? <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>}
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
