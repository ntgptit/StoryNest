// @vitest-environment jsdom
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/story/1/x" }));
vi.mock("next/link", () => ({
  default: ({ href, replace, children, ...rest }: { href: string; replace?: boolean; children?: unknown }) => (
    <a href={href} data-replace={String(Boolean(replace))} {...rest}>
      {children as never}
    </a>
  ),
}));

import { nextPlatformAdapter, nextPlatformAdapterFor } from "./next-adapter.tsx";

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

  it("reports the page origin for auth redirect links", () => {
    expect(nextPlatformAdapter.appOrigin()).toBe(window.location.origin);
  });

  it("builds shared links on the canonical site origin it is given, keeping the page origin for auth", () => {
    const adapter = nextPlatformAdapterFor("https://storynest.example");
    expect(adapter.shareOrigin?.()).toBe("https://storynest.example");
    expect(adapter.appOrigin()).toBe(window.location.origin);
    expect(adapter.Link).toBe(nextPlatformAdapter.Link);
  });

  it("opens external links without giving the page access to this window", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    nextPlatformAdapter.openExternal("https://example.com");
    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });
});
