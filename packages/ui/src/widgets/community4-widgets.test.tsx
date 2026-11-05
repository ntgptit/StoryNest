import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HandDrawnMarks, penLength, penPath, seededRandom } from "./hand-drawn-marks.tsx";
import {
  MentionTextarea,
  insertMention,
  mentionQueryAt,
  mentionedNames,
  splitMentions,
  type MentionCandidate,
} from "./mention-textarea.tsx";
import { ReactionBar } from "./reaction-bar.tsx";
import { StarRating, ratingForKey } from "./star-rating.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ReactionBar", () => {
  const options = [
    { value: "laugh", emoji: "😂", label: "Laugh" },
    { value: "fire", emoji: "🔥", label: "Fire" },
    { value: "clap", emoji: "👏", label: "Clap" },
  ] as const;
  type Code = (typeof options)[number]["value"];
  function Bar({
    onToggle = () => undefined,
    disabled = false,
    onDisabledPress = () => undefined,
  }: {
    onToggle?: (value: Code, on: boolean) => void;
    disabled?: boolean;
    onDisabledPress?: () => void;
  }) {
    const [counts, setCounts] = useState<Partial<Record<Code, number>>>({ laugh: 2 });
    const [mine, setMine] = useState<Code[]>([]);
    return (
      <ReactionBar<Code>
        options={options}
        counts={counts}
        mine={mine}
        disabled={disabled}
        onDisabledPress={onDisabledPress}
        onToggle={(value, on) => {
          onToggle(value, on);
          setMine((m) => (on ? [...m, value] : m.filter((x) => x !== value)));
          setCounts((c) => ({ ...c, [value]: Math.max(0, (c[value] ?? 0) + (on ? 1 : -1)) }));
        }}
        label="Reactions"
        addLabel="Add a reaction"
        pickerLabel="Pick a reaction"
        chipLabel={(o, n, me) => `${o.label}, ${n}${me ? ", you" : ""}`}
      />
    );
  }

  it("shows a chip per reaction that has any, and nothing pops on first render", () => {
    render(<Bar />);
    const chip = screen.getByRole("button", { name: "Laugh, 2" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: /^Fire/ })).toBeNull();
    expect(document.querySelector(".motion-safe\\:animate-chip-pop")).toBeNull();
  });

  it("toggles a chip and pops it", () => {
    const onToggle = vi.fn();
    render(<Bar onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Laugh, 2" }));
    expect(onToggle).toHaveBeenCalledWith("laugh", true);
    const chip = screen.getByRole("button", { name: "Laugh, 3, you" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.querySelector(".motion-safe\\:animate-chip-pop")).not.toBeNull();
  });

  it("opens the picker from the smiley, adds the picked reaction and returns focus", () => {
    render(<Bar />);
    const add = screen.getByRole("button", { name: "Add a reaction" });
    expect(add.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(add);
    expect(add.getAttribute("aria-expanded")).toBe("true");
    const picker = screen.getByRole("dialog", { name: "Pick a reaction" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Laugh");
    fireEvent.keyDown(picker, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Fire");
    fireEvent.click(screen.getByRole("button", { name: "Fire" }));
    expect(screen.getByRole("button", { name: "Fire, 1, you" })).toBeTruthy();
    expect(add.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(add);
  });

  it("closes on Escape and on a press outside", () => {
    render(<Bar />);
    const add = screen.getByRole("button", { name: "Add a reaction" });
    fireEvent.click(add);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(add.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(add);
    fireEvent.pointerDown(document.body);
    expect(add.getAttribute("aria-expanded")).toBe("false");
  });

  it("asks the caller instead when disabled (a guest)", () => {
    const onDisabledPress = vi.fn();
    const onToggle = vi.fn();
    render(<Bar disabled onDisabledPress={onDisabledPress} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Add a reaction" }));
    fireEvent.click(screen.getByRole("button", { name: "Laugh, 2" }));
    expect(onDisabledPress).toHaveBeenCalledTimes(2);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("mention helpers", () => {
  it("finds the @word at the caret", () => {
    expect(mentionQueryAt("hi @an", 6)).toEqual({ start: 3, query: "an" });
    expect(mentionQueryAt("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionQueryAt("mail a@b", 8)).toBeNull();
    expect(mentionQueryAt("hi @an there", 12)).toBeNull();
  });

  it("inserts a mention and moves the caret after it", () => {
    expect(insertMention("hi @an!", 3, 6, "an_nguyen")).toEqual({ text: "hi @an_nguyen !", caret: 14 });
  });

  it("reads mentions with the server's rule", () => {
    expect(mentionedNames("@Mai and @mai, x@@bob, me@site.com, @ab, @lan_")).toEqual(["mai", "lan_"]);
    expect(splitMentions("hey @mai!")).toEqual([
      { text: "hey ", mention: false },
      { text: "@mai", mention: true },
      { text: "!", mention: false },
    ]);
  });
});

describe("MentionTextarea", () => {
  const people: MentionCandidate[] = [
    { username: "mai", name: "Mai Lan" },
    { username: "minh", name: "Minh" },
  ];

  function Box({ onQuery = () => undefined }: { onQuery?: (q: string | null) => void }) {
    const [value, setValue] = useState("");
    const [query, setQuery] = useState<string | null>(null);
    return (
      <MentionTextarea
        aria-label="Comment"
        value={value}
        onValueChange={setValue}
        candidates={query === null ? [] : people.filter((p) => p.username.startsWith(query))}
        onQueryChange={(q) => {
          onQuery(q);
          setQuery(q);
        }}
        listLabel="People"
        emptyLabel="Nobody"
        notifyLabel="Mentioning"
      />
    );
  }

  const type = (field: HTMLTextAreaElement, text: string) => {
    fireEvent.change(field, { target: { value: text, selectionStart: text.length } });
    field.setSelectionRange(text.length, text.length);
    fireEvent.change(field, { target: { value: text } });
  };

  it("opens the list on @, narrows it, and inserts the chosen name with Enter", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const onQuery = vi.fn();
    render(<Box onQuery={onQuery} />);
    const field = screen.getByRole("combobox", { name: "Comment" }) as HTMLTextAreaElement;
    expect(field.getAttribute("aria-expanded")).toBe("false");
    type(field, "hi @m");
    expect(onQuery).toHaveBeenLastCalledWith("m");
    expect(field.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field.value).toBe("hi @minh ");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Mentioning")).toBeTruthy();
  });

  it("closes with Escape and says when nobody matches", () => {
    render(<Box />);
    const field = screen.getByRole("combobox", { name: "Comment" }) as HTMLTextAreaElement;
    type(field, "@zz");
    expect(screen.getByText("Nobody")).toBeTruthy();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("HandDrawnMarks", () => {
  it("draws the same wobble for the same seed", () => {
    const rect = { x: 0, y: 0, w: 40, h: 10 };
    expect(penPath(rect, "underline", 0, seededRandom("a"))).toBe(penPath(rect, "underline", 0, seededRandom("a")));
    expect(penPath(rect, "box", 0, seededRandom("a")).startsWith("M")).toBe(true);
    expect(penPath(rect, "circle", 1, seededRandom("b")).split(" L")).toHaveLength(27);
    expect(penLength(rect, "box")).toBeGreaterThan(penLength(rect, "underline"));
  });

  it("is decorative and draws nothing without layout (no animation on first render)", () => {
    render(
      <p style={{ position: "relative" }}>
        Some words here
        <HandDrawnMarks marks={[{ id: "h1", start: 5, end: 10, style: "underline" }]} />
      </p>,
    );
    const svg = document.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".motion-safe\\:animate-pen-draw")).toBeNull();
  });
});

describe("StarRating", () => {
  const words = ["Not rated", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

  function Stars({ initial = 0, onChange = () => undefined }: { initial?: number; onChange?: (n: number) => void }) {
    const [value, setValue] = useState(initial);
    return (
      <StarRating
        value={value}
        onChange={(n) => {
          onChange(n);
          setValue(n);
        }}
        label="Your rating"
        words={words}
        valueText={(n) => (n ? `${n} stars` : "Not rated")}
      />
    );
  }

  it("maps keys to values", () => {
    expect(ratingForKey("ArrowRight", 2)).toBe(3);
    expect(ratingForKey("ArrowLeft", 0)).toBe(0);
    expect(ratingForKey("End", 1)).toBe(5);
    expect(ratingForKey("Home", 4, 1)).toBe(1);
    expect(ratingForKey("3", 0)).toBe(3);
    expect(ratingForKey("x", 2)).toBeNull();
  });

  it("is a slider that rates by press and by keys, and pops only what the reader lit", () => {
    const onChange = vi.fn();
    render(<Stars initial={2} onChange={onChange} />);
    const slider = screen.getByRole("slider", { name: "Your rating" });
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
    expect(document.querySelector(".motion-safe\\:animate-star-pop")).toBeNull();
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(slider.getAttribute("aria-valuetext")).toBe("3 stars");
    expect(document.querySelectorAll(".motion-safe\\:animate-star-pop")).toHaveLength(1);
    act(() => {
      fireEvent.click(slider.children[4] as Element);
    });
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByText("Excellent")).toBeTruthy();
    fireEvent.keyDown(slider, { key: "0" });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
