import { formatCount } from "@storynest/utils";
import type { LucideIcon } from "lucide-react";

import { cn } from "../lib/utils.ts";

/** Compact counter ("1,2K reads"). `label` is the accessible name, e.g. "Reads"; the number is formatted for `locale`. */
export function StatPill({
  icon: Icon,
  value,
  label,
  locale = "vi",
  className,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  locale?: string;
  className?: string;
}) {
  const formatted = formatCount(value, locale);
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      title={`${label}: ${new Intl.NumberFormat(locale).format(Math.max(0, Math.floor(value)))}`}
    >
      <Icon className="size-3.5" aria-hidden />
      <span aria-hidden>{formatted}</span>
      <span className="sr-only">{`${label}: ${formatted}`}</span>
    </span>
  );
}
