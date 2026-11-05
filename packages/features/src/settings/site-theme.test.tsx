import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeSwitch } from "./components/theme-switch.tsx";
import {
  SITE_THEME_BOOTSTRAP_SCRIPT,
  SITE_THEME_STORAGE_KEY,
  applySiteTheme,
  parseSiteTheme,
  resolveScheme,
  toggledTheme,
} from "./model/site-theme.ts";
import { getStoredSiteTheme, setStoredSiteTheme } from "./model/site-theme-store.ts";

const root = document.documentElement;

afterEach(() => {
  cleanup();
  root.classList.remove("light", "dark");
  window.localStorage.clear();
});

describe("site theme model", () => {
  it("puts exactly one class on <html>, or none to follow the device", () => {
    applySiteTheme("dark", root);
    expect([...root.classList]).toContain("dark");
    applySiteTheme("light", root);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.classList.contains("light")).toBe(true);
    applySiteTheme("system", root);
    expect(root.classList.contains("light") || root.classList.contains("dark")).toBe(false);
  });

  it("resolves and toggles the shown scheme", () => {
    expect(resolveScheme("system", true)).toBe("dark");
    expect(resolveScheme("system", false)).toBe("light");
    expect(resolveScheme("light", true)).toBe("light");
    expect(toggledTheme("dark")).toBe("light");
    expect(toggledTheme("light")).toBe("dark");
    expect(parseSiteTheme("sepia")).toBe("system");
    expect(parseSiteTheme(null)).toBe("system");
  });

  it("the bootstrap script applies a stored choice before paint and ignores anything else", () => {
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, "dark");
    new Function(SITE_THEME_BOOTSTRAP_SCRIPT)();
    expect(root.classList.contains("dark")).toBe(true);
    root.classList.remove("dark");
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, 'x"onerror');
    new Function(SITE_THEME_BOOTSTRAP_SCRIPT)();
    expect(root.className).toBe("");
  });

  it("stores the choice per device; 'system' clears it", () => {
    setStoredSiteTheme("light");
    expect(window.localStorage.getItem(SITE_THEME_STORAGE_KEY)).toBe("light");
    expect(getStoredSiteTheme()).toBe("light");
    setStoredSiteTheme("system");
    expect(window.localStorage.getItem(SITE_THEME_STORAGE_KEY)).toBeNull();
    expect(root.classList.contains("light")).toBe(false);
  });
});

describe("ThemeSwitch", () => {
  it("is a day/night switch that sets the opposite theme", () => {
    render(<ThemeSwitch />);
    const control = screen.getByRole("switch", { name: "Giao diện tối" });
    expect(control.getAttribute("aria-checked")).toBe("false"); // jsdom: the device is light
    fireEvent.click(control);
    expect(root.classList.contains("dark")).toBe(true);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });
});
