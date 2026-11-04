import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicStorageUrl,
  buildStorageKey,
  isValidStorageKey,
  debounce,
  decodeCursor,
  encodeCursor,
  err,
  excerpt,
  formatCount,
  formatRelativeTime,
  isUuid,
  newId,
  ok,
  safeRedirectPath,
  slugify,
  unwrapOr,
} from "./index.ts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // same rule as slugSchema in @storynest/validation

describe("slugify", () => {
  it.each([
    ["Đừng Bỏ Cuộc!", "dung-bo-cuoc"],
    ["Hôm nay trời đẹp", "hom-nay-troi-dep"],
    ["ĐƯỜNG VỀ NHÀ", "duong-ve-nha"],
    ["  Chapter 1: The Start  ", "chapter-1-the-start"],
    ["a---b___c", "a-b-c"],
    ["Truyện 2024 — Phần II", "truyen-2024-phan-ii"],
    ["Ả Ế Ộ Ữ Ỳ", "a-e-o-u-y"],
  ])("%j -> %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(slugify(input)).toMatch(SLUG_RE);
  });

  it("returns the fallback when nothing usable remains", () => {
    expect(slugify("!!! ??? 😀")).toBe("");
    expect(slugify("😀", { fallback: "untitled" })).toBe("untitled");
    expect(slugify("")).toBe("");
  });

  it("truncates without leaving a trailing hyphen", () => {
    const slug = slugify("abc def ghi", { maxLength: 4 }); // "abc-" -> "abc"
    expect(slug).toBe("abc");
    expect(slugify("x".repeat(500)).length).toBe(120);
  });
});

describe("formatCount", () => {
  it.each([
    [0, "vi", "0"],
    [999, "vi", "999"],
    [1000, "vi", "1K"],
    [1234, "vi", "1,2K"],
    [1234, "en", "1.2K"],
    [999_999, "en", "999.9K"], // never rounds up to "1000K"
    [1_000_000, "en", "1M"],
    [2_500_000_000, "en", "2.5B"],
    [-5, "en", "0"],
    [Number.NaN, "en", "0"],
    [Number.POSITIVE_INFINITY, "en", "0"],
  ])("%s (%s) -> %s", (value, locale, expected) => expect(formatCount(value, locale)).toBe(expected));
});

describe("excerpt", () => {
  it("keeps short text and collapses whitespace", () => {
    expect(excerpt("  hello \n  world  ")).toBe("hello world");
  });
  it("cuts on a word boundary and adds an ellipsis", () => {
    const text = "The afternoon light spilled across the quiet room and onto the old wooden floor";
    const out = excerpt(text, 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it("hard-cuts a single very long word", () => {
    expect(excerpt("x".repeat(50), 10)).toBe(`${"x".repeat(10)}…`);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it("formats past and future in English", () => {
    expect(formatRelativeTime(ago(3 * 3600_000), "en", now)).toBe("3 hours ago");
    expect(formatRelativeTime(new Date(now.getTime() + 2 * 86400_000), "en", now)).toBe("in 2 days");
    expect(formatRelativeTime(ago(86400_000), "en", now)).toBe("yesterday");
    expect(formatRelativeTime(ago(10_000), "en", now)).toBe("now");
  });
  it("formats in Vietnamese", () => {
    expect(formatRelativeTime(ago(3 * 3600_000), "vi", now)).toContain("giờ trước");
  });
  it("accepts strings and numbers", () => {
    expect(formatRelativeTime("2026-11-03T09:00:00Z", "en", now)).toBe("3 hours ago");
    expect(formatRelativeTime(now.getTime() - 60_000, "en", now.getTime())).toBe("1 minute ago");
  });
});

describe("ids", () => {
  it("newId produces valid, distinct uuids", () => {
    const a = newId();
    expect(isUuid(a)).toBe(true);
    expect(newId()).not.toBe(a);
  });
  it("isUuid rejects non-uuids", () => {
    for (const bad of ["", "abc", 42, null, undefined, "00000000-0000-0000-0000-00000000000g"]) {
      expect(isUuid(bad)).toBe(false);
    }
  });
});

describe("cursor", () => {
  it("round-trips including unicode and is URL-safe", () => {
    const position = { updated_at: "2026-11-03T12:00:00.123456+00:00", id: "abc", n: 7, title: "Đường về nhà" };
    const cursor = encodeCursor(position);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(cursor)).toEqual(position);
  });
  it("returns null for garbage instead of throwing", () => {
    for (const bad of [
      "",
      "%%%",
      "not-base64!",
      encodeCursor({}).slice(0, 1) + "@@",
      btoa("[1,2]"),
      btoa('"str"'),
      btoa("null"),
    ]) {
      expect(decodeCursor(bad)).toBeNull();
    }
    expect(decodeCursor(btoa(JSON.stringify({ a: { nested: 1 } })))).toBeNull();
  });
});

describe("buildPublicStorageUrl", () => {
  it("builds and encodes", () => {
    expect(buildPublicStorageUrl("https://x.supabase.co/", "covers", "story-1/bìa truyện.png")).toBe(
      "https://x.supabase.co/storage/v1/object/public/covers/story-1/b%C3%ACa%20truy%E1%BB%87n.png",
    );
  });
  it("rejects keys that could escape the bucket", () => {
    for (const key of ["../secret", "a/../b", "/abs", "a//b", ".", ""]) {
      expect(() => buildPublicStorageUrl("https://x.supabase.co", "covers", key)).toThrow();
    }
  });
});

describe("result", () => {
  it("ok / err / unwrapOr", () => {
    expect(unwrapOr(ok(1), 0)).toBe(1);
    expect(unwrapOr(err("boom"), 0)).toBe(0);
  });
});

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs once with the latest arguments", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(1);
    d(2);
    d(3);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });
  it("flush runs the pending call immediately, once", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d.flush();
    d.flush();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("cancel drops the pending call", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/", "/"],
    ["/library", "/library"],
    ["/story/1/a-b?tab=chapters#c2", "/story/1/a-b?tab=chapters#c2"],
    ["/path with space", "/path%20with%20space"],
  ])("accepts same-site path %j", (input, expected) => expect(safeRedirectPath(input)).toBe(expected));

  it.each([
    ["//evil.com"],
    ["//evil.com/path"],
    ["https://evil.com"],
    ["http://evil.com/x"],
    ["javascript:alert(1)"],
    ["evil.com"],
    ["/\\evil.com"],
    ["/\\/evil.com"],
    ["\\\\evil.com"],
    ["/ok\nLocation: evil"],
    ["/\t/evil.com"],
    ["///evil.com"],
    [""],
  ])("rejects %j", (input) => expect(safeRedirectPath(input, "/home")).toBe("/home"));

  it("rejects null, undefined and uses the fallback", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined, "/library")).toBe("/library");
  });
});

