import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_READER_PREFERENCES, type ReaderPreferences } from "@storynest/validation";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { getRemoteReaderPreferences, saveRemoteReaderPreferences } from "./api/preferences.api.ts";
import { ReaderSettingsSheet } from "./components/reader-settings-sheet.tsx";
import { useApplyReaderPreferences } from "./hooks/use-reader-preferences.ts";
import { useReaderPreferencesSync } from "./hooks/use-reader-preferences-sync.ts";
import {
  READER_PREFERENCES_BOOTSTRAP_SCRIPT,
  READER_PREFERENCES_STORAGE_KEY,
  buildReaderBootstrapScript,
  applyReaderPreferences,
  canStepFontSize,
  clearReaderPreferences,
  stepFontSize,
} from "./model/preferences.ts";
import { getStoredReaderPreferences, setStoredReaderPreferences } from "./model/preferences-store.ts";
import { readerText } from "./strings.ts";

const SEPIA_LARGE: ReaderPreferences = { fontSize: "l", lineHeight: "relaxed", font: "serif", theme: "sepia" };

beforeEach(() => {
  window.localStorage.clear();
  setStoredReaderPreferences({ ...DEFAULT_READER_PREFERENCES }); // resets the in-memory cache too
  window.localStorage.clear();
  clearReaderPreferences(document.documentElement);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("font size steps", () => {
  it("moves one step and stops at the ends", () => {
    expect(stepFontSize("m", 1)).toBe("l");
    expect(stepFontSize("m", -1)).toBe("s");
    expect(stepFontSize("xl", 1)).toBe("xl");
    expect(stepFontSize("s", -1)).toBe("s");
    expect(canStepFontSize("xl", 1)).toBe(false);
    expect(canStepFontSize("s", -1)).toBe(false);
    expect(canStepFontSize("m", 1)).toBe(true);
  });
});

describe("applying to <html>", () => {
  it("sets one data attribute per preference and removes them all again", () => {
    const root = document.documentElement;
    applyReaderPreferences(SEPIA_LARGE, root);
    expect(root.dataset.readerSize).toBe("l");
    expect(root.dataset.readerLeading).toBe("relaxed");
    expect(root.dataset.readerFont).toBe("serif");
    expect(root.dataset.readerTheme).toBe("sepia");
    clearReaderPreferences(root);
    expect(Object.keys(root.dataset).filter((k) => k.startsWith("reader"))).toEqual([]);
  });
});

describe("bootstrap script (runs before first paint)", () => {
  const run = () => new Function(READER_PREFERENCES_BOOTSTRAP_SCRIPT)();

  it("applies stored preferences to <html>", () => {
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify(SEPIA_LARGE));
    run();
    expect(document.documentElement.dataset.readerTheme).toBe("sepia");
    expect(document.documentElement.dataset.readerSize).toBe("l");
  });

  it("ignores unknown values, applies the valid ones, and never throws on broken data", () => {
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify({ theme: "neon", font: "serif" }));
    run();
    expect(document.documentElement.dataset.readerTheme).toBeUndefined();
    expect(document.documentElement.dataset.readerFont).toBe("serif");

    clearReaderPreferences(document.documentElement);
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, "{not json");
    expect(run).not.toThrow();
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, "null");
    expect(run).not.toThrow();
    expect(document.documentElement.dataset.readerTheme).toBeUndefined();
  });

  it("does nothing when nothing is stored", () => {
    run();
    expect(document.documentElement.dataset.readerTheme).toBeUndefined();
  });
});

describe("bootstrap script limited to the chapter route", () => {
  const pattern = /^\/story\/[^/]+\/[^/]+\/[^/]+\/?$/;
  const runAt = (path: string) => {
    window.history.replaceState(null, "", path);
    new Function(buildReaderBootstrapScript(pattern))();
  };

  it("applies preferences on a chapter path and leaves every other page alone", () => {
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify(SEPIA_LARGE));
    runAt("/");
    runAt("/story/abc/slug");
    expect(document.documentElement.dataset.readerTheme).toBeUndefined();
    runAt("/story/abc/slug/chuong-1");
    expect(document.documentElement.dataset.readerTheme).toBe("sepia");
    window.history.replaceState(null, "", "/");
  });
});

