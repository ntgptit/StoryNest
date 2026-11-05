import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BulkActionDock } from "./bulk-action-dock.tsx";
import { DetailPanel } from "./detail-panel.tsx";
import { ChangeStepper, FoldRow, FoldToggle } from "./diff-folds.tsx";
import { RowActionsButton, RowActionsMenu, isContextMenuKey, type RowAction } from "./row-actions-menu.tsx";
import { DragHandle, SortableItem, orderAtPointer, useSortableList, type SlotRect } from "./sortable-list.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // jsdom lacks what Radix menus call while they open.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

const row = (id: string, top: number, height = 40): SlotRect => ({ id, left: 0, top, width: 300, height });

describe("orderAtPointer", () => {
  const order = ["a", "b", "c", "d"];
  const rects = [row("a", 0), row("b", 50), row("c", 100), row("d", 150)];

  it("list: puts the held row after every other row whose middle is above the pointer", () => {
    expect(orderAtPointer("list", order, "a", rects, { x: 10, y: 10 })).toEqual(["a", "b", "c", "d"]);
    expect(orderAtPointer("list", order, "a", rects, { x: 10, y: 80 })).toEqual(["b", "a", "c", "d"]);
    expect(orderAtPointer("list", order, "a", rects, { x: 10, y: 500 })).toEqual(["b", "c", "d", "a"]);
    expect(orderAtPointer("list", order, "d", rects, { x: 10, y: -20 })).toEqual(["d", "a", "b", "c"]);
  });

  it("list: does not flip back and forth once the row has moved (rows of different heights)", () => {
    // a is twice as tall as b; dragging a just past b's middle moves it below b...
    const tall = [row("a", 0, 80), row("b", 90, 40)];
    const moved = orderAtPointer("list", ["a", "b"], "a", tall, { x: 0, y: 111 });
    expect(moved).toEqual(["b", "a"]);
    // ...and with the new layout (b now on top) the same pointer keeps it there.
    expect(orderAtPointer("list", moved, "a", [row("b", 0, 40), row("a", 50, 80)], { x: 0, y: 111 })).toEqual(moved);
  });

  it("grid: takes the place of the card under the pointer and stays put over a gap", () => {
    const grid: SlotRect[] = [
      { id: "a", left: 0, top: 0, width: 100, height: 100 },
      { id: "b", left: 110, top: 0, width: 100, height: 100 },
      { id: "c", left: 0, top: 110, width: 100, height: 100 },
    ];
    expect(orderAtPointer("grid", ["a", "b", "c"], "a", grid, { x: 50, y: 150 })).toEqual(["b", "c", "a"]);
    expect(orderAtPointer("grid", ["a", "b", "c"], "c", grid, { x: 150, y: 50 })).toEqual(["a", "c", "b"]);
    expect(orderAtPointer("grid", ["a", "b", "c"], "a", grid, { x: 105, y: 50 })).toEqual(["a", "b", "c"]);
  });

  it("never loses or adds an item", () => {
    expect(orderAtPointer("list", order, "x", rects, { x: 0, y: 0 })).toEqual(order);
  });
});

function SortableDemo({ onReorder }: { onReorder: (ids: string[]) => void }) {
  const [ids, setIds] = useState(["a", "b", "c"]);
  const sortable = useSortableList({
    ids,
    onReorder: (next) => {
      onReorder(next);
      setIds(next);
    },
  });
  return (
    <ul ref={sortable.listRef} aria-label="items">
      {sortable.order.map((id) => (
        <SortableItem key={id} sortable={sortable} id={id}>
          <span>{id}</span>
          <DragHandle sortable={sortable} id={id} />
        </SortableItem>
      ))}
    </ul>
  );
}

describe("useSortableList", () => {
  it("renders in the given order, lifts the held item and drops it without a change when it did not move", () => {
    const onReorder = vi.fn();
    render(<SortableDemo onReorder={onReorder} />);
    const items = () => within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items().map((li) => li.textContent)).toEqual(["a", "b", "c"]);
    const handle = items()[1]!.querySelector("[data-part=drag-handle]")!;
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, pointerType: "mouse", clientX: 5, clientY: 5 });
    expect(items()[1]!.getAttribute("data-dragging")).toBe("lift");
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(items()[1]!.getAttribute("data-dragging")).toBe("land");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("puts everything back on Escape", () => {
    const onReorder = vi.fn();
    render(<SortableDemo onReorder={onReorder} />);
    const handle = within(screen.getByRole("list"))
      .getAllByRole("listitem")[0]!
      .querySelector("[data-part=drag-handle]")!;
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, pointerType: "mouse" });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps the handle out of the accessibility tree (the move buttons are the keyboard route)", () => {
    render(<SortableDemo onReorder={vi.fn()} />);
    const handle = document.querySelector("[data-part=drag-handle]")!;
    expect(handle.getAttribute("aria-hidden")).toBe("true");
    expect(handle.getAttribute("tabindex")).toBeNull();
  });
});

