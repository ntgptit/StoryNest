import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  currentLocale,
  defineText,
  getLanguage,
  isLanguage,
  languageChoices,
  plural,
  readStoredLanguage,
  registeredCatalogs,
  setLanguage,
  subscribeLanguage,
} from "./i18n.ts";
import { LanguageProvider, useLanguage } from "./language.tsx";

beforeEach(() => {
  window.localStorage.clear();
  setLanguage("vi", { persist: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const vi_ = {
  title: "Tiêu đề",
  nested: { deep: { hello: "Xin chào" }, count: (n: number) => `${n} mục` },
  list: ["một", "hai"],
  onlyVi: "Chỉ tiếng Việt",
} as const;

const text = defineText("test.basic", vi_, {
  title: "Title",
  nested: { deep: { hello: "Hello" }, count: (n: number) => `${n} items` },
  list: ["one", "two"],
  onlyVi: "",
});
const partial = defineText("test.partial", { a: "A vi", b: { c: "C vi" } }, { a: "A en", b: { c: "C en" } });

describe("language store", () => {
  it("starts in Vietnamese and knows the languages it can speak", () => {
    expect(DEFAULT_LANGUAGE).toBe("vi");
    expect(getLanguage()).toBe("vi");
    expect(currentLocale()).toBe("vi");
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it("stores the choice, tells listeners once per real change, and lets them go", () => {
    const listener = vi.fn();
    const stop = subscribeLanguage(listener);
    setLanguage("en");
    setLanguage("en");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getLanguage()).toBe("en");
    expect(currentLocale()).toBe("en");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    stop();
    setLanguage("vi");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("applies a value that is already stored elsewhere without writing it down", () => {
    setLanguage("en", { persist: false });
    expect(getLanguage()).toBe("en");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it("counts the reader's own choices, and not a value applied from storage or from the account", () => {
    const before = languageChoices();
    setLanguage("en");
    expect(languageChoices()).toBe(before + 1);
    setLanguage("vi", { persist: false });
    setLanguage("en", { fromAccount: true });
    expect(languageChoices()).toBe(before + 1);
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en"); // from the account: written to the device
    setLanguage("vi");
    expect(languageChoices()).toBe(before + 2);
  });

  it("reads back only a language it knows, and survives blocked storage", () => {
    expect(readStoredLanguage()).toBeNull();
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    expect(readStoredLanguage()).toBe("en");
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "klingon");
    expect(readStoredLanguage()).toBeNull();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredLanguage()).toBeNull();
    setLanguage("en");
    expect(getLanguage()).toBe("en");
  });
});

describe("defineText", () => {
  it("reads Vietnamese by default, and the other language the moment it is chosen", () => {
    expect(text.title).toBe("Tiêu đề");
    expect(text.nested.deep.hello).toBe("Xin chào");
    expect(text.nested.count(3)).toBe("3 mục");
    setLanguage("en");
    expect(text.title).toBe("Title");
    expect(text.nested.deep.hello).toBe("Hello");
    expect(text.nested.count(3)).toBe("3 items");
    expect(text.list).toEqual(["one", "two"]);
  });

  it("follows a switch even through a reference taken earlier", () => {
    const t = text.nested; // what `const t = commentText.item` at the top of a module does
    expect(t.deep.hello).toBe("Xin chào");
    setLanguage("en");
    expect(t.deep.hello).toBe("Hello");
    setLanguage("vi");
    expect(t.deep.hello).toBe("Xin chào");
  });

  it("falls back to Vietnamese for a key the English catalog does not have", () => {
    const sparse = defineText("test.sparse", { a: "A vi", b: "B vi" }, { a: "A en" } as unknown as {
      a: string;
      b: string;
    });
    setLanguage("en");
    expect(sparse.a).toBe("A en");
    expect(sparse.b).toBe("B vi");
  });

  it("works with no English catalog at all", () => {
    const only = defineText("test.only-vi", { x: "Xin" });
    setLanguage("en");
    expect(only.x).toBe("Xin");
  });

  it("looks like the plain object it stands for: keys, spread, JSON, `in`", () => {
    expect(Object.keys(text)).toEqual(["title", "nested", "list", "onlyVi"]);
    expect(Object.keys(text.nested)).toEqual(["deep", "count"]);
    expect({ ...text.nested.deep }).toEqual({ hello: "Xin chào" });
    expect(JSON.parse(JSON.stringify(text.nested.deep))).toEqual({ hello: "Xin chào" });
    expect("title" in text).toBe(true);
    expect("nope" in text).toBe(false);
    expect(Object.entries(partial.b)).toEqual([["c", "C vi"]]);
    setLanguage("en");
    expect(Object.entries(partial.b)).toEqual([["c", "C en"]]);
  });

  it("answers undefined for what is not there, and cannot be changed from outside", () => {
    expect((text as unknown as Record<string, unknown>).missing).toBeUndefined();
    expect((text as unknown as Record<symbol, unknown>)[Symbol.iterator]).toBeUndefined();
    expect(() => {
      "use strict";
      (text as { title: string }).title = "x";
    }).toThrow();
    expect(() => {
      "use strict";
      delete (text as { title?: string }).title;
    }).toThrow();
    expect(text.title).toBe("Tiêu đề");
  });

  it("registers every catalog by id, so a test can check them all", () => {
    const ids = registeredCatalogs().map((c) => c.id);
    expect(ids).toContain("test.basic");
    expect(ids).toContain("test.partial");
  });
});

describe("plural", () => {
  it("picks the form the language asks for and falls back to 'other'", () => {
    const forms = { one: "1 chapter", other: "many chapters" } as const;
    setLanguage("en");
    expect(plural(1, forms)).toBe("1 chapter");
    expect(plural(2, forms)).toBe("many chapters");
    setLanguage("vi");
    expect(plural(1, forms)).toBe("many chapters"); // Vietnamese has one form: "other"
    expect(plural(0, { other: "x" })).toBe("x");
    setLanguage("en");
    expect(plural(1, { other: "x" })).toBe("x"); // the form asked for ("one") is not offered: "other" is used
  });
});

function Probe() {
  const language = useLanguage();
  const [count, setCount] = useState(0);
  return (
    <div>
      <p data-testid="language">{language}</p>
      <p data-testid="title">{text.title}</p>
      <button onClick={() => setCount(count + 1)}>{`clicks ${count}`}</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  it("renders the default first, applies the stored language after mounting, and sets <html lang>", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(await screen.findByText("Title")).toBeTruthy();
    expect(screen.getByTestId("language").textContent).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("keeps Vietnamese when nothing is stored", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("title").textContent).toBe("Tiêu đề");
    expect(document.documentElement.lang).toBe("vi");
  });

  it("changes every text without a reload, and starts the page below it afresh", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button").textContent).toBe("clicks 1");
    act(() => setLanguage("en"));
    expect(screen.getByTestId("title").textContent).toBe("Title");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("button").textContent).toBe("clicks 0"); // re-mounted
    act(() => setLanguage("vi"));
    expect(screen.getByTestId("title").textContent).toBe("Tiêu đề");
  });

  it("ignores a stored language it does not know", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "klingon");
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("language").textContent).toBe("vi");
  });
});
