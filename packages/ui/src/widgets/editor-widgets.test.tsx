import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FindReplaceBar } from "./find-replace-bar.tsx";
import { MergeChoice } from "./merge-choice.tsx";
import { ScheduledOutbox, ScheduledOutboxItem } from "./scheduled-outbox.tsx";

afterEach(cleanup);

const LABELS = {
  region: "Find and replace",
  find: "Find",
  replace: "Replace with",
  caseSensitive: "Match case",
  previous: "Previous",
  next: "Next",
  replaceOne: "Replace",
  replaceAll: "Replace all",
  close: "Close",
};

function renderBar(overrides: Partial<Parameters<typeof FindReplaceBar>[0]> = {}) {
  const handlers = {
    onFindChange: vi.fn(),
    onReplaceChange: vi.fn(),
    onCaseSensitiveChange: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onReplace: vi.fn(),
    onReplaceAll: vi.fn(),
    onClose: vi.fn(),
  };
  const view = render(
    <FindReplaceBar
      find="lan"
      replace="mai"
      caseSensitive={false}
      current={3}
      total={12}
      status="3 of 12"
      focusRequest={0}
      labels={LABELS}
      {...handlers}
      {...overrides}
    />,
  );
  return { ...handlers, ...view };
}

describe("FindReplaceBar", () => {
  it("shows the count as current/total, announces the status and focuses the find field on mount", () => {
    renderBar();
    const region = screen.getByRole("search", { name: LABELS.region });
    expect(region.textContent).toContain("3/12");
    expect(screen.getByText("3 of 12").getAttribute("aria-live")).toBe("polite");
    expect(document.activeElement).toBe(screen.getByLabelText(LABELS.find));
  });

  it("Enter / Shift+Enter step through matches, Enter in the replace field replaces, Esc closes", () => {
    const bar = renderBar();
    fireEvent.keyDown(screen.getByLabelText(LABELS.find), { key: "Enter" });
    fireEvent.keyDown(screen.getByLabelText(LABELS.find), { key: "Enter", shiftKey: true });
    fireEvent.keyDown(screen.getByLabelText(LABELS.replace), { key: "Enter" });
    fireEvent.keyDown(screen.getByLabelText(LABELS.replace), { key: "Escape" });
    expect(bar.onNext).toHaveBeenCalledTimes(1);
    expect(bar.onPrevious).toHaveBeenCalledTimes(1);
    expect(bar.onReplace).toHaveBeenCalledTimes(1);
    expect(bar.onClose).toHaveBeenCalledTimes(1);
  });

  it("toggles case sensitivity as a pressed button and disables the match actions without matches", () => {
    const bar = renderBar({ current: 0, total: 0 });
    const toggle = screen.getByRole("button", { name: LABELS.caseSensitive });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(bar.onCaseSensitiveChange).toHaveBeenCalledWith(true);
    for (const name of [LABELS.next, LABELS.previous, LABELS.replaceOne, LABELS.replaceAll])
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Ctrl/Cmd+F inside the panel selects the find field again instead of the browser's find", () => {
    renderBar();
    const replace = screen.getByLabelText(LABELS.replace);
    replace.focus();
    const event = new KeyboardEvent("keydown", { key: "f", metaKey: true, bubbles: true, cancelable: true });
    replace.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText(LABELS.find));
  });
});

function Merge({ initial }: { initial?: "mine" | "theirs" }) {
  const [chosen, setChosen] = useState<"mine" | "theirs" | undefined>(initial);
  return (
    <MergeChoice
      label="Paragraph 1"
      chosen={chosen}
      onChoose={setChosen}
      options={[
        { side: "mine", label: "Mine", content: "Opens on Monday." },
        { side: "theirs", label: "Theirs", content: "Opens on Tuesday." },
      ]}
    />
  );
}

describe("MergeChoice", () => {
  it("names each version by who it is from, folds the other one away once picked and undoes on a second press", () => {
    render(<Merge />);
    const group = screen.getByRole("group", { name: "Paragraph 1" });
    const mine = within(group).getByRole("button", { name: "Mine: Opens on Monday." });
    expect(within(group).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(mine);
    expect(mine.getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(mine);
    expect(within(group).getAllByRole("button")).toHaveLength(2);
  });

  it("animates the kept version when it is picked, never on first render", () => {
    render(<Merge initial="mine" />);
    const mine = screen.getByRole("button", { name: "Mine: Opens on Monday." });
    expect(mine.className).not.toContain("animate-merge-pick");
    fireEvent.click(mine); // undo
    fireEvent.click(screen.getByRole("button", { name: "Theirs: Opens on Tuesday." }));
    expect(screen.getByRole("button", { name: "Theirs: Opens on Tuesday." }).className).toContain("animate-merge-pick");
  });
});

function Outbox({ when }: { when: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <ScheduledOutbox title="Scheduled">
      <ScheduledOutboxItem
        when="in 3 hours"
        whenDetail={when}
        editLabel="Change the time of Chapter 3"
        editing={editing}
        onEditingChange={setEditing}
        editor={<input aria-label="New time" />}
        title="Chapter 3"
        actions={<button type="button">Publish now</button>}
      />
    </ScheduledOutbox>
  );
}

describe("ScheduledOutbox", () => {
  it("lists items under its title; the time button opens the editor", () => {
    render(<Outbox when="5 Nov 2026, 14:30" />);
    const list = screen.getByRole("list", { name: "Scheduled" });
    const time = within(list).getByRole("button", { name: /Change the time of Chapter 3/ });
    expect(time.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("New time")).toBeNull();
    fireEvent.click(time);
    expect(time.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("New time")).toBeTruthy();
  });

  it("moves the time into place when it changes, not on first render", () => {
    const view = render(<Outbox when="5 Nov 2026, 14:30" />);
    expect(view.container.querySelector(".animate-outbox-moved")).toBeNull();
    view.rerender(<Outbox when="6 Nov 2026, 09:00" />);
    expect(view.container.querySelector(".animate-outbox-moved")?.textContent).toContain("6 Nov 2026, 09:00");
  });
});