describe("device store", () => {
  it("defaults when empty or corrupted, and returns a stable object while the value is unchanged", () => {
    expect(getStoredReaderPreferences()).toEqual(DEFAULT_READER_PREFERENCES);
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, "{broken");
    expect(getStoredReaderPreferences()).toEqual(DEFAULT_READER_PREFERENCES);
    setStoredReaderPreferences(SEPIA_LARGE);
    const first = getStoredReaderPreferences();
    expect(first).toEqual(SEPIA_LARGE);
    expect(getStoredReaderPreferences()).toBe(first);
  });

  it("validates what it reads: a hand-edited value cannot inject an unknown setting", () => {
    window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify({ theme: "sepia", fontSize: "huge" }));
    expect(getStoredReaderPreferences()).toEqual({ ...DEFAULT_READER_PREFERENCES, theme: "sepia" });
  });

  it("keeps the choice for the page when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setStoredReaderPreferences(SEPIA_LARGE);
    expect(getStoredReaderPreferences()).toEqual(SEPIA_LARGE);
  });
});

function Applier() {
  useApplyReaderPreferences();
  return null;
}

describe("useApplyReaderPreferences", () => {
  it("applies the stored value on mount, follows changes, and leaves no trace on unmount", () => {
    setStoredReaderPreferences(SEPIA_LARGE);
    const { unmount } = render(<Applier />);
    expect(document.documentElement.dataset.readerTheme).toBe("sepia");
    act(() => setStoredReaderPreferences({ ...SEPIA_LARGE, theme: "dark" }));
    expect(document.documentElement.dataset.readerTheme).toBe("dark");
    unmount();
    expect(document.documentElement.dataset.readerTheme).toBeUndefined();
    expect(document.documentElement.dataset.readerSize).toBeUndefined();
  });
});

