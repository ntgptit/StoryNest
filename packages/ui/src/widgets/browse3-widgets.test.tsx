import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoverStack } from "./cover-stack.tsx";
import { InfiniteList } from "./infinite-list.tsx";
import { InlineEditTitle } from "./inline-edit-title.tsx";
import { PadlockIcon } from "./padlock-icon.tsx";

afterEach(cleanup);

describe("InlineEditTitle", () => {
  const setup = (overrides: Partial<Parameters<typeof InlineEditTitle>[0]> = {}) => {
    const onSave = vi.fn(async () => undefined);
    render(
      <InlineEditTitle
        value="Old name"
        onSave={onSave}
        validate={(next) => (next.length > 10 ? "Too long" : null)}
        editLabel="Rename: Old name"
        inputLabel="Name"
        saveLabel="Save"
        cancelLabel="Cancel"
        {...overrides}
      />,
    );
    return { onSave };
  };
  const field = () => screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;

  it("is a heading with a button; pressing it opens a field with the title, still under a hidden h1", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Old name");
    fireEvent.click(screen.getByRole("button", { name: "Rename: Old name" }));
    expect(field().value).toBe("Old name");
    expect(document.activeElement).toBe(field());
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("sr-only");
  });

  it("saves the trimmed value with Enter and closes", async () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Rename: Old name" }));
    fireEvent.change(field(), { target: { value: "  New  " } });
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("New"));
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
  });

  it("puts the title back with Esc or Cancel without saving, and closes an unchanged title without saving", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Rename: Old name" }));
    fireEvent.change(field(), { target: { value: "Changed" } });
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Rename: Old name" }));
    expect(field().value).toBe("Old name");
    fireEvent.change(field(), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Rename: Old name" }));
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a value the check rejects, and keeps the field open with the reason when the save fails", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Offline"));
    setup({ onSave });
    fireEvent.click(screen.getByRole("button", { name: "Rename: Old name" }));
    fireEvent.change(field(), { target: { value: "Far too long a name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert").textContent).toBe("Too long");
    expect(field().getAttribute("aria-invalid")).toBe("true");
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(field(), { target: { value: "Short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Offline"));
    expect(field().value).toBe("Short");
  });
});

describe("PadlockIcon", () => {
  it("is decorative and marks the open state for the shackle", () => {
    const { container, rerender } = render(<PadlockIcon open={false} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.hasAttribute("data-open")).toBe(false);
    rerender(<PadlockIcon open />);
    expect(svg.hasAttribute("data-open")).toBe(true);
  });
});

describe("CoverStack", () => {
  it("piles at most three covers with the first on top, and a blank card for an empty list", () => {
    const { container, rerender } = render(
      <CoverStack covers={[{ url: "/a.jpg" }, { url: null }, { url: "/c.jpg" }, { url: "/d.jpg" }]} />,
    );
    const root = container.firstElementChild!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.children).toHaveLength(3);
    expect(root.lastElementChild?.querySelector("img")?.getAttribute("src")).toBe("/a.jpg");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    rerender(<CoverStack covers={[]} />);
    expect(container.firstElementChild!.children).toHaveLength(1);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("InfiniteList revealAppended", () => {
  beforeEach(() => {
    class FakeObserver {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  const items = (n: number, prefix = "s") => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));
  const props = (list: { id: string }[], onLoadMore = vi.fn()) => ({
    items: list,
    getKey: (item: { id: string }) => item.id,
    renderItem: (item: { id: string }) => <span>{item.id}</span>,
    hasMore: true,
    isLoadingMore: false,
    onLoadMore,
    loadMoreLabel: "More",
    revealAppended: true,
  });
  const rising = () =>
    screen
      .getAllByRole("listitem")
      .filter((li) => li.className.includes("animate-card-rise"))
      .map((li) => li.textContent);

  it("never animates the first page, then lets only the page that load more brought in rise, staggered", () => {
    const { rerender } = render(<InfiniteList {...props(items(2))} />);
    expect(rising()).toEqual([]);
    act(() => fireEvent.click(screen.getByRole("button", { name: "More" })));
    rerender(<InfiniteList {...props(items(4))} />);
    expect(rising()).toEqual(["s2", "s3"]);
    const delays = screen.getAllByRole("listitem").map((li) => li.style.animationDelay);
    expect(delays).toEqual(["", "", "0ms", "60ms"]);
    // A further page joins in; the earlier one keeps its class (its animation is not cut short, and never replays).
    act(() => fireEvent.click(screen.getByRole("button", { name: "More" })));
    rerender(<InfiniteList {...props(items(6))} />);
    expect(rising()).toEqual(["s2", "s3", "s4", "s5"]);
  });

  it("does not animate a list that was replaced or refreshed without asking for more", () => {
    const { rerender } = render(<InfiniteList {...props(items(2))} />);
    rerender(<InfiniteList {...props(items(3, "t"))} />);
    expect(rising()).toEqual([]);
  });

  it("does nothing without the flag", () => {
    const { rerender } = render(<InfiniteList {...props(items(2))} revealAppended={false} />);
    act(() => fireEvent.click(screen.getByRole("button", { name: "More" })));
    rerender(<InfiniteList {...props(items(4))} revealAppended={false} />);
    expect(rising()).toEqual([]);
  });
});
