import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataClient } from "./client.ts";
import { DataProvider, useDataClient, useOptionalDataClient } from "./data.tsx";
import { AppError } from "./errors.ts";
import { ErrorBoundary } from "./error-boundary.tsx";
import { AppLink, PlatformProvider, useNavigation, usePlatform, type PlatformAdapter } from "./platform.tsx";
import { ToastProvider, useAppToast } from "./toast.tsx";

afterEach(cleanup);

// React logs caught render errors to the console; keep the test output readable.
const silenceConsole = () => vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("DataProvider", () => {
  const Probe = () => <span>{useDataClient() ? "client" : "none"}</span>;

  it("provides the client", () => {
    const client = {} as DataClient;
    render(
      <DataProvider client={client}>
        <Probe />
      </DataProvider>,
    );
    expect(screen.getByText("client")).toBeTruthy();
  });

  it("explains a missing configuration on first use, not at startup", () => {
    silenceConsole();
    expect(() =>
      render(
        <DataProvider client={null}>
          <Probe />
        </DataProvider>,
      ),
    ).toThrow(/Supabase is not configured/);
    const Optional = () => <span>{String(useOptionalDataClient())}</span>;
    render(
      <DataProvider client={null}>
        <Optional />
      </DataProvider>,
    );
    expect(screen.getByText("null")).toBeTruthy();
  });

  it("requires a provider", () => {
    silenceConsole();
    expect(() => render(<Probe />)).toThrow(/DataProvider/);
  });
});

describe("PlatformProvider", () => {
  const adapter = (overrides: Partial<PlatformAdapter> = {}): PlatformAdapter => ({
    platform: "web",
    isNative: false,
    Link: ({ href, replace, children, ...rest }) => (
      <a href={href} data-replace={String(Boolean(replace))} {...rest}>
        {children}
      </a>
    ),
    useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/story/1" }),
    appOrigin: () => "https://app.test",
    openExternal: vi.fn(),
    ...overrides,
  });

  it("renders links through the adapter and exposes navigation", () => {
    const Screen = () => {
      const { pathname } = useNavigation();
      const { platform, isNative } = usePlatform();
      return (
        <>
          <AppLink href="/library" replace>
            Library
          </AppLink>
          <span>{`${platform}:${String(isNative)}:${pathname}`}</span>
        </>
      );
    };
    render(
      <PlatformProvider adapter={adapter()}>
        <Screen />
      </PlatformProvider>,
    );
    const link = screen.getByText("Library") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/library");
    expect(link.getAttribute("data-replace")).toBe("true");
    expect(screen.getByText("web:false:/story/1")).toBeTruthy();
  });

  it("requires a provider", () => {
    silenceConsole();
    expect(() => render(<AppLink href="/x">x</AppLink>)).toThrow(/PlatformProvider/);
  });
});

describe("ToastProvider", () => {
  it("forwards to the port and is stable across renders", () => {
    const show = vi.fn();
    const seen: unknown[] = [];
    const Probe = () => {
      const toast = useAppToast();
      seen.push(toast);
      const [, force] = useState(0);
      return (
        <button
          onClick={() => {
            toast.success("saved");
            toast.error("failed");
            toast.info("fyi");
            force((n) => n + 1);
          }}
        >
          go
        </button>
      );
    };
    render(
      <ToastProvider port={{ show }}>
        <Probe />
      </ToastProvider>,
    );
    act(() => screen.getByText("go").click());
    expect(show.mock.calls).toEqual([
      ["success", "saved"],
      ["error", "failed"],
      ["info", "fyi"],
    ]);
    expect(new Set(seen).size).toBe(1);
  });

  it("fails loudly without a provider", () => {
    silenceConsole();
    const Probe = () => (useAppToast(), null);
    expect(() => render(<Probe />)).toThrow(/ToastProvider/);
  });
});

describe("ErrorBoundary", () => {
  function Bomb({ explode }: { explode: boolean }) {
    if (explode) throw { code: "PT404", message: "gone" };
    return <span>fine</span>;
  }

  it("shows the fallback with a normalised AppError and recovers on reset", () => {
    silenceConsole();
    const onError = vi.fn();
    const state = { explode: true }; // read by the child on every render, like real changing data
    const Child = () => <Bomb explode={state.explode} />;
    render(
      <ErrorBoundary
        onError={onError}
        fallback={(error, reset) => (
          <button
            onClick={() => {
              state.explode = false;
              reset();
            }}
          >
            {`${error.kind}:retry`}
          </button>
        )}
      >
        <Child />
      </ErrorBoundary>,
    );
    expect(screen.getByText("notFound:retry")).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(AppError);

    act(() => screen.getByText("notFound:retry").click());
    expect(screen.getByText("fine")).toBeTruthy();
  });

  it("resets itself when resetKeys change", () => {
    silenceConsole();
    const fallback = () => <span>failed</span>;
    const { rerender } = render(
      <ErrorBoundary fallback={fallback} resetKeys={["a"]}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText("failed")).toBeTruthy();
    rerender(
      <ErrorBoundary fallback={fallback} resetKeys={["b"]}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeTruthy();
  });
});
