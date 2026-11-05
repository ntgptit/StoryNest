import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EventPopup } from "./event-popup.tsx";
import { ExpandingSettings } from "./expanding-settings.tsx";
import { RoleMatrix } from "./role-matrix.tsx";
import { RollingBanner } from "./rolling-banner.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const bannerLabels = {
  region: "Announcements",
  roleDescription: "rotating banner",
  tag: "New",
  next: "Next announcement",
  close: "Close announcements",
  reopen: "Show announcements again",
};

describe("RollingBanner", () => {
  const items = [
    { id: "a", title: "Contest", body: "Write a story", href: "/contest" },
    { id: "b", title: "Maintenance" },
  ];

  function Banner({ reopenable = true }: { reopenable?: boolean }) {
    const [closed, setClosed] = useState(false);
    return (
      <RollingBanner
        items={items}
        labels={bannerLabels}
        closed={closed}
        reopenable={reopenable}
        onClose={() => setClosed(true)}
        onReopen={() => setClosed(false)}
        renderLink={(item, children, className) => (
          <a href={item.href ?? ""} className={className}>
            {children}
          </a>
        )}
      />
    );
  }

  it("shows the first message as a link, without any roll on first render", () => {
    render(<Banner />);
    const region = screen.getByRole("region", { name: "Announcements" });
    expect(region.getAttribute("aria-roledescription")).toBe("rotating banner");
    const link = within(region).getByRole("link");
    expect(link.getAttribute("href")).toBe("/contest");
    expect(link.textContent).toContain("Contest");
    expect(region.querySelector(".animate-banner-roll-in")).toBeNull();
  });

  it("moves on with the arrow, rolling the next message in and hiding the others from assistive tech", () => {
    render(<Banner />);
    fireEvent.click(screen.getByRole("button", { name: "Next announcement" }));
    const region = screen.getByRole("region", { name: "Announcements" });
    const shown = [...region.querySelectorAll("[aria-hidden='false']")];
    expect(shown).toHaveLength(1);
    expect(shown[0]?.textContent).toContain("Maintenance");
    expect(shown[0]?.className).toContain("animate-banner-roll-in");
  });

  it("runs one time bar, on the message that shows (it moves on when the bar has filled)", () => {
    render(<Banner />);
    const region = screen.getByRole("region", { name: "Announcements" });
    expect(region.querySelectorAll(".animate-banner-timer")).toHaveLength(1);
    expect(
      (region.querySelector(".animate-banner-timer") as HTMLElement).style.getPropertyValue("--banner-interval"),
    ).toBe("3800ms");
  });

  it("pauses its timer while the pointer is over it", () => {
    render(<Banner />);
    const region = screen.getByRole("region", { name: "Announcements" });
    fireEvent.pointerEnter(region);
    expect((region.querySelector(".animate-banner-timer") as HTMLElement).style.animationPlayState).toBe("paused");
  });

  it("folds away on close and comes back from the bell", () => {
    render(<Banner />);
    fireEvent.click(screen.getByRole("button", { name: "Close announcements" }));
    expect(document.querySelector("[data-state='closed']")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show announcements again" }));
    expect(document.querySelector("[data-state='open']")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Show announcements again" })).toBeNull();
  });

  it("renders nothing without messages and has no arrow for a single one", () => {
    const { container, rerender } = render(
      <RollingBanner items={[]} labels={bannerLabels} closed={false} onClose={() => undefined} />,
    );
    expect(container.innerHTML).toBe("");
    rerender(<RollingBanner items={[items[1]!]} labels={bannerLabels} closed={false} onClose={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Next announcement" })).toBeNull();
  });
});

const popupLabels = {
  dialog: "Events",
  dontShowToday: "Don't show today",
  close: "Close",
  reopen: "Show events again",
  seeYouTomorrow: "See you tomorrow",
  position: (index: number, count: number) => `${index} / ${count}`,
  open: "View details",
};

describe("EventPopup", () => {
  const slides = [
    { id: "a", title: "Writing contest", body: "Win a cover", eyebrow: "Until Nov 30", href: "/contest" },
    { id: "b", title: "New ranking" },
  ];

  function Popup({ onHide = () => undefined }: { onHide?: (today: boolean) => void }) {
    const [open, setOpen] = useState(true);
    return (
      <EventPopup
        slides={slides}
        open={open}
        giftVisible
        labels={popupLabels}
        onHide={(today) => {
          onHide(today);
          setOpen(false);
        }}
        onReopen={() => setOpen(true)}
        renderLink={(slide, children, className) => (
          <a href={slide.href ?? ""} className={className}>
            {children}
          </a>
        )}
      />
    );
  }

  it("is a named dialog with the slide position, a link and both buttons", () => {
    render(<Popup />);
    const dialog = screen.getByRole("dialog", { name: "Events" });
    expect(within(dialog).getByText("1 / 2")).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "View details" }).getAttribute("href")).toBe("/contest");
    expect(within(dialog).getByRole("button", { name: "Don't show today" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("follows the arrow keys", () => {
    render(<Popup />);
    const dialog = screen.getByRole("dialog", { name: "Events" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("2 / 2")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("1 / 2")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("2 / 2")).toBeTruthy();
  });

  it("moves on by itself", () => {
    vi.useFakeTimers();
    render(<Popup />);
    act(() => vi.advanceTimersByTime(2800));
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("'Don't show today' tells the host, shows the note and leaves the gift that opens it again", () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    render(<Popup onHide={onHide} />);
    fireEvent.click(screen.getByRole("button", { name: "Don't show today" }));
    act(() => vi.advanceTimersByTime(600));
    expect(onHide).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("See you tomorrow");
    fireEvent.click(screen.getByRole("button", { name: "Show events again" }));
    expect(screen.getByRole("dialog", { name: "Events" })).toBeTruthy();
  });

  it("Escape closes it like Close (not for today)", () => {
    vi.useFakeTimers();
    const onHide = vi.fn();
    render(<Popup onHide={onHide} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    act(() => vi.advanceTimersByTime(600));
    expect(onHide).toHaveBeenCalledWith(false);
  });
});

describe("ExpandingSettings", () => {
  function List({ onTurnAllOff = vi.fn() }: { onTurnAllOff?: () => void }) {
    const [values, setValues] = useState({ a: true, b: false });
    return (
      <ExpandingSettings
        summary={(on) => (on === 0 ? "All off" : `${on} on`)}
        turnAllOff={{
          label: "Turn all off",
          onTurnAllOff: () => {
            onTurnAllOff();
            setValues({ a: false, b: false });
          },
        }}
        items={[
          {
            id: "a",
            icon: <svg />,
            label: "Alpha",
            description: "First",
            checked: values.a,
            onCheckedChange: (on) => setValues((v) => ({ ...v, a: on })),
            details: <p>Alpha details</p>,
          },
          {
            id: "b",
            icon: <svg />,
            label: "Beta",
            description: "Second",
            checked: values.b,
            onCheckedChange: (on) => setValues((v) => ({ ...v, b: on })),
            details: <p>Beta details</p>,
          },
        ]}
      />
    );
  }

  it("shows the details of a row that is on, open without animation, and counts the rows on", () => {
    render(<List />);
    const alpha = screen.getByRole("switch", { name: "Alpha" });
    expect(alpha.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("switch", { name: "Beta" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("1 on")).toBeTruthy();
    expect(document.querySelector(".animate-details-rise")).toBeNull();
  });

  it("unfolds the details (with the rise) when the reader switches a row on", () => {
    render(<List />);
    fireEvent.click(screen.getByRole("switch", { name: "Beta" }));
    expect(screen.getByRole("switch", { name: "Beta" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("2 on")).toBeTruthy();
    expect(document.querySelector(".animate-details-rise")?.textContent).toBe("Beta details");
  });

  it("turns everything off one by one, then tells the host once", () => {
    vi.useFakeTimers();
    const onTurnAllOff = vi.fn();
    render(<List onTurnAllOff={onTurnAllOff} />);
    fireEvent.click(screen.getByRole("switch", { name: "Beta" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn all off" }));
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("switch", { name: "Alpha" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch", { name: "Beta" }).getAttribute("aria-checked")).toBe("true");
    expect(onTurnAllOff).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(120));
    expect(onTurnAllOff).toHaveBeenCalledTimes(1);
    expect(screen.getByText("All off")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Turn all off" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("RoleMatrix", () => {
  it("is a table with a header per role, a row header per right and a spoken answer in each cell", () => {
    render(
      <RoleMatrix
        caption="Rights"
        labels={{ right: "Right", allowed: "Allowed", notAllowed: "Not allowed" }}
        columns={[
          { key: "owner", label: "Owner" },
          { key: "editor", label: "Editor" },
        ]}
        rows={[
          { key: "publish", label: "Publish", allowed: { owner: true, editor: true } },
          { key: "team", label: "Manage team", allowed: { owner: true } },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Rights" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Right", "Owner", "Editor"]);
    const team = within(table).getByRole("row", { name: /Manage team/ });
    expect(
      within(team)
        .getAllByRole("cell")
        .map((td) => td.textContent),
    ).toEqual(["Allowed", "Not allowed"]);
    expect(within(table).queryByRole("button")).toBeNull();
  });
});
