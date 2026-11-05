/* Lucian UX/UI Prompt #275 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#275 */ // token-check-ignore: element number in the required license line, not a colour
import { cn } from "../lib/utils.ts";

export interface OutlineItem {
  id: string;
  label: string;
}

/**
 * "On this page" outline (adapted from Lucian 275): the sections of a text on a thin track, the one being read darker
 * and covered by the accent marker (`aria-current="location"`). Pressing an entry calls `onSelect`; the caller scrolls
 * to the section. The caller decides which section is current (e.g. from the scroll position).
 */
export function SectionOutline({
  title,
  items,
  currentId,
  onSelect,
  className,
}: {
  title: string;
  items: readonly OutlineItem[];
  currentId?: string | null | undefined;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav aria-label={title} data-slot="section-outline" className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ol className="relative flex flex-col pl-3 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:rounded-full before:bg-border">
        {items.map((item) => {
          const current = item.id === currentId;
          return (
            <li key={item.id} className="relative">
              {current ? (
                <span aria-hidden className="absolute inset-y-0 -left-3 w-0.5 rounded-full bg-primary" />
              ) : null}
              <button
                type="button"
                aria-current={current ? "location" : undefined}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [transition:color_0.25s]",
                  current && "font-medium text-foreground",
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
