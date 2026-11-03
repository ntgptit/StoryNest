import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Home, Library, Eye } from "lucide-react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell.tsx";
import { BottomNav, isNavItemActive, type BottomNavItem, type NavLinkComponent } from "./bottom-nav.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EmptyState } from "./empty-state.tsx";
import { ErrorState } from "./error-state.tsx";
import { InfiniteList } from "./infinite-list.tsx";
import { PageHeader } from "./page-header.tsx";
import { StatPill } from "./stat-pill.tsx";

afterEach(cleanup);

const Anchor: NavLinkComponent = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

describe("BottomNav", () => {
  const items: BottomNavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/library", label: "Library", icon: Library },
  ];

  it("marks the matching item as the current page", () => {
    render(<BottomNav items={items} pathname="/library/lists" LinkComponent={Anchor} label="Main" />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.getByText("Library").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Home").closest("a")?.getAttribute("aria-current")).toBeNull();
  });

  it("matches '/' exactly and nested paths by prefix, not by substring", () => {
    const [home, library] = items as [BottomNavItem, BottomNavItem];
    expect(isNavItemActive(home, "/")).toBe(true);
    expect(isNavItemActive(home, "/library")).toBe(false);
    expect(isNavItemActive(library, "/library")).toBe(true);
    expect(isNavItemActive(library, "/library/x")).toBe(true);
    expect(isNavItemActive(library, "/libraryfoo")).toBe(false);
    expect(isNavItemActive({ ...library, match: (p) => p === "/custom" }, "/custom")).toBe(true);
  });
});

describe("AppShell / PageHeader / EmptyState / ErrorState / StatPill", () => {
  it("AppShell renders header, content and bottom nav", () => {
    render(
      <AppShell header={<span>head</span>} bottomNav={<nav>bottom</nav>}>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByRole("banner").textContent).toContain("head");
    expect(screen.getByRole("main").textContent).toContain("content");
    expect(screen.getByText("bottom")).toBeTruthy();
    expect(screen.getByRole("main").className).toContain("pb-24");
  });

  it("PageHeader shows a back button only when asked", () => {
    const onBack = vi.fn();
    const { rerender } = render(<PageHeader title="Studio" description="Your stories" />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<PageHeader title="Studio" onBack={onBack} backLabel="Go back" actions={<button>New</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("New")).toBeTruthy();
  });

  it("EmptyState shows its action", () => {
    render(<EmptyState title="Nothing yet" description="Start reading" action={<button>Browse</button>} />);
    expect(screen.getByRole("heading", { name: "Nothing yet" })).toBeTruthy();
    expect(screen.getByText("Browse")).toBeTruthy();
  });

  it("ErrorState is an alert and retries", () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Failed" description="Try again" onRetry={onRetry} retryLabel="Retry now" />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByText("Retry now"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("StatPill formats the number and exposes an accessible label", () => {
    render(<StatPill icon={Eye} value={1234} label="Reads" locale="en" />);
    expect(screen.getByText("Reads: 1.2K")).toBeTruthy(); // screen-reader text
    expect(screen.getByTitle("Reads: 1,234")).toBeTruthy();
  });
});

describe("InfiniteList", () => {
  type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
  let callbacks: Callback[];
  let disconnects: number;

  beforeEach(() => {
    callbacks = [];
    disconnects = 0;
    class FakeObserver {
      constructor(cb: Callback) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {
        disconnects += 1;
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  const base = (overrides: Partial<ComponentProps<typeof InfiniteList<{ id: string }>>> = {}) => ({
    items: [{ id: "a" }, { id: "b" }],
    getKey: (i: { id: string }) => i.id,
    renderItem: (i: { id: string }) => <span>{i.id}</span>,
    hasMore: true,
    isLoadingMore: false,
    onLoadMore: vi.fn(),
    ...overrides,
  });

  const lastObserver = () => callbacks[callbacks.length - 1] as Callback;

  it("loads the next page when the sentinel becomes visible", () => {
    const props = base();
    render(<InfiniteList {...props} />);
    act(() => lastObserver()([{ isIntersecting: true }]));
    expect(props.onLoadMore).toHaveBeenCalledTimes(1);
    act(() => lastObserver()([{ isIntersecting: false }]));
    expect(props.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("never loads while a page is loading or when there is nothing left", () => {
    const loading = base({ isLoadingMore: true, loadingFallback: <span>spinner</span> });
    const { unmount } = render(<InfiniteList {...loading} />);
    act(() => lastObserver()([{ isIntersecting: true }]));
    expect(loading.onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByText("spinner")).toBeTruthy();
    unmount();

    const done = base({ hasMore: false, endMessage: <span>the end</span> });
    render(<InfiniteList {...done} />);
    expect(screen.getByText("the end")).toBeTruthy();
    expect(callbacks.length).toBe(1); // no observer is created when there is no sentinel
  });

  it("offers a keyboard-reachable button and cleans up its observer", () => {
    const props = base({ loadMoreLabel: "Load more" });
    const { unmount } = render(<InfiniteList {...props} />);
    fireEvent.click(screen.getByText("Load more"));
    expect(props.onLoadMore).toHaveBeenCalledTimes(1);
    unmount();
    expect(disconnects).toBeGreaterThan(0);
  });

  it("renders every item once with stable keys", () => {
    render(<InfiniteList {...base()} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["a", "b"]);
  });
});

describe("ConfirmDialog", () => {
  const open = (onConfirm: () => void | Promise<void>, onOpenChange = vi.fn()) =>
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete chapter?"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={onConfirm}
      />,
    );

  it("confirms, then closes", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    open(onConfirm, onOpenChange);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Delete chapter?")).toBeTruthy();
    fireEvent.click(within(dialog).getByText("Delete"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("stays open when the action fails and can be retried", async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce(undefined);
    const onOpenChange = vi.fn();
    open(onConfirm, onOpenChange);
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onOpenChange).not.toHaveBeenCalled();
    await waitFor(() => expect((screen.getByText("Delete") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("disables both buttons while the action runs", async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    open(onConfirm);
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect((screen.getByText("Cancel") as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByText("Delete") as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish());
  });
});
