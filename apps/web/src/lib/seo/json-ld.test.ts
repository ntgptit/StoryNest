import type { ChapterContent, StoryDetail } from "@storynest/features";
import { describe, expect, it } from "vitest";

import { bookJsonLd, chapterJsonLd, serializeJsonLd } from "./json-ld.ts";

const story = {
  id: "s1",
  slug: "rung-suong-mu",
  title: "Rừng sương mù",
  synopsis: "Một chuyến đi vào rừng.",
  coverStorageKey: "c.png",
  status: "ongoing",
  isMature: false,
  languageCode: "vi",
  updatedAt: "2026-11-04T10:00:00+00:00",
  author: { username: "demo_an", displayName: "An Nhiên" },
  category: { slug: "gia-tuong", name: "Giả tưởng" },
  tags: [
    { slug: "a", name: "Phiêu lưu" },
    { slug: "b", name: "Bí ẩn" },
  ],
  stats: { reads: 0, votes: 0, comments: 0, followers: 0 },
  visibility: "public",
  createdAt: "2026-11-01T00:00:00+00:00",
} as unknown as StoryDetail;

const links = {
  storyUrl: "https://site.test/story/s1/rung-suong-mu",
  authorUrl: "https://site.test/author/demo_an",
  coverUrl: "https://cdn.test/c.png",
};

describe("bookJsonLd", () => {
  it("describes the story as a schema.org Book with its author", () => {
    const data = bookJsonLd(story, links);
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Book",
      "@id": links.storyUrl,
      url: links.storyUrl,
      name: "Rừng sương mù",
      description: "Một chuyến đi vào rừng.",
      inLanguage: "vi",
      image: links.coverUrl,
      genre: "Giả tưởng",
      keywords: "Phiêu lưu, Bí ẩn",
      dateModified: "2026-11-04T10:00:00+00:00",
      isAccessibleForFree: true,
      author: { "@type": "Person", name: "An Nhiên", url: links.authorUrl },
    });
  });

  it("leaves out what is not known instead of writing empty values", () => {
    const data = bookJsonLd({ ...story, category: null, tags: [], synopsis: "" }, { ...links, coverUrl: undefined });
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("genre");
    expect(data).not.toHaveProperty("keywords");
    expect(data).not.toHaveProperty("description");
  });
});

describe("chapterJsonLd", () => {
  it("describes the chapter as a schema.org Chapter that is part of its Book", () => {
    const chapter: Pick<ChapterContent, "title" | "number"> = { title: "Tấm bản đồ", number: 3 };
    const data = chapterJsonLd(story, chapter, { ...links, chapterUrl: `${links.storyUrl}/chuong-3` });
    expect(data).toMatchObject({
      "@type": "Chapter",
      "@id": `${links.storyUrl}/chuong-3`,
      name: "Tấm bản đồ",
      position: 3,
      inLanguage: "vi",
      isPartOf: {
        "@type": "Book",
        "@id": links.storyUrl,
        name: "Rừng sương mù",
        url: links.storyUrl,
        image: links.coverUrl,
      },
      author: { "@type": "Person", name: "An Nhiên" },
    });
  });
});

describe("serializeJsonLd", () => {
  it("cannot be made to close the script tag or start an HTML comment, and means the same JSON", () => {
    const evil = { name: "</script><script>alert(1)</script><!--", other: "a & b" };
    const text = serializeJsonLd(evil);
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(text).not.toContain("&");
    expect(JSON.parse(text)).toEqual(evil);
  });

  it("escapes the line separators that break older script parsers", () => {
    const text = serializeJsonLd({ name: "a b c" });
    expect(text).not.toContain(" ");
    expect(text).not.toContain(" ");
    expect(JSON.parse(text)).toEqual({ name: "a b c" });
  });
});