describe("RowActionsMenu", () => {
  const actions = (onRename: () => void): RowAction[] => [
    { id: "rename", label: "Rename", onSelect: onRename },
    { id: "archive", label: "Archive", disabled: true, onSelect: vi.fn() },
    { id: "delete", label: "Delete", destructive: true, separated: true, onSelect: vi.fn() },
  ];

  function Row({ onRename }: { onRename: () => void }) {
    return (
      <ul>
        <RowActionsMenu actions={actions(onRename)} label="Chapter 3">
          <li>
            Chapter 3 <button type="button">Write</button>
          </li>
        </RowActionsMenu>
      </ul>
    );
  }

  it("knows the keys that open a menu", () => {
    expect(isContextMenuKey({ key: "F10", shiftKey: true })).toBe(true);
    expect(isContextMenuKey({ key: "ContextMenu", shiftKey: false })).toBe(true);
    expect(isContextMenuKey({ key: "F10", shiftKey: false })).toBe(false);
  });

  it("opens on right-click with the row's actions and runs the one chosen", async () => {
    const onRename = vi.fn();
    render(<Row onRename={onRename} />);
    fireEvent.contextMenu(screen.getByRole("listitem"), { clientX: 20, clientY: 20 });
    const menu = await screen.findByRole("menu", { name: "Chapter 3" });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Rename", "Archive", "Delete"]);
    expect(within(menu).getByRole("menuitem", { name: "Archive" }).getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector("li")?.getAttribute("data-state")).toBe("open"); // the row stays highlighted
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Rename" }));
    expect(onRename).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("opens with Shift+F10 or the menu key from any control in the row", async () => {
    render(<Row onRename={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Write" }), { key: "F10", shiftKey: true });
    expect(await screen.findByRole("menu", { name: "Chapter 3" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    fireEvent.keyDown(screen.getByRole("button", { name: "Write" }), { key: "ContextMenu" });
    expect(await screen.findByRole("menu", { name: "Chapter 3" })).toBeTruthy();
  });

  it("the ... button offers the same actions", async () => {
    const onRename = vi.fn();
    render(<RowActionsButton actions={actions(onRename)} label="More actions: Chapter 3" menuLabel="Chapter 3" />);
    const trigger = screen.getByRole("button", { name: "More actions: Chapter 3" });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
    expect(onRename).toHaveBeenCalledTimes(1);
  });

  it("renders nothing extra without actions", () => {
    render(<RowActionsButton actions={[]} label="More" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("BulkActionDock", () => {
  it("is absent with nothing selected, and clears on its button or Escape", () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <BulkActionDock count={0} summary="0 selected" label="Bulk" clearLabel="Clear" onClear={onClear}>
        <button type="button">Archive</button>
      </BulkActionDock>,
    );
    expect(screen.queryByRole("region")).toBeNull();
    rerender(
      <BulkActionDock count={2} summary="2 selected" label="Bulk" clearLabel="Clear" onClear={onClear}>
        <button type="button">Archive</button>
      </BulkActionDock>,
    );
    const dock = screen.getByRole("region", { name: "Bulk" });
    expect(within(dock).getByText("2 selected").getAttribute("aria-live")).toBe("polite");
    fireEvent.click(within(dock).getByRole("button", { name: "Clear" }));
    fireEvent.keyDown(within(dock).getByRole("button", { name: "Archive" }), { key: "Escape" });
    expect(onClear).toHaveBeenCalledTimes(2);
  });
});

describe("diff folds", () => {
  it("a folded row is inert and the toggle says what it controls", () => {
    const onToggle = vi.fn();
    render(
      <ul>
        <li>
          <FoldToggle expanded={false} controls="f1 f2" onToggle={onToggle}>
            2 unchanged paragraphs
          </FoldToggle>
        </li>
        <FoldRow id="f1" folded>
          one
        </FoldRow>
        <FoldRow id="f2" folded={false}>
          two
        </FoldRow>
      </ul>,
    );
    const toggle = screen.getByRole("button", { name: "2 unchanged paragraphs" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe("f1 f2");
    expect(document.getElementById("f1")?.hasAttribute("inert")).toBe(true);
    expect(document.getElementById("f2")?.hasAttribute("inert")).toBe(false);
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalled();
  });

  it("the stepper starts before the first change and stops at the ends", () => {
    const onStep = vi.fn();
    const { rerender } = render(
      <ChangeStepper current={-1} total={3} status="3 changes" previousLabel="Prev" nextLabel="Next" onStep={onStep} />,
    );
    expect((screen.getByRole("button", { name: "Prev" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onStep).toHaveBeenLastCalledWith(0);
    rerender(
      <ChangeStepper
        current={2}
        total={3}
        status="Change 3 of 3"
        previousLabel="Prev"
        nextLabel="Next"
        onStep={onStep}
      />,
    );
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(onStep).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("Change 3 of 3").getAttribute("aria-live")).toBe("polite");
  });
});

describe("DetailPanel", () => {
  function Panel(props: { onNext: () => void; onPrevious: () => void; onOpenChange: (open: boolean) => void }) {
    return (
      <DetailPanel
        open
        onOpenChange={props.onOpenChange}
        title="Report 2"
        position="2 of 3"
        hasPrevious
        hasNext
        onPrevious={props.onPrevious}
        onNext={props.onNext}
        previousLabel="Previous report"
        nextLabel="Next report"
        closeLabel="Close details"
        contentKey="r2"
        direction={0}
      >
        <textarea aria-label="Reason" />
        <button type="button">Hide</button>
      </DetailPanel>
    );
  }

  it("steps with J and K, not while typing, and closes with Escape", () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    const onOpenChange = vi.fn();
    render(<Panel onNext={onNext} onPrevious={onPrevious} onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog", { name: "Report 2" });
    expect(within(dialog).getByText("2 of 3")).toBeTruthy();
    fireEvent.keyDown(within(dialog).getByRole("button", { name: "Hide" }), { key: "j" });
    fireEvent.keyDown(within(dialog).getByRole("button", { name: "Hide" }), { key: "K" });
    fireEvent.keyDown(within(dialog).getByRole("button", { name: "Hide" }), { key: "j", ctrlKey: true });
    fireEvent.keyDown(within(dialog).getByLabelText("Reason"), { key: "j" });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Next report" }));
    expect(onNext).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
