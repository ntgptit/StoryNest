import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useRef, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Breadcrumbs } from "./breadcrumbs.tsx";
import { INLINE_ALERT_FOLD_MS, InlineAlert } from "./inline-alert.tsx";
import { SUBMIT_DONE_MS, SubmitButton } from "./submit-button.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("InlineAlert", () => {
  it("is an alert for errors and a status otherwise, and has no × without onDismiss", () => {
    render(
      <>
        <InlineAlert tone="danger" title="Conflict">
          Reload first
        </InlineAlert>
        <InlineAlert title="Backup">Kept on this device</InlineAlert>
      </>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Conflict");
    expect(screen.getByRole("status").textContent).toContain("Kept on this device");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("folds away on ×, then calls onDismiss and moves focus to focusAfterDismiss", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    function Host() {
      const heading = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Publish
          </h2>
          <InlineAlert tone="danger" onDismiss={onDismiss} dismissLabel="Dismiss" focusAfterDismiss={heading}>
            Refused
          </InlineAlert>
        </>
      );
    }
    const { container } = render(<Host />);
    const root = container.querySelector('[data-slot="inline-alert"]')!;
    expect(root.getAttribute("data-state")).toBe("open");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(root.getAttribute("data-state")).toBe("folding");
    expect(root.className).toContain("grid-rows-[0fr]");
    // A second press while it folds does nothing.
    fireEvent.click(screen.getByRole("button", { name: "Dismiss", hidden: true }));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(INLINE_ALERT_FOLD_MS));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Publish" }));
  });
});

describe("SubmitButton", () => {
  function Form({ children }: { children?: ReactNode }) {
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(0);
    return (
      <>
        <SubmitButton label="Save" busyLabel="Saving…" doneLabel="Saved" busy={busy} succeeded={saved} />
        <button type="button" onClick={() => setBusy(true)}>
          start
        </button>
        <button
          type="button"
          onClick={() => {
            setBusy(false);
            setSaved((count) => count + 1);
          }}
        >
          finish
        </button>
        {children}
      </>
    );
  }

  it("starts idle (no check on first render), shows the busy label, then the check and Saved for a moment", () => {
    vi.useFakeTimers();
    render(<Form />);
    const button = () => screen.getAllByRole("button")[0]!;
    expect(button().textContent).toBe("Save");
    expect(button().getAttribute("data-state")).toBe("idle");
    expect(button().querySelector('[data-part="check"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(button().textContent).toBe("Saving…");
    expect(button().getAttribute("aria-busy")).toBe("true");
    expect((button() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(button().textContent).toBe("Saved");
    expect(button().getAttribute("data-state")).toBe("done");
    expect(button().querySelector('[data-part="check"]')).not.toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Saved");

    act(() => vi.advanceTimersByTime(SUBMIT_DONE_MS));
    expect(button().textContent).toBe("Save");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("does not play the check when mounted with a count above zero", () => {
    render(<SubmitButton label="Save" busyLabel="Saving…" doneLabel="Saved" succeeded={3} />);
    expect(screen.getByRole("button").getAttribute("data-state")).toBe("idle");
  });
});

describe("Breadcrumbs", () => {
  const Link = ({ href, className, children }: { href: string; className?: string; children?: ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );

  it("links every parent, marks the last item as the current page and has no switcher by default", () => {
    render(
      <Breadcrumbs
        label="Location"
        LinkComponent={Link}
        items={[
          { label: "Studio", href: "/studio" },
          { label: "Story", href: "/studio/story/1" },
          { label: "Chapters" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Location" });
    expect(within(nav).getByRole("link", { name: "Studio" }).getAttribute("href")).toBe("/studio");
    expect(within(nav).getByRole("link", { name: "Story" }).getAttribute("href")).toBe("/studio/story/1");
    expect(within(nav).queryByRole("link", { name: "Chapters" })).toBeNull();
    expect(within(nav).getByText("Chapters").closest("[aria-current]")?.getAttribute("aria-current")).toBe("page");
    expect(within(nav).queryByRole("button")).toBeNull();
  });

  it("opens the switcher menu beside a crumb, checks the current one and reports another pick", async () => {
    const onSelect = vi.fn();
    render(
      <Breadcrumbs
        label="Location"
        LinkComponent={Link}
        items={[
          {
            label: "First story",
            href: "/studio/story/a",
            switcher: {
              label: "Switch story",
              value: "a",
              options: [
                { id: "a", label: "First story", description: "Owner" },
                { id: "b", label: "Second story", description: "Editor" },
              ],
              onSelect,
            },
          },
          { label: "Chapters" },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Switch story" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    fireEvent.click(items[0]!);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Switch story" }), { button: 0, pointerType: "mouse" });
    fireEvent.click(within(await screen.findByRole("menu")).getByRole("menuitemradio", { name: /Second story/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });
});
