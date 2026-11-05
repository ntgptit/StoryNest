"use client";

import { Breadcrumbs } from "@storynest/ui/widgets/breadcrumbs";
import { AppLink, useNavigation } from "../../_shared/platform.tsx";
import { useMyStories } from "../hooks/use-my-stories.ts";
import { studioText } from "../strings.ts";

const t = studioText.crumbs;

/** The story sub-pages that have a crumb of their own, with the path segment after `/studio/story/<id>`. */
const PAGES = {
  chapters: { label: t.chapters, segment: "chapters", ownerOnly: false },
  // Only the owner manages the team (TeamScreen), so only stories the author owns are offered there.
  team: { label: t.team, segment: "team", ownerOnly: true },
} as const;

/**
 * Studio › story › this page, in place of the old "Back to story details" link. The story crumb leads to the story's
 * details; the button beside it lists the author's other stories (the studio list, useMyStories) and opens the same
 * page of the one picked. While that list is loading, or when it holds only this story, there is no switcher.
 */
export function StudioCrumbs({
  storyId,
  storyTitle,
  page,
}: {
  storyId: string;
  storyTitle: string;
  page: keyof typeof PAGES;
}) {
  const stories = useMyStories();
  const navigation = useNavigation();
  const { label, segment, ownerOnly } = PAGES[page];
  const options = (stories.data ?? [])
    .filter((story) => !ownerOnly || story.role === "owner")
    .map((story) => ({
      id: story.id,
      label: story.title,
      description: studioText.role[story.role],
    }));

  return (
    <Breadcrumbs
      label={t.label}
      LinkComponent={AppLink}
      items={[
        { label: studioText.title, href: "/studio" },
        {
          label: storyTitle,
          href: `/studio/story/${storyId}`,
          switcher:
            options.length > 1
              ? {
                  label: t.switchStory,
                  value: storyId,
                  options,
                  onSelect: (id) => navigation.push(`/studio/story/${id}/${segment}`),
                }
              : undefined,
        },
        { label },
      ]}
    />
  );
}
