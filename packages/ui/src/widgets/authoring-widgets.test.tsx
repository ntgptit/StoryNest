import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Globe, Lock, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { RadioCards } from "./radio-cards.tsx";
import { ReadinessChecklist, type ReadinessItem } from "./readiness-checklist.tsx";
import { breakpointZone, frameWidth, PREVIEW_MIN_WIDTH, ResponsivePreview } from "./responsive-preview.tsx";
import { SearchResultPreview } from "./search-result-preview.tsx";
import { formatShortcut, ShortcutTooltip, ToolbarTooltips } from "./shortcut-tooltip.tsx";
import { SplitButton } from "./split-button.tsx";
import { clampSplit, SplitPane } from "./split-pane.tsx";
import { spotlightPath, SpotlightTour, type TourStep } from "./spotlight-tour.tsx";
import { LEAVE_WARNING_MS, UnsavedChangesBar, useLeaveGuard } from "./unsaved-changes-bar.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SplitButton", () => {
  const options = (onSelect = vi.fn()) => [{ id: "schedule", label: "Schedule…", description: "Later", onSelect }];

  it("runs the main action, and offers the others in a menu behind the arrow", async () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    render(<SplitButton label="Publish" onClick={onClick} menuLabel="More" options={options(onSelect)} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    const arrow = screen.getByRole("button", { name: "More" });
    expect(arrow.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.keyDown(arrow, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: /Schedule…/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("locks both parts while busy or disabled, and shows the busy label with a progress bar", () => {
    const { rerender, container } = render(
      <SplitButton label="Publish" busyLabel="Working…" busy onClick={vi.fn()} menuLabel="More" options={options()} />,
    );
    const main = screen.getByRole("button", { name: "Working…" }) as HTMLButtonElement;
    expect(main.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "More" }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('[data-part="progress"]')).not.toBeNull();
    rerender(<SplitButton label="Publish" disabled onClick={vi.fn()} menuLabel="More" options={options()} />);
    expect((screen.getByRole("button", { name: "Publish" }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('[data-part="progress"]')).toBeNull();
  });

  it("does not roll the label on first render, only when it changes", () => {
    const { rerender } = render(<SplitButton label="Publish" onClick={vi.fn()} menuLabel="More" options={[]} />);
    const label = () => screen.getByRole("button", { name: /Publish|Working/ }).querySelector("span span")!;
    expect(label().className).not.toContain("animate-label-roll");
    rerender(<SplitButton label="Publish" busyLabel="Working…" busy onClick={vi.fn()} menuLabel="More" options={[]} />);
    expect(label().className).toContain("animate-label-roll");
  });
});

describe("ReadinessChecklist", () => {
  const items = (titleDone: boolean): ReadinessItem[] => [
    { id: "title", label: "Has a title", done: titleDone, hint: "Enter a title" },
    { id: "body", label: "Content can be saved", done: true },
  ];
  const labels = { done: "met", todo: "not met" };

  it("lists each condition with its state for screen readers, and the hint while it is not met", () => {
    render(<ReadinessChecklist title="Before publishing" summary="1 of 2" items={items(false)} stateLabels={labels} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]!.textContent).toContain("Has a title (not met)");
    expect(rows[0]!.textContent).toContain("Enter a title");
    expect(rows[1]!.textContent).toContain("(met)");
    expect(screen.getByText("1 of 2").getAttribute("aria-live")).toBe("polite");
  });

  it("pops the check only when an item turns done, never on first render", () => {
    const { rerender, container } = render(
      <ReadinessChecklist title="T" summary="s" items={items(false)} stateLabels={labels} />,
    );
    expect(container.querySelector(".animate-check-pop")).toBeNull(); // body was already done: no motion
    rerender(<ReadinessChecklist title="T" summary="Ready" items={items(true)} stateLabels={labels} />);
    const title = container.querySelector('[data-item="title"]')!;
    expect(title.hasAttribute("data-done")).toBe(true);
    expect(title.querySelector(".animate-check-pop")).not.toBeNull();
    expect(container.querySelector('[data-slot="readiness-checklist"]')!.hasAttribute("data-complete")).toBe(true);
  });
});

describe("RadioCards", () => {
  function Picker({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
    const [value, setValue] = useState<"private" | "public">("private");
    return (
      <RadioCards
        aria-label="Visibility"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        options={[
          { value: "private", label: "Private", description: "Only you", icon: Lock },
          { value: "public", label: "Public", description: "Everyone", icon: Globe },
        ]}
      />
    );
  }

  it("is a radio group: one card checked, a click chooses another", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Visibility" });
    const [priv, pub] = within(group).getAllByRole("radio");
    expect(priv!.getAttribute("aria-checked")).toBe("true");
    expect(pub!.textContent).toContain("Everyone"); // the description is part of the card
    fireEvent.click(pub!);
    expect(onChange).toHaveBeenCalledWith("public");
    expect(pub!.getAttribute("aria-checked")).toBe("true");
  });

  it("moves and chooses with the arrow keys (roving focus)", async () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    const [priv, pub] = screen.getAllByRole("radio");
    act(() => priv!.focus());
    fireEvent.keyDown(priv!, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).toBe(pub));
    expect(onChange).toHaveBeenCalledWith("public");
    expect(pub!.tabIndex).toBe(0);
    expect(priv!.tabIndex).toBe(-1);
  });
});

describe("SearchResultPreview", () => {
  const labels = {
    region: "Preview",
    searchTab: "Search",
    shareTab: "Share",
    descriptionLength: (used: number, limit: number) => `${used}/${limit}`,
  };

  it("shows the title, the address as breadcrumbs and the description, then the share card on its tab", async () => {
    render(
      <SearchResultPreview
        siteName="StoryNest"
        url="https://storynest.test/story/1/my-story"
        title="My story"
        description="A short synopsis"
        sourceLength={16}
        limit={160}
        labels={labels}
      />,
    );
    const region = screen.getByRole("region", { name: "Preview" });
    expect(within(region).getByText("storynest.test › story › 1 › my-story")).toBeTruthy();
    expect(region.querySelector('[data-part="title"]')!.textContent).toBe("My story");
    expect(within(region).getByText("16/160")).toBeTruthy();
    const share = within(region).getByRole("tab", { name: "Share" });
    fireEvent.mouseDown(share);
    fireEvent.keyDown(share, { key: "Enter" });
    fireEvent.click(share);
    expect(await within(region).findByText("storynest.test")).toBeTruthy();
  });

  it("marks a description that will be cut, and shows the note", () => {
    render(
      <SearchResultPreview
        siteName="S"
        url="/story/1/a"
        title="T"
        description="cut…"
        sourceLength={200}
        limit={160}
        note="Not indexed"
        labels={labels}
      />,
    );
    expect(screen.getByText("200/160").className).toContain("text-destructive");
    expect(document.querySelector('[data-part="length-bar"]')!.getAttribute("style")).toContain("width: 100%");
    expect(screen.getByText("Not indexed")).toBeTruthy();
  });
});

describe("UnsavedChangesBar and useLeaveGuard", () => {
  const props = {
    message: "2 unsaved changes",
    warningText: "Save or discard first",
    saveLabel: "Save",
    savingLabel: "Saving…",
    discardLabel: "Discard",
    label: "Unsaved changes",
  };

  it("stays hidden and out of the tab order while clean, and offers Save / Discard while dirty", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const { rerender, container } = render(
      <UnsavedChangesBar {...props} dirty={false} warning={0} onSave={onSave} onDiscard={onDiscard} />,
    );
    const region = container.querySelector('[role="region"]')!;
    expect(region.getAttribute("aria-hidden")).toBe("true");
    expect(region.hasAttribute("inert")).toBe(true);
    rerender(<UnsavedChangesBar {...props} dirty warning={0} onSave={onSave} onDiscard={onDiscard} />);
    const bar = screen.getByRole("region", { name: "Unsaved changes" });
    expect(within(bar).getByRole("status").textContent).toBe("2 unsaved changes");
    fireEvent.click(within(bar).getByRole("button", { name: "Save" }));
    fireEvent.click(within(bar).getByRole("button", { name: "Discard" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("warns (red, message, focus on Save) when a leave was blocked, then calms down", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <UnsavedChangesBar {...props} dirty warning={0} onSave={vi.fn()} onDiscard={vi.fn()} />,
    );
    rerender(<UnsavedChangesBar {...props} dirty warning={1} onSave={vi.fn()} onDiscard={vi.fn()} />);
    const bar = screen.getByRole("region", { name: "Unsaved changes" });
    expect(bar.getAttribute("data-state")).toBe("warning");
    expect(within(bar).getByRole("status").textContent).toBe("Save or discard first");
    expect(document.activeElement).toBe(within(bar).getByRole("button", { name: "Save" }));
    act(() => vi.advanceTimersByTime(LEAVE_WARNING_MS));
    expect(bar.getAttribute("data-state")).toBe("visible");
  });

  function Guarded({ dirty, onBlocked }: { dirty: boolean; onBlocked: () => void }) {
    useLeaveGuard({ dirty, message: "Leave?", onBlocked });
    return (
      <>
        <a href="/elsewhere">Away</a>
        <a href="/elsewhere" target="_blank">
          New tab
        </a>
      </>
    );
  }

  it("stops in-app links and the tab closing only while dirty", () => {
    const onBlocked = vi.fn();
    const { rerender } = render(<Guarded dirty onBlocked={onBlocked} />);
    const away = screen.getByText("Away");
    expect(fireEvent.click(away)).toBe(false); // default prevented
    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(fireEvent.click(screen.getByText("New tab"))).toBe(true);
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    rerender(<Guarded dirty={false} onBlocked={onBlocked} />);
    expect(fireEvent.click(away)).toBe(true);
    const later = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });
});

describe("SplitPane", () => {
  it("clamps the split", () => {
    expect(clampSplit(10)).toBe(25);
    expect(clampSplit(90)).toBe(75);
    expect(clampSplit(50.4)).toBe(50);
    expect(clampSplit(Number.NaN)).toBe(25);
  });

  it("is a focusable separator moved by the arrow keys, Home/End and reset by Esc", () => {
    const onChange = vi.fn();
    render(
      <SplitPane
        start={<p>Editor</p>}
        end={<p>Preview</p>}
        value={50}
        defaultValue={55}
        min={35}
        max={70}
        onValueChange={onChange}
        separatorLabel="Editor width"
      />,
    );
    const separator = screen.getByRole("separator", { name: "Editor width" });
    expect(separator.getAttribute("aria-valuenow")).toBe("50");
    expect(separator.tabIndex).toBe(0);
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    fireEvent.keyDown(separator, { key: "Home" });
    fireEvent.keyDown(separator, { key: "End" });
    fireEvent.keyDown(separator, { key: "Escape" });
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([53, 47, 35, 70, 55]);
  });
});

describe("ShortcutTooltip", () => {
  it("formats shortcuts for Apple devices and the rest", () => {
    expect(formatShortcut(["Mod", "B"], false)).toBe("Ctrl+B");
    expect(formatShortcut(["Mod", "Shift", "S"], false)).toBe("Ctrl+Shift+S");
    expect(formatShortcut(["Mod", "Alt", "2"], true)).toBe("⌘⌥2");
  });

  it("shows the name and the shortcut on keyboard focus, and keeps the button's own name", async () => {
    // Radix measures the trigger to place the tooltip; jsdom has no ResizeObserver.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    render(
      <ToolbarTooltips>
        <ShortcutTooltip label="Bold" shortcut={["Mod", "B"]}>
          <button type="button" aria-label="Bold">
            B
          </button>
        </ShortcutTooltip>
      </ToolbarTooltips>,
    );
    const button = screen.getByRole("button", { name: "Bold" });
    act(() => button.focus());
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toMatch(/Ctrl\+B|⌘B/);
    expect(screen.getByRole("button", { name: "Bold" })).toBe(button);
  });
});

describe("SpotlightTour", () => {
  const labels = {
    dialog: "Tour",
    next: "Next",
    back: "Back",
    done: "Done",
    skip: "Skip",
    progress: (step: number, total: number) => `Step ${step} of ${total}`,
  };
  const steps = (): TourStep[] => [
    { id: "a", target: () => document.getElementById("a"), title: "First", body: "One" },
    { id: "b", target: () => document.getElementById("b"), title: "Second", body: "Two" },
  ];

  it("cuts a rounded hole out of the dim layer", () => {
    expect(spotlightPath(null, 100, 50)).toBe("M0 0H100V50H0Z");
    expect(spotlightPath({ x: 10, y: 10, w: 20, h: 10 }, 100, 50)).toMatch(/^M0 0H100V50H0Z M15 10H25Q30 10 30 15/);
  });

  it("steps through with Next / Back and the arrow keys, ends with Done, and gives focus back", async () => {
    const onEnd = vi.fn();
    render(
      <>
        <button id="a" type="button">
          A
        </button>
        <button id="b" type="button">
          B
        </button>
      </>,
    );
    const before = screen.getByRole("button", { name: "A" });
    act(() => before.focus());
    const { unmount } = render(<SpotlightTour steps={steps()} labels={labels} onEnd={onEnd} />);
    const dialog = screen.getByRole("dialog", { name: "Tour" });
    expect(within(dialog).getByText("Step 1 of 2")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Back" })).toBeNull();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Next" }));
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("Second")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(within(dialog).getByText("First")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(onEnd).toHaveBeenCalledWith("done");
    unmount();
    await waitFor(() => expect(document.activeElement).toBe(before));
  });

  it("Esc and Skip end it as skipped", () => {
    const onEnd = vi.fn();
    render(<SpotlightTour steps={steps()} labels={labels} onEnd={onEnd} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Skip" }));
    expect(onEnd.mock.calls).toEqual([["skip"], ["skip"]]);
  });
});

describe("ResponsivePreview", () => {
  it("keeps the frame between a small phone and the space there is", () => {
    expect(frameWidth(375, 1000)).toBe(375);
    expect(frameWidth(1280, 900)).toBe(900);
    expect(frameWidth(null, 900)).toBe(900);
    expect(frameWidth(100, 900)).toBe(PREVIEW_MIN_WIDTH);
    expect(breakpointZone(375)).toBe(0);
    expect(breakpointZone(768)).toBe(2);
    expect(breakpointZone(1100)).toBe(3);
  });

  it("offers device presets and a keyboard slider handle", () => {
    // jsdom has no layout: give the stage 1000 px of room (plus the 16 px handle column).
    const spy = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1016);
    onTestFinished(() => spy.mockRestore());
    render(
      <ResponsivePreview
        presets={[
          { id: "phone", label: "Phone", width: 375, icon: Smartphone },
          { id: "desktop", label: "Desktop", width: null, icon: Monitor },
        ]}
        labels={{ presets: "Screen size", handle: "Preview width", width: (px) => `${px} px` }}
        defaultPreset="phone"
      >
        <p>Chapter</p>
      </ResponsivePreview>,
    );
    const group = screen.getByRole("group", { name: "Screen size" });
    const phone = within(group).getByRole("button", { name: "Phone" });
    expect(phone.getAttribute("aria-pressed")).toBe("true");
    const handle = screen.getByRole("slider", { name: "Preview width" });
    expect(handle.getAttribute("aria-valuenow")).toBe("375");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.getAttribute("aria-valuenow")).toBe("415");
    expect(handle.getAttribute("aria-valuetext")).toBe("415 px");
    expect(phone.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(handle, { key: "Home" });
    expect(handle.getAttribute("aria-valuenow")).toBe(String(PREVIEW_MIN_WIDTH));
    fireEvent.click(phone);
    expect(handle.getAttribute("aria-valuenow")).toBe("375");
    expect(screen.getByText("Chapter")).toBeTruthy();
  });
});
