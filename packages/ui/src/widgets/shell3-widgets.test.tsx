import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { BookOpen, PenLine } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "../lib/use-countdown.ts";
import { AvailabilityHint } from "./availability-hint.tsx";
import { CommandPalette, type PaletteGroup } from "./command-palette.tsx";
import { ErrorState } from "./error-state.tsx";
import { LockoutCountdown, formatWait } from "./lockout-countdown.tsx";
import { WaveIntro } from "./wave-intro.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useCountdown with a one-off length", () => {
  it("restart(n) runs a cooldown of n seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(60));
    act(() => result.current.restart(5));
    expect(result.current.left).toBe(5);
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current.left).toBe(0);
    act(() => result.current.restart());
    expect(result.current.left).toBe(60);
  });
});

describe("LockoutCountdown", () => {
  it("formats the wait as a clock", () => {
    expect(formatWait(37)).toBe("0:37");
    expect(formatWait(65)).toBe("1:05");
    expect(formatWait(0.2)).toBe("0:01");
    expect(formatWait(-3)).toBe("0:00");
  });

  const labels = { title: "Locked", readyTitle: "Ready", waitingLabel: (clock: string) => `Wait ${clock}` };

  it("tells the full wait once to screen readers and ticks only visually", () => {
    render(<LockoutCountdown secondsLeft={12} total={37} {...labels} action={<a href="/reset">Reset</a>} />);
    const region = screen.getByRole("status");
    expect(region.textContent).toContain("Locked");
    expect(screen.getByText("Wait 0:12").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Wait 0:37").className).toContain("sr-only");
    expect(screen.getByRole("link", { name: "Reset" })).toBeTruthy();
  });

  it("opens the lock at zero", () => {
    render(<LockoutCountdown secondsLeft={0} total={37} {...labels} />);
    expect(screen.getByRole("status").hasAttribute("data-open")).toBe(true);
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.queryByText(/Wait/)).toBeNull();
  });
});

describe("AvailabilityHint", () => {
  const labels = { checking: "Checking", available: "Free", taken: "Taken" };
  it("shows each state and speaks only the answers", () => {
    const { rerender, container } = render(<AvailabilityHint status="idle" labels={labels} />);
    expect(container.querySelector("[data-status]")).toBeNull();
    rerender(<AvailabilityHint status="checking" labels={labels} />);
    expect(container.querySelector("[data-status=checking]")?.textContent).toBe("Checking");
    expect(container.querySelector("[aria-live]")?.textContent).toBe("");
    rerender(<AvailabilityHint status="taken" labels={labels} />);
    expect(container.querySelector("[aria-live]")?.textContent).toBe("Taken");
    rerender(<AvailabilityHint status="available" labels={labels} />);
    expect(container.querySelector("[aria-live]")?.textContent).toBe("Free");
  });
});

describe("ErrorState retry feedback", () => {
  it("is busy while the retry runs, then shakes and re-announces when it failed again", async () => {
    let finish: () => void = () => undefined;
    const onRetry = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { container } = render(<ErrorState title="Failed" onRetry={onRetry} retryLabel="Retry" />);
    const button = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector("[data-retrying]")).not.toBeNull();
    // A second press while it runs does nothing.
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(container.querySelector("[data-failed-again]")?.className).toContain("animate-shake");
    expect(container.querySelector(".sr-only")?.textContent?.trim()).toBe("Failed");
  });

  it("a plain callback still just retries", () => {
    const onRetry = vi.fn();
    const { container } = render(<ErrorState title="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(container.querySelector("[data-retrying]")).toBeNull();
    expect(container.querySelector("[data-failed-again]")).toBeNull();
  });
});

describe("WaveIntro", () => {
  const pages = [
    { icon: BookOpen, title: "Read", body: "Read body" },
    { icon: PenLine, title: "Write", body: "Write body" },
  ];
  const labels = { next: "Next", done: "Start", skip: "Skip", step: (n: number, total: number) => `${n}/${total}` };

  function Harness({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <WaveIntro
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onClose();
        }}
        pages={pages}
        labels={labels}
      />
    );
  }

  it("the wave carries the next page in, and the last button closes", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    expect(screen.getByRole("heading", { name: "Read" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const wave = document.querySelector("[data-wave]");
    expect(wave).not.toBeNull();
    // The page changes when the wave has passed (its animationend, or the fallback timer).
    act(() => void vi.advanceTimersByTime(1600));
    expect(screen.getByRole("heading", { name: "Write" })).toBeTruthy();
    expect(screen.getByText("2/2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("skip closes from any page", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("CommandPalette", () => {
  it("marks the matched letters, picks with the mouse and shows the empty text", () => {
    const go = vi.fn();
    const onOpenChange = vi.fn();
    const groups: PaletteGroup[] = [
      { key: "a", label: "Go to", items: [{ key: "lib", label: "Library", onSelect: go }] },
      { key: "b", label: "Stories", items: [] },
    ];
    const labels = { title: "Palette", input: "Find", placeholder: "Type", empty: "Nothing", results: "Results" };
    const { rerender } = render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        query="bra"
        onQueryChange={vi.fn()}
        groups={groups}
        labels={labels}
      />,
    );
    expect(screen.getByText("bra").tagName).toBe("MARK");
    // Empty groups are left out.
    expect(screen.getAllByRole("group")).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: "Library" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(go).toHaveBeenCalledTimes(1);
    rerender(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        query="zzz"
        onQueryChange={vi.fn()}
        groups={[{ key: "a", label: "Go to", items: [] }]}
        labels={labels}
      />,
    );
    expect(screen.getByText("Nothing")).toBeTruthy();
    expect(screen.getByRole("combobox").getAttribute("aria-activedescendant")).toBeNull();
  });
});
