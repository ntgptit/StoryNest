// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { setLanguage } from "@storynest/features";

import { HomeHero } from "./(main)/home-hero";

afterEach(() => {
  cleanup();
  setLanguage("vi", { persist: false });
});

describe("HomeHero", () => {
  it("is the headline in Vietnamese, and in English as soon as the language changes", () => {
    render(<HomeHero />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Nơi những câu chuyện được viết và được đọc.");
    act(() => setLanguage("en", { persist: false }));
    render(<HomeHero />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.at(-1)?.textContent).toBe("Where stories are written and read.");
    expect(screen.getByText("Discover newly updated stories and follow the authors you love.")).toBeTruthy();
  });
});
