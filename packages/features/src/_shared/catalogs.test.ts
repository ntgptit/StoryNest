import { describe, expect, it } from "vitest";
import "../index.ts"; // defines every feature's texts
import { registeredCatalogs } from "./i18n.ts";

/**
 * English is added feature by feature (WBS WP 0.4 builds the mechanism, WP 6.10 finishes the translation). A catalog
 * is in exactly one of the two lists; a new feature that is in neither fails here, so none is forgotten.
 */
const TRANSLATED = ["shell", "settings"];
const NOT_TRANSLATED_YET = [
  "adult-content",
  "analytics",
  "auth",
  "author",
  "comments",
  "discovery",
  "editor",
  "history",
  "library",
  "lists",
  "moderation",
  "notifications",
  "profile",
  "progress",
  "ranking",
  "reader",
  "recommendations",
  "search",
  "story",
  "studio",
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** What differs between two catalogs of one feature: a missing or extra key, or a different kind of value. */
function differences(vi: unknown, en: unknown, path = ""): string[] {
  if (typeof vi === "function") {
    if (typeof en !== "function") return [`${path}: should be a function`];
    return en.length === vi.length
      ? []
      : [`${path}: takes ${en.length} argument(s), the Vietnamese takes ${vi.length}`];
  }
  if (Array.isArray(vi)) {
    if (!Array.isArray(en)) return [`${path}: should be a list`];
    return vi.length === en.length
      ? vi.flatMap((item, i) => differences(item, en[i], `${path}[${i}]`))
      : [`${path}: has ${en.length} items, the Vietnamese has ${vi.length}`];
  }
  if (isObject(vi)) {
    if (!isObject(en)) return [`${path || "(root)"}: should be an object`];
    const missing = Object.keys(vi)
      .filter((key) => !(key in en))
      .map((key) => `${path}.${key}: missing`);
    const extra = Object.keys(en)
      .filter((key) => !(key in vi))
      .map((key) => `${path}.${key}: not in the Vietnamese`);
    const inner = Object.keys(vi)
      .filter((key) => key in en)
      .flatMap((key) => differences(vi[key], en[key], `${path}.${key}`));
    return [...missing, ...extra, ...inner];
  }
  if (typeof vi === "string") {
    if (typeof en !== "string") return [`${path}: should be a string`];
    return en.trim() === "" ? [`${path}: is empty`] : [];
  }
  return [];
}

describe("text catalogs", () => {
  const catalogs = registeredCatalogs().filter((c) => !c.id.startsWith("test."));

  it("every feature's texts are accounted for: translated, or on the list still to do", () => {
    const ids = catalogs.map((c) => c.id).sort();
    expect(ids).toEqual([...TRANSLATED, ...NOT_TRANSLATED_YET].sort());
  });

  it.each(TRANSLATED)("%s: the English has exactly the keys of the Vietnamese, with the same kinds of value", (id) => {
    const catalog = catalogs.find((c) => c.id === id);
    expect(catalog?.en, `${id} has no English catalog`).toBeDefined();
    expect(differences(catalog!.vi, catalog!.en)).toEqual([]);
  });

  it.each(NOT_TRANSLATED_YET)("%s: has no English catalog yet, so it shows Vietnamese", (id) => {
    expect(catalogs.find((c) => c.id === id)?.en).toBeUndefined();
  });

  it("the check itself notices a missing key, an extra key, a wrong kind and an empty text", () => {
    const vi = { a: "A", b: { c: "C" }, f: (n: number) => `${n}`, l: ["x"] };
    expect(differences(vi, { a: "A", b: { c: "C" }, f: (n: number) => `${n}`, l: ["x"] })).toEqual([]);
    expect(differences(vi, { a: "A", b: {}, f: (n: number) => `${n}`, l: ["x"] })).toEqual([".b.c: missing"]);
    expect(differences(vi, { a: "A", b: { c: "C", d: "D" }, f: (n: number) => `${n}`, l: ["x"] })).toEqual([
      ".b.d: not in the Vietnamese",
    ]);
    expect(differences(vi, { a: 1, b: { c: "C" }, f: (n: number) => `${n}`, l: ["x"] })).toEqual([
      ".a: should be a string",
    ]);
    expect(differences(vi, { a: "A", b: { c: "C" }, f: "no", l: ["x"] })).toEqual([".f: should be a function"]);
    expect(differences(vi, { a: "A", b: { c: "C" }, f: () => "", l: ["x"] })).toEqual([
      ".f: takes 0 argument(s), the Vietnamese takes 1",
    ]);
    expect(differences(vi, { a: " ", b: { c: "C" }, f: (n: number) => `${n}`, l: ["x"] })).toEqual([".a: is empty"]);
    expect(differences(vi, { a: "A", b: { c: "C" }, f: (n: number) => `${n}`, l: [] })).toEqual([
      ".l: has 0 items, the Vietnamese has 1",
    ]);
  });
});