describe("storage key convention", () => {
  const story = "19000000-0000-4000-8000-000000000001";
  const other = "19000000-0000-4000-8000-000000000002";

  it("accepts <scope>/<file> and rejects everything else", () => {
    expect(isValidStorageKey(`${story}/cover-1.webp`, story)).toBe(true);
    expect(isValidStorageKey(`${story}/A_b.9.PNG`, story)).toBe(true);
    expect(isValidStorageKey(`${story}/${"a".repeat(200)}`, story)).toBe(true);
    for (const key of [
      `${other}/x.png`, // another scope
      "x.png", // no folder
      `${story}/a/b.png`, // nested
      `${story}/../${other}/x.png`, // traversal
      `${story}/.hidden`,
      `${story}/a b.png`,
      `${story}/`,
      `${story}/${"a".repeat(201)}`,
      `/${story}/x.png`,
    ]) {
      expect(isValidStorageKey(key, story), key).toBe(false);
    }
    expect(isValidStorageKey(`${story}/x.png`, "not-a-uuid")).toBe(false);
  });

  it("compares the scope in lowercase, as the database stores ids", () => {
    const lettered = "abcdef00-0000-4000-8000-000000000001"; // has letters, so upper and lower case differ
    expect(isValidStorageKey(`${lettered}/x.png`, lettered.toUpperCase())).toBe(true);
    expect(isValidStorageKey(`${lettered.toUpperCase()}/x.png`, lettered)).toBe(false);
  });

  it("builds a fresh valid key from an extension only", () => {
    const a = buildStorageKey(story, "webp");
    const b = buildStorageKey(story, ".PNG");
    expect(isValidStorageKey(a, story)).toBe(true);
    expect(isValidStorageKey(b, story)).toBe(true);
    expect(b.endsWith(".png")).toBe(true);
    expect(a).not.toBe(buildStorageKey(story, "webp"));
    expect(() => buildStorageKey(story, "we/bp")).toThrow();
    expect(() => buildStorageKey(story, "")).toThrow();
    expect(() => buildStorageKey("nope", "png")).toThrow();
  });

  it("uses the same file-name rule as the database function", () => {
    const sql = readFileSync("../../supabase/migrations/20261104000300_storage_key_convention.sql", "utf8");
    expect(sql).toContain("'/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'");
  });
});
