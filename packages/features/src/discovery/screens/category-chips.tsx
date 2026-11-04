import { AppLink } from "../../_shared/platform.tsx";
import type { Category } from "../model/categories.ts";
import { homeHref } from "../model/home-href.ts";
import { discoveryText } from "../strings.ts";

const CHIP =
  "touch-target inline-flex shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors";

/** Category filter as plain links (`/?category=slug`): shareable URL, no client-side state, works with SSR. A tag filter stays on. */
export function CategoryChips({
  categories,
  activeSlug,
  tagSlug,
}: {
  categories: readonly Category[];
  activeSlug?: string | undefined;
  tagSlug?: string | undefined;
}) {
  const chip = (href: string, label: string, active: boolean) => (
    <li key={href} className="shrink-0">
      <AppLink
        href={href}
        aria-current={active ? "page" : undefined}
        className={`${CHIP} ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
      >
        {label}
      </AppLink>
    </li>
  );

  return (
    <nav aria-label={discoveryText.categoriesLabel} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2">
        {chip(homeHref({ tagSlug }), discoveryText.allCategories, !activeSlug)}
        {categories.map((c) => chip(homeHref({ categorySlug: c.slug, tagSlug }), c.name, c.slug === activeSlug))}
      </ul>
    </nav>
  );
}