describe("ReaderSettingsSheet", () => {
  async function open() {
    render(<ReaderSettingsSheet />);
    fireEvent.click(screen.getByRole("button", { name: readerText.settings.open }));
    await screen.findByText(readerText.settings.title);
  }

  it("changes theme, font and line spacing at once and remembers them", async () => {
    render(
      <>
        <Applier />
        <ReaderSettingsSheet />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: readerText.settings.open }));
    await screen.findByText(readerText.settings.title);

    fireEvent.click(screen.getByRole("button", { name: readerText.settings.themes.sepia }));
    fireEvent.click(screen.getByRole("button", { name: readerText.settings.fonts.serif }));
    fireEvent.click(screen.getByRole("button", { name: readerText.settings.lineHeights.relaxed }));

    expect(document.documentElement.dataset.readerTheme).toBe("sepia");
    expect(document.documentElement.dataset.readerFont).toBe("serif");
    expect(document.documentElement.dataset.readerLeading).toBe("relaxed");
    expect(screen.getByRole("button", { name: readerText.settings.themes.sepia }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: readerText.settings.themes.dark }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(JSON.parse(window.localStorage.getItem(READER_PREFERENCES_STORAGE_KEY) ?? "{}")).toMatchObject({
      theme: "sepia",
      font: "serif",
      lineHeight: "relaxed",
    });
  });

  it("steps the font size and disables the buttons at the ends", async () => {
    await open();
    const larger = screen.getByRole("button", { name: readerText.settings.larger });
    const smaller = screen.getByRole("button", { name: readerText.settings.smaller });
    fireEvent.click(larger);
    fireEvent.click(larger);
    expect(getStoredReaderPreferences().fontSize).toBe("xl");
    expect((larger as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(smaller);
    expect(getStoredReaderPreferences().fontSize).toBe("l");
  });
});

describe("account copy", () => {
  it("reads null for an empty or missing row and the parsed value for a saved one", async () => {
    const clientWith = (data: unknown) =>
      ({
        from: () => ({ select: () => ({ maybeSingle: async () => ({ data, error: null }) }) }),
      }) as unknown as DataClient;
    expect(await getRemoteReaderPreferences(clientWith(null))).toBeNull();
    expect(await getRemoteReaderPreferences(clientWith({ preferences: {} }))).toBeNull();
    expect(await getRemoteReaderPreferences(clientWith({ preferences: { theme: "dark", extra: 1 } }))).toEqual({
      ...DEFAULT_READER_PREFERENCES,
      theme: "dark",
    });
  });

  it("upserts by user id", async () => {
    const upsert = vi.fn(async () => ({ data: null, error: null }));
    const client = { from: () => ({ upsert }) } as unknown as DataClient;
    await saveRemoteReaderPreferences(client, "u1", SEPIA_LARGE);
    expect(upsert).toHaveBeenCalledWith({ user_id: "u1", preferences: SEPIA_LARGE }, { onConflict: "user_id" });
  });
});

function Syncer() {
  useReaderPreferencesSync();
  return null;
}

function syncClient(remote: unknown, options: { selectError?: unknown } = {}) {
  const upsert = vi.fn(async () => ({ data: null, error: null }));
  const from = vi.fn(() => ({
    select: () => ({ maybeSingle: async () => ({ data: remote, error: options.selectError ?? null }) }),
    upsert,
  }));
  return { upsert, from };
}

function renderSync(client: DataClient, children: ReactNode = <Syncer />) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>{children}</AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("useReaderPreferencesSync", () => {
  it("does nothing for a guest", async () => {
    const t = syncClient(null);
    setStoredReaderPreferences(SEPIA_LARGE);
    renderSync(withAuth(t, null));
    await act(async () => {});
    expect(t.from).not.toHaveBeenCalled();
    expect(getStoredReaderPreferences()).toEqual(SEPIA_LARGE);
  });

  it("adopts the account copy on this device when one exists", async () => {
    const t = syncClient({ preferences: { fontSize: "xl", theme: "dark" } });
    renderSync(withAuth(t, testSession()));
    await waitFor(() => expect(getStoredReaderPreferences().theme).toBe("dark"));
    expect(getStoredReaderPreferences().fontSize).toBe("xl");
    expect(t.upsert).not.toHaveBeenCalled();
  });

  it("uploads a customised device copy when the account has none, and nothing when the device is at the defaults", async () => {
    const custom = syncClient({ preferences: {} });
    setStoredReaderPreferences(SEPIA_LARGE);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSync(withAuth(custom, testSession()));
    await waitFor(() => expect(custom.from).toHaveBeenCalled());
    await act(async () => void (await vi.advanceTimersByTimeAsync(2000)));
    expect(custom.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), preferences: SEPIA_LARGE },
      { onConflict: "user_id" },
    );
    cleanup();
    vi.useRealTimers();

    const untouched = syncClient({ preferences: {} });
    setStoredReaderPreferences({ ...DEFAULT_READER_PREFERENCES });
    renderSync(withAuth(untouched, testSession()));
    await waitFor(() => expect(untouched.from).toHaveBeenCalled());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    });
    expect(untouched.upsert).not.toHaveBeenCalled();
  });

  it("saves a change made on the device after a short pause, once, not on every click", async () => {
    const t = syncClient({ preferences: { theme: "light" } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSync(withAuth(t, testSession()));
    await waitFor(() => expect(getStoredReaderPreferences().theme).toBe("light"));
    act(() => setStoredReaderPreferences({ ...getStoredReaderPreferences(), fontSize: "l" }));
    act(() => setStoredReaderPreferences({ ...getStoredReaderPreferences(), fontSize: "xl" }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    expect(t.upsert).not.toHaveBeenCalled(); // still inside the pause
    await act(async () => void (await vi.advanceTimersByTimeAsync(600)));
    expect(t.upsert).toHaveBeenCalledTimes(1);
    expect(t.upsert).toHaveBeenCalledWith(
      { user_id: expect.any(String), preferences: { ...DEFAULT_READER_PREFERENCES, theme: "light", fontSize: "xl" } },
      { onConflict: "user_id" },
    );
  });

  it("keeps working on the device when the account copy cannot be read", async () => {
    const t = syncClient(null, { selectError: { message: "x", code: "XX000" } });
    setStoredReaderPreferences(SEPIA_LARGE);
    renderSync(withAuth(t, testSession()));
    await waitFor(() => expect(t.from).toHaveBeenCalled());
    await act(async () => {});
    expect(getStoredReaderPreferences()).toEqual(SEPIA_LARGE);
    expect(t.upsert).not.toHaveBeenCalled();
  });
});

describe("CSS contract", () => {
  it("tokens.css defines a rule for every preference value the reader can set", () => {
    const css = readFileSync("../design-tokens/src/tokens.css", "utf8");
    for (const [attribute, values] of [
      ["data-reader-size", ["s", "m", "l", "xl"]],
      ["data-reader-leading", ["compact", "normal", "relaxed"]],
      ["data-reader-font", ["sans", "serif"]],
      ["data-reader-theme", ["light", "sepia", "dark"]],
    ] as const) {
      for (const value of values) expect(css).toContain(`:root[${attribute}="${value}"]`);
    }
    expect(css).toContain(".reader-text");
  });
});
