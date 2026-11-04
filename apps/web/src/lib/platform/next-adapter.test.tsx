// @vitest-environment jsdom
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/story/1/x" }));
type LinkMockProps = {
  href: string;
  replace?: boolean;
  prefetch?: boolean;
  scroll?: boolean;
  onNavigate?: (event: { preventDefault(): void }) => void;
  children?: unknown;
};
// Keeps the last onNavigate so a test can play the in-app click that next/link would report.
const linkMock = vi.hoisted(() => ({ onNavigate: undefined as LinkMockProps["onNavigate"] }));
vi.mock("next/link", () => ({
  default: ({ href, replace, prefetch, scroll, onNavigate, children, ...rest }: LinkMockProps) => {
    linkMock.onNavigate = onNavigate;
    return (
      <a
        href={href}
        data-replace={String(Boolean(replace))}
        data-prefetch={String(prefetch)}
        data-scroll={String(scroll)}
        {...rest}
      >
        {children as never}
      </a>
    );
  },
}));

import { nextPlatformAdapter } from "./next-adapter.tsx";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("nextPlatformAdapter", () => {
  it("describes the web platform", () => {
    expect(nextPlatformAdapter.platform).toBe("web");
    expect(nextPlatformAdapter.isNative).toBe(false);
  });

  it("navigates through the Next router and exposes the pathname", () => {
    const { result } = renderHook(() => nextPlatformAdapter.useNavigation());
    result.current.push("/library");
    result.current.replace("/login");
    result.current.back();
    result.current.refresh();
    expect(router.push).toHaveBeenCalledWith("/library");
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(result.current.pathname).toBe("/story/1/x");
  });

  it("renders Link with replace support", () => {
    const { Link } = nextPlatformAdapter;
    const { getByText } = render(
      <Link href="/a" replace className="c">
        go
      </Link>,
    );
    const anchor = getByText("go") as HTMLAnchorElement;
    expect(anchor.getAttribute("href")).toBe("/a");
    expect(anchor.getAttribute("data-replace")).toBe("true");
    expect(anchor.className).toBe("c");
  });

  it("renders a normal Link without intercepting the navigation", () => {
    const { Link } = nextPlatformAdapter;
    const { getByText } = render(<Link href="/a">go</Link>);
    expect(getByText("go").getAttribute("data-prefetch")).toBe("undefined");
    expect(linkMock.onNavigate).toBeUndefined();
  });

  it("turns a shallow Link into a history entry: no server render, no prefetch, no scroll to the top", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const { Link } = nextPlatformAdapter;
    const { getByText, rerender } = render(
      <Link href="/?category=a" shallow>
        go
      </Link>,
    );
    const anchor = getByText("go");
    expect(anchor.getAttribute("href")).toBe("/?category=a"); // Ctrl/Cmd-click still opens the real page
    expect(anchor.getAttribute("data-prefetch")).toBe("false");
    expect(anchor.getAttribute("data-scroll")).toBe("false");

    const event = { preventDefault: vi.fn() };
    linkMock.onNavigate?.(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(null, "", "/?category=a");
    expect(router.push).not.toHaveBeenCalled();

    rerender(
      <Link href="/?tag=b" shallow replace>
        go
      </Link>,
    );
    linkMock.onNavigate?.({ preventDefault: vi.fn() });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/?tag=b");
  });

  it("reports the page origin for auth redirect links", () => {
    expect(nextPlatformAdapter.appOrigin()).toBe(window.location.origin);
  });

  it("opens external links without giving the page access to this window", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    nextPlatformAdapter.openExternal("https://example.com");
    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });
});
