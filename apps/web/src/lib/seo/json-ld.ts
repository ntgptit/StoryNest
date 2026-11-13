import type { ChapterContent, StoryDetail } from "@storynest/features";
import { excerpt } from "@storynest/utils";

type JsonLd = Record<string, unknown>;

/** Drops undefined and empty values so the markup carries only what is known. */
function compact(value: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
    ),
  );
}

interface Links {
  storyUrl: string;
  /** Omitted when the author has no public page (no username). */
  authorUrl?: string | undefined;
  coverUrl?: string | undefined;
}

/** schema.org/Book for a story page. */
export function bookJsonLd(story: StoryDetail, links: Links): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": links.storyUrl,
    url: links.storyUrl,
    name: story.title,
    description: excerpt(story.synopsis, 300),
    inLanguage: story.languageCode,
    image: links.coverUrl,
    genre: story.category?.name,
    keywords: story.tags.map((tag) => tag.name).join(", "),
    dateModified: story.updatedAt,
    isAccessibleForFree: true,
    author: compact({ "@type": "Person", name: story.author.displayName, url: links.authorUrl }),
  });
}

/** schema.org/Chapter for a chapter page, part of its Book. */
export function chapterJsonLd(
  story: StoryDetail,
  chapter: Pick<ChapterContent, "title" | "number">,
  links: Links & { chapterUrl: string },
): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "Chapter",
    "@id": links.chapterUrl,
    url: links.chapterUrl,
    name: chapter.title,
    position: chapter.number,
    inLanguage: story.languageCode,
    isAccessibleForFree: true,
    author: compact({ "@type": "Person", name: story.author.displayName, url: links.authorUrl }),
    isPartOf: compact({
      "@type": "Book",
      "@id": links.storyUrl,
      name: story.title,
      url: links.storyUrl,
      image: links.coverUrl,
    }),
  });
}

/**
 * JSON for a <script type="application/ld+json"> tag. Text from the database (a title, a synopsis) must not be able to
 * close the tag or start a comment, so the characters that could are written as escapes: the JSON means the same.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
