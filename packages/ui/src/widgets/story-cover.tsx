import type { ReactNode } from "react";

import { cn } from "../lib/utils.ts";

/** 2:3 story cover. Without an image it shows the title's first letter, so lists never have holes. */
export function StoryCover({
  title,
  coverUrl,
  eager = false,
  className,
  children,
}: {
  title: string;
  coverUrl?: string | null;
  /** Set for the main cover of a page (above the fold); list tiles stay lazy. */
  eager?: boolean;
  className?: string;
  /** Overlay content, e.g. an age badge. */
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted", className)}>
      {coverUrl ? (
        <img src={coverUrl} alt="" loading={eager ? "eager" : "lazy"} className="size-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-center justify-center bg-secondary text-4xl font-semibold text-secondary-foreground"
        >
          {Array.from(title)[0]?.toLocaleUpperCase() ?? "?"}
        </div>
      )}
      {children}
    </div>
  );
}
