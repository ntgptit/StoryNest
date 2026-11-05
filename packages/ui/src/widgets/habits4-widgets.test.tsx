import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Flame } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AchievementBadges, type Badge } from "./achievement-badges.tsx";
import { ActivityRings, type ActivityDay } from "./activity-rings.tsx";
import { StreakFlame, type StreakDay } from "./streak-flame.tsx";
import { LEVEL_UP_HOLD_MS, XpBar } from "./xp-bar.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const week = (read: number): StreakDay[] =>
  ["M", "T", "W", "T", "F", "S", "S"].map((abbr, i) => ({
    key: String(i),
    abbr,
    label: `day ${i} ${i < read ? "read" : "not read"}`,
    read: i < read,
    isToday: i === Math.min(read, 6),
  }));
const flameText = { title: "Reading streak", unit: () => "day streak", fullWeek: "Full week!", week: "This week" };

describe("StreakFlame", () => {
  it("shows the streak and the week, without animating on first render", () => {
    const { container } = render(<StreakFlame streak={11} days={week(3)} text={flameText} hint="Keep going" />);
    expect(screen.getByRole("region", { name: "Reading streak" })).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
    const list = screen.getByRole("list", { name: "This week" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    expect(within(list).getByLabelText("day 0 read")).toBeTruthy();
    expect(screen.queryByText("Full week!")).toBeNull();
    expect(container.querySelector(".animate-flame-flare, .animate-slot-pop")).toBeNull();
  });

  it("flares and hops the new slot when the streak grows; seven days show the full-week badge", () => {
    const { container, rerender } = render(<StreakFlame streak={11} days={week(6)} text={flameText} />);
    rerender(<StreakFlame streak={12} days={week(7)} text={flameText} />);
    expect(container.querySelector(".animate-flame-flare")).toBeTruthy();
    expect(container.querySelectorAll(".animate-slot-pop")).toHaveLength(1);
    expect(screen.getByText("Full week!").className).toContain("animate-badge-pop");
  });

  it("sways only with motion allowed", () => {
    const { container } = render(<StreakFlame streak={1} days={week(1)} text={flameText} />);
    const paths = container.querySelectorAll("svg[viewBox='0 0 120 144'] path");
    expect(paths).toHaveLength(3);
    paths.forEach((p) => expect(p.getAttribute("class")).toMatch(/motion-safe:animate-flame-sway-/));
  });
});

const days: ActivityDay[] = [
  { key: "a", abbr: "Mon", label: "Monday", values: [1, 0] },
  { key: "b", abbr: "Tue", label: "Tuesday", values: [4, 3] },
  { key: "c", abbr: "Wed", label: "Today", values: [2, 1] },
];
const rings = [
  { key: "read", label: "Read", goal: 3, format: (v: number, g: number) => `${v} / ${g}` },
  { key: "done", label: "Finished", goal: 3, format: (v: number, g: number) => `${v} / ${g}` },
];
const ringsText = {
  title: "Daily goal",
  rings: "Rings",
  days: "Pick a day",
  dayLabel: (d: ActivityDay) => `${d.label}: ${d.values.join(",")}`,
};

describe("ActivityRings", () => {
  it("starts on the last day and picks days by click and arrow keys (one tab stop)", () => {
    render(<ActivityRings rings={rings} days={days} text={ringsText} summary="Goal met on 1 day" />);
    const group = screen.getByRole("group", { name: "Pick a day" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "false", "true"]);
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
    expect(screen.getByRole("button", { name: "Read: 2 / 3" })).toBeTruthy();
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(buttons[1]);
    expect(screen.getByRole("button", { name: "Read: 4 / 3" })).toBeTruthy();
    fireEvent.keyDown(group, { key: "Home" });
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(buttons[2] as HTMLElement);
    expect(buttons[2]?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Goal met on 1 day")).toBeTruthy();
  });

  it("draws a lap and a tip for a ring past its goal", () => {
    const { container } = render(<ActivityRings rings={rings} days={days} text={ringsText} initialDay={1} />);
    // ring "Read" is at 4/3: the lap arc and the tip are visible
    const firstRing = container.querySelector("svg g") as SVGGElement;
    const circles = firstRing.querySelectorAll("circle");
    expect((circles[2] as SVGCircleElement).style.opacity).toBe("1");
    expect((circles[3] as SVGCircleElement).style.opacity).toBe("1");
  });

  it("highlights one ring from its legend item", () => {
    const { container } = render(<ActivityRings rings={rings} days={days} text={ringsText} />);
    fireEvent.focus(screen.getByRole("button", { name: "Read: 2 / 3" }));
    const groups = container.querySelectorAll("svg[viewBox='0 0 164 164'] > g");
    expect(groups[0]?.getAttribute("class")).not.toContain("opacity-25");
    expect(groups[1]?.getAttribute("class")).toContain("opacity-25");
  });
});

const xpText = {
  level: "LEVEL",
  bar: "Experience",
  progress: (into: number, needed: number) => `${into} / ${needed} XP`,
  toNext: (left: number) => `${left} to go`,
  levelUp: "Level up!",
};

describe("XpBar", () => {
  it("shows level and progress without effects on first render", () => {
    const { container } = render(
      <XpBar
        name="An"
        initial="A"
        level={3}
        into={60}
        needed={200}
        total={310}
        text={xpText}
        rules={[{ key: "r", label: "Read", xp: "+10 XP" }]}
      />,
    );
    const bar = screen.getByRole("progressbar", { name: "Experience" });
    expect(bar.getAttribute("aria-valuenow")).toBe("60");
    expect(bar.getAttribute("aria-valuetext")).toBe("60 / 200 XP");
    expect(screen.getByText("140 to go")).toBeTruthy();
    expect(screen.getByText("+10 XP")).toBeTruthy();
    expect(container.querySelector(".motion-safe\\:animate-xp-shine, .animate-level-banner")).toBeNull();
  });

  it("shines on a gain, and on a level-up holds the full bar before the banner", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <XpBar name="An" initial="A" level={3} into={60} needed={200} total={310} text={xpText} />,
    );
    rerender(<XpBar name="An" initial="A" level={3} into={90} needed={200} total={340} text={xpText} />);
    expect(container.querySelector(".motion-safe\\:animate-xp-shine")).toBeTruthy();
    rerender(<XpBar name="An" initial="A" level={4} into={10} needed={250} total={460} text={xpText} />);
    const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(screen.queryByText("Level up!")).toBeNull();
    act(() => void vi.advanceTimersByTime(LEVEL_UP_HOLD_MS));
    expect(screen.getByText("Level up!")).toBeTruthy();
  });
});

const badge = (over: Partial<Badge>): Badge => ({
  key: "k",
  name: "Steady",
  description: "Read 7 days in a row",
  icon: <Flame />,
  tone: 5,
  earned: false,
  progress: 3,
  target: 7,
  ...over,
});
const badgeText = {
  title: "Badges",
  count: (e: number, n: number) => `${e}/${n} earned`,
  locked: (b: Badge) => `${b.name}, locked, ${b.progress} of ${b.target}`,
  flip: (b: Badge) => `${b.name}, ${b.earnedLabel}`,
};

describe("AchievementBadges", () => {
  it("lists locked badges with progress and flips an earned one", () => {
    render(
      <AchievementBadges
        badges={[badge({ key: "a" }), badge({ key: "b", name: "First", earned: true, earnedLabel: "Earned 1 Nov" })]}
        text={badgeText}
      />,
    );
    expect(screen.getByText("1/2 earned")).toBeTruthy();
    expect(screen.getByLabelText("Steady, locked, 3 of 7")).toBeTruthy();
    expect(screen.getByText("3/7")).toBeTruthy();
    const flip = screen.getByRole("button", { name: "First, Earned 1 Nov" });
    expect(flip.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(flip);
    expect(flip.getAttribute("aria-pressed")).toBe("true");
    expect(flip.className).toContain("rotate-y-180");
    expect(screen.getAllByRole("button")).toHaveLength(1); // a locked badge is not a control
  });

  it("celebrates a badge earned while on screen, never on first render", () => {
    const { container, rerender } = render(<AchievementBadges badges={[badge({})]} text={badgeText} />);
    expect(container.querySelector(".animate-medal-pop")).toBeNull();
    rerender(<AchievementBadges badges={[badge({ earned: true, earnedLabel: "today" })]} text={badgeText} />);
    expect(container.querySelector(".animate-medal-pop")).toBeTruthy();
    expect(container.querySelectorAll(".motion-safe\\:animate-medal-spark").length).toBeGreaterThan(0);
  });
});
