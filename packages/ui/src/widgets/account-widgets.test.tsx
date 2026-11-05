import { act, cleanup, createEvent, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "../lib/use-countdown.ts";
import { useOnlineStatus } from "../lib/use-media-query.ts";
import { AutocompleteInput, type AutocompleteOption } from "./autocomplete-input.tsx";
import { ConnectionBanner } from "./connection-banner.tsx";
import { DropZone } from "./drop-zone.tsx";
import { EmailTypoHint } from "./email-typo-hint.tsx";
import { EnvelopeSent, ResendButton } from "./envelope-sent.tsx";
import { FullScreenMenu, fullScreenMenuItemStyle, fullScreenMenuLinkClass } from "./full-screen-menu.tsx";
import { PasswordStrengthMeter } from "./password-strength-meter.tsx";
import { PULL_THRESHOLD, PullToRefresh, rubberBand } from "./pull-to-refresh.tsx";
import { SkySwitch } from "./sky-switch.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SkySwitch", () => {
  it("is a labelled switch that reports the other state", () => {
    const onNightChange = vi.fn();
    render(<SkySwitch night={false} onNightChange={onNightChange} label="Dark theme" />);
    const control = screen.getByRole("switch", { name: "Dark theme" });
    expect(control.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(control);
    expect(onNightChange).toHaveBeenCalledWith(true);
  });

  it("draws the night sky when on", () => {
    render(<SkySwitch night onNightChange={vi.fn()} label="Dark theme" />);
    const control = screen.getByRole("switch");
    expect(control.getAttribute("aria-checked")).toBe("true");
    expect(control.querySelector("[data-night]")).not.toBeNull();
  });
});

/** A drag event carrying files, as a browser sends it. */
function fileDrag(type: "dragEnter" | "dragOver" | "dragLeave" | "drop", target: Element, files: File[] = []) {
  const event = createEvent[type](target);
  Object.defineProperty(event, "dataTransfer", {
    value: { types: ["Files"], files, dropEffect: "none" },
  });
  fireEvent(target, event);
  return event;
}

describe("DropZone", () => {
  const picture = new File(["x"], "cover.png", { type: "image/png" });

  it("highlights while files are dragged over and hands the dropped files over", () => {
    const onFiles = vi.fn();
    render(
      <DropZone label="Drop the picture here" onFiles={onFiles}>
        <p>Cover</p>
      </DropZone>,
    );
    const zone = screen.getByText("Cover").parentElement!;
    fileDrag("dragEnter", zone);
    expect(zone.hasAttribute("data-over")).toBe(true);
    expect(screen.getByText("Drop the picture here")).toBeTruthy();
    const drop = fileDrag("drop", zone, [picture]);
    expect(drop.defaultPrevented).toBe(true);
    expect(onFiles).toHaveBeenCalledWith([picture]);
    expect(zone.hasAttribute("data-over")).toBe(false);
  });

  it("keeps the highlight across children and ignores text drags", () => {
    render(
      <DropZone label="Drop" onFiles={vi.fn()}>
        <p>
          <span>inner</span>
        </p>
      </DropZone>,
    );
    const zone = screen.getByText("inner").closest("[class*='relative']")!;
    fileDrag("dragEnter", zone);
    fileDrag("dragEnter", screen.getByText("inner"));
    fileDrag("dragLeave", screen.getByText("inner"));
    expect(zone.hasAttribute("data-over")).toBe(true);
    fileDrag("dragLeave", zone);
    expect(zone.hasAttribute("data-over")).toBe(false);

    const text = createEvent.dragEnter(zone);
    Object.defineProperty(text, "dataTransfer", { value: { types: ["text/plain"], files: [] } });
    fireEvent(zone, text);
    expect(zone.hasAttribute("data-over")).toBe(false);
  });

  it("does nothing while disabled or when something inside already handled the drop", () => {
    const onFiles = vi.fn();
    const { rerender } = render(
      <DropZone label="Drop" onFiles={onFiles} disabled>
        <p>Cover</p>
      </DropZone>,
    );
    const zone = screen.getByText("Cover").parentElement!;
    fileDrag("dragEnter", zone);
    expect(zone.hasAttribute("data-over")).toBe(false);
    fileDrag("drop", zone, [picture]);
    rerender(
      <DropZone label="Drop" onFiles={onFiles}>
        <p onDrop={(event) => event.preventDefault()}>Cover</p>
      </DropZone>,
    );
    fileDrag("drop", screen.getByText("Cover"), [picture]);
    expect(onFiles).not.toHaveBeenCalled();
  });
});

const PEOPLE: AutocompleteOption[] = [
  { id: "1", value: "annguyen", primary: "An Nguyễn", secondary: "@annguyen" },
  { id: "2", value: "anhtran", primary: "Anh Trần", secondary: "@anhtran" },
];

function Combo({ options = PEOPLE, onSubmit = vi.fn() }: { options?: AutocompleteOption[]; onSubmit?: () => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="who">Username</label>
      <AutocompleteInput
        id="who"
        value={value}
        onValueChange={setValue}
        options={value === "" ? [] : options}
        listLabel="Suggested authors"
        emptyText="No author matches"
      />
    </form>
  );
}

describe("AutocompleteInput", () => {
  it("is a combobox whose list opens on typing, with the typed part marked", () => {
    render(<Combo />);
    const input = screen.getByRole("combobox", { name: "Username" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    fireEvent.change(input, { target: { value: "an" } });
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getAllByText("An")[0]?.tagName).toBe("MARK");
  });

  it("moves with the arrow keys and Enter picks the highlighted row", () => {
    render(<Combo />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "an" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const second = screen.getAllByRole("option")[1]!;
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(second.id);
    fireEvent.keyDown(input, { key: "ArrowDown" }); // wraps to the first
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("anhtran");
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("completes the faint rest with Tab, and Enter without a highlight submits what was typed", () => {
    const onSubmit = vi.fn();
    render(<Combo onSubmit={onSubmit} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ann" } });
    expect(input.parentElement?.textContent).toContain("guyen");
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("annguyen");

    fireEvent.change(input, { target: { value: "someone_else" } });
    fireEvent.submit(input.form!);
    expect(onSubmit).toHaveBeenCalled();
    expect(input.value).toBe("someone_else");
  });

  it("chooses with a press, closes with Escape and says when nothing matches", () => {
    const { rerender } = render(<Combo />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "an" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    fireEvent.change(input, { target: { value: "an" } });
    fireEvent.click(screen.getByRole("option", { name: /An Nguyễn/ }));
    expect(input.value).toBe("annguyen");

    rerender(<Combo options={[]} />);
    fireEvent.change(input, { target: { value: "zz" } });
    expect(screen.getByRole("status").textContent).toBe("No author matches");
  });
});

describe("PasswordStrengthMeter", () => {
  it("fills as many bars as the score, names the level and reads met checks", () => {
    const { container } = render(
      <PasswordStrengthMeter
        score={2}
        title="Strength"
        levelLabel="Fair"
        metLabel="done"
        checks={[
          { id: "length", label: "At least 8 characters", met: true },
          { id: "symbol", label: "A symbol", met: false },
        ]}
        hints={["Avoid runs like 1234"]}
      />,
    );
    expect(container.querySelectorAll(".scale-x-100")).toHaveLength(2);
    expect(screen.getByText("Fair").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("At least 8 characters").textContent).toBe("At least 8 characters, done");
    expect(screen.getByText("A symbol").textContent).toBe("A symbol");
    expect(screen.getByText("Avoid runs like 1234")).toBeTruthy();
  });
});

describe("FullScreenMenu", () => {
  function Menu() {
    const [open, setOpen] = useState(false);
    return (
      <FullScreenMenu open={open} onOpenChange={setOpen} title="Menu" openLabel="Open menu" closeLabel="Close menu">
        <a href="/ranking" className={fullScreenMenuLinkClass()} style={fullScreenMenuItemStyle(0)}>
          Rankings
        </a>
      </FullScreenMenu>
    );
  }

  it("opens a modal named after its title, closes with Escape and gives focus back", async () => {
    render(<Menu />);
    const button = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(button);
    const dialog = await screen.findByRole("dialog", { name: "Menu" });
    expect(dialog.style.getPropertyValue("--menu-x")).toMatch(/px$/);
    expect(screen.getByRole("link", { name: "Rankings" }).style.animationDelay).toContain("0.22s");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("has its own close button", async () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Close menu" }));
    await act(async () => undefined);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("EnvelopeSent and ResendButton", () => {
  it("the picture is decorative", () => {
    const { container } = render(<EnvelopeSent />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("stays focusable but does nothing while locked, then resends", () => {
    const onResend = vi.fn();
    const { rerender } = render(
      <ResendButton
        secondsLeft={42}
        total={60}
        label="Resend email"
        waitingLabel={(s) => `Resend in ${s} s`}
        onResend={onResend}
      />,
    );
    const button = screen.getByRole("button", { name: "Resend in 42 s" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(onResend).not.toHaveBeenCalled();
    // 18 of 60 s elapsed: the ring is 30 % drawn.
    expect(Number(button.querySelector("circle[pathLength]")?.getAttribute("stroke-dashoffset"))).toBeCloseTo(70);

    rerender(
      <ResendButton
        secondsLeft={0}
        total={60}
        label="Resend email"
        waitingLabel={(s) => `Resend in ${s} s`}
        onResend={onResend}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resend email" }));
    expect(onResend).toHaveBeenCalledTimes(1);
  });
});

describe("useCountdown", () => {
  it("is idle until restarted, then counts whole seconds down to 0", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(3));
    expect(result.current.left).toBe(0);
    act(() => result.current.restart());
    expect(result.current.left).toBe(3);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.left).toBe(2);
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current.left).toBe(0);
  });
});

describe("EmailTypoHint", () => {
  it("shows the fixed address with the change marked and accepts on press", () => {
    const onAccept = vi.fn();
    render(
      <EmailTypoHint
        suggestion={{ head: "an@gm", changed: "ai", tail: "l.com" }}
        before="Did you mean"
        after="?"
        onAccept={onAccept}
      />,
    );
    const button = screen.getByRole("button", { name: "Did you mean an@gmail.com?" });
    expect(screen.getByText("ai").tagName).toBe("MARK");
    fireEvent.click(button);
    expect(onAccept).toHaveBeenCalled();
  });
});

describe("PullToRefresh", () => {
  it("follows the finger at first and gets heavier", () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(-20)).toBe(0);
    expect(rubberBand(50)).toBeGreaterThan(30);
    expect(rubberBand(140)).toBeGreaterThan(PULL_THRESHOLD);
    expect(rubberBand(10_000)).toBeLessThanOrEqual(120);
  });

  it("only renders its children while disabled", () => {
    render(
      <PullToRefresh enabled={false} onRefresh={vi.fn()} labels={{ pull: "Pull", release: "Release", refreshing: "…" }}>
        <p>Feed</p>
      </PullToRefresh>,
    );
    expect(screen.getByText("Feed")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("refreshes after a pull past the threshold at the top of the page", async () => {
    let finish: () => void = () => undefined;
    const onRefresh = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(
      <PullToRefresh enabled onRefresh={onRefresh} labels={{ pull: "Pull", release: "Release", refreshing: "Loading" }}>
        <p>Feed</p>
      </PullToRefresh>,
    );
    const touch = (type: string, y: number) =>
      act(() => {
        window.dispatchEvent(
          Object.assign(new Event(type, { cancelable: true }), {
            touches: type === "touchend" ? [] : [{ clientY: y }],
          }),
        );
      });
    touch("touchstart", 0);
    touch("touchmove", 40);
    touch("touchend", 0);
    expect(onRefresh).not.toHaveBeenCalled();

    touch("touchstart", 0);
    touch("touchmove", 300);
    expect(screen.getByText("Release")).toBeTruthy();
    touch("touchend", 0);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Loading");
    await act(async () => finish());
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("ConnectionBanner and useOnlineStatus", () => {
  const labels = { offlineTitle: "You are offline", offlineBody: "Later.", backTitle: "Back online", backBody: "Now." };

  it("announces offline and back, and is folded away and inert while online", () => {
    const { container, rerender } = render(<ConnectionBanner state="online" animate={false} labels={labels} />);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(container.querySelector("[inert]")).not.toBeNull();
    rerender(<ConnectionBanner state="offline" animate labels={labels} />);
    expect(screen.getByRole("status").textContent).toBe("You are offline. Later.");
    expect(container.querySelector("[inert]")).toBeNull();
    rerender(<ConnectionBanner state="back" animate labels={labels} />);
    expect(screen.getByRole("status").textContent).toBe("Back online");
  });

  it("follows the browser's online and offline events", () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    online.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toBe(false);
  });
});
