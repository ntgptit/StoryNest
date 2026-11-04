import { Skeleton } from "../components/skeleton.tsx";
import { cn } from "../lib/utils.ts";

const CARD_COUNT = 8;

/**
 * Placeholder of a whole page while its server render is on the way (route `loading.tsx`): a title line and a grid
 * of cover-shaped cards, the most common page shape. `label` is announced to screen readers.
 */
export function PageSkeleton({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" aria-busy className={cn("flex flex-col gap-6 py-2 sm:py-6", className)}>
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: CARD_COUNT }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
