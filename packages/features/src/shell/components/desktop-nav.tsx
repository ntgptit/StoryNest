"use client";

import { Skeleton } from "@storynest/ui/components/skeleton";
import { isNavItemActive } from "@storynest/ui/widgets/bottom-nav";
import { MegaNav, MegaNavSection, megaNavItemClass, type MegaNavEntry } from "@storynest/ui/widgets/mega-nav";
import { useAuth } from "../../_shared/auth.tsx";
import { AppLink } from "../../_shared/platform.tsx";
import { FOLLOWING_HREF } from "../../author/index.ts";
import { homeHref, rootCategories, useCategories, usePopularTags } from "../../discovery/index.ts";
import { RANKING_PERIODS, rankingHref, rankingText } from "../../ranking/index.ts";
import { navItems } from "../model/nav-items.ts";
import { shellText } from "../strings.ts";

/** Tags offered in the Browse panel (the popular-tags query is shared with the home page filters). */
const BROWSE_TAGS = 8;
const RANKING_HREF = rankingHref();

/**
 * Desktop primary navigation (from md up, where the bottom nav is hidden): the bottom-nav sections plus Browse
 * (categories and popular tags), Rankings (by period) and, for members, Following.
 */
export function DesktopNav({ pathname }: { pathname: string }) {
  const auth = useAuth();
  const [home, ...sections] = navItems();
  const link = (item: { href: string; label: string }): MegaNavEntry => ({
    kind: "link",
    key: item.href,
    href: item.href,
    label: item.label,
    active: isNavItemActive(item, pathname),
  });

  const entries: MegaNavEntry[] = [
    ...(home ? [link(home)] : []),
    { kind: "panel", key: "browse", label: shellText.desktopNav.browse, panel: <BrowsePanel /> },
    {
      kind: "panel",
      key: "ranking",
      label: shellText.desktopNav.ranking,
      active: isNavItemActive({ href: RANKING_HREF }, pathname),
      panel: <RankingPanel />,
    },
    ...(auth.status === "authenticated" ? [link({ href: FOLLOWING_HREF, label: shellText.desktopNav.following })] : []),
    ...sections.map(link),
  ];

  return <MegaNav entries={entries} label={shellText.mainNavigation} LinkComponent={AppLink} />;
}

function BrowsePanel() {
  const categories = useCategories();
  const tags = usePopularTags(BROWSE_TAGS);
  const roots = categories.data ? rootCategories(categories.data) : [];

  return (
    <div className="flex gap-6">
      <MegaNavSection title={shellText.desktopNav.categories}>
        <li>
          <AppLink href={homeHref()} className={megaNavItemClass()}>
            {shellText.desktopNav.allStories}
          </AppLink>
        </li>
        {categories.isPending ? <SkeletonRows /> : null}
        {roots.map((category) => (
          <li key={category.slug}>
            <AppLink href={homeHref({ categorySlug: category.slug })} className={megaNavItemClass()}>
              {category.name}
            </AppLink>
          </li>
        ))}
      </MegaNavSection>
      {/* Tags are an extra: when they fail or there are none, the column is left out. */}
      {tags.isPending || (tags.data && tags.data.length > 0) ? (
        <MegaNavSection title={shellText.desktopNav.popularTags}>
          {tags.isPending ? <SkeletonRows /> : null}
          {(tags.data ?? []).map((tag) => (
            <li key={tag.slug}>
              <AppLink href={homeHref({ tagSlug: tag.slug })} className={megaNavItemClass()}>
                #{tag.name}
              </AppLink>
            </li>
          ))}
        </MegaNavSection>
      ) : null}
    </div>
  );
}

function RankingPanel() {
  return (
    <MegaNavSection title={shellText.desktopNav.periods}>
      {RANKING_PERIODS.map((period) => (
        <li key={period}>
          <AppLink href={rankingHref(period)} className={megaNavItemClass()}>
            {rankingText.periods[period]}
          </AppLink>
        </li>
      ))}
    </MegaNavSection>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <li key={row} aria-hidden className="flex min-h-9 items-center px-2">
          <Skeleton className="h-4 w-24" />
        </li>
      ))}
    </>
  );
}
