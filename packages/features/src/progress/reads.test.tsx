import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { recordChapterRead } from "./api/progress.api.ts";
import { useReadRecorder } from "./hooks/use-read-recorder.ts";
import { getAnonymousReaderId } from "./model/anonymous-reader.ts";
import { READ_DWELL_MS } from "./model/progress.ts";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("getAnonymousReaderId", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  it("creates a uuid once and returns the same one afterwards", () => {
    const first = getAnonymousReaderId();
    expect(first).toMatch(UUID);
    expect(getAnonymousReaderId()).toBe(first);
  });

  it("replaces a stored value that is not a uuid", () => {
    window.localStorage.setItem("storynest.anonymousReaderId", "not-a-uuid");
    expect(getAnonymousReaderId()).toMatch(UUID);
  });

  it("still returns a stable id for the page when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const id = getAnonymousReaderId();
    expect(id).toMatch(UUID);
    expect(getAnonymousReaderId()).toBe(id);
  });
});

describe("recordChapterRead", () => {
  it("sends the anonymous id only when given, and reports whether the read counted", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const client = { rpc } as unknown as DataClient;
    expect(await recordChapterRead(client, "c1", "anon-1")).toBe(true);
    expect(await recordChapterRead(client, "c1", null)).toBe(true);
    expect(rpc).toHaveBeenNthCalledWith(1, "record_chapter_read", { p_chapter_id: "c1", p_anon_id: "anon-1" });
    expect(rpc).toHaveBeenNthCalledWith(2, "record_chapter_read", { p_chapter_id: "c1" });
    const duplicate = { rpc: async () => ({ data: false, error: null }) } as unknown as DataClient;
    expect(await recordChapterRead(duplicate, "c1", "a")).toBe(false);
  });
});

function Probe({ chapterId }: { chapterId: string }) {
  useReadRecorder(chapterId);
  return null;
}

function setup(session: ReturnType<typeof testSession> | null) {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const client = withAuth({ rpc }, session);
  const view = (chapterId: string) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>
          <Probe chapterId={chapterId} />
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>
  );
  return { rpc, view };
}

/** Lets the auth session resolve; the dwell clock only starts once the reader (guest or member) is known. */
async function settle() {
  await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useReadRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });

  it("counts a guest after the dwell time, with the anonymous id, and only once", async () => {
    const { rpc, view } = setup(null);
    const { rerender } = render(view("c-guest"));
    await settle();
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS - 1)));
    expect(rpc).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("record_chapter_read", {
      p_chapter_id: "c-guest",
      p_anon_id: getAnonymousReaderId(),
    });
    rerender(view("c-guest"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS * 3)));
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("counts a signed-in reader by account: no anonymous id is sent", async () => {
    const { rpc, view } = setup(testSession());
    render(view("c-member"));
    await settle();
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS)));
    expect(rpc).toHaveBeenCalledWith("record_chapter_read", { p_chapter_id: "c-member" });
  });

  it("waits until the session is known, so a member is never counted as a guest first", async () => {
    let resolveSession: (value: { data: { session: ReturnType<typeof testSession> } }) => void = () => undefined;
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const client = {
      rpc,
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        getSession: () => new Promise((resolve) => (resolveSession = resolve as typeof resolveSession)),
      },
    } as unknown as DataClient;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={client}>
          <AuthProvider>
            <Probe chapterId="c-slow-session" />
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS * 2)));
    expect(rpc).not.toHaveBeenCalled(); // still loading: nothing is reported yet
    await act(async () => resolveSession({ data: { session: testSession() } }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS)));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("record_chapter_read", { p_chapter_id: "c-slow-session" });
  });

  it("does not count a reader who leaves before the dwell time", async () => {
    const { rpc, view } = setup(null);
    const { unmount } = render(view("c-bounce"));
    await settle();
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS - 100)));
    unmount();
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS)));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("pauses while the tab is hidden and restarts the clock when it is visible again", async () => {
    const { rpc, view } = setup(null);
    render(view("c-hidden"));
    await settle();
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS - 1000)));
    act(() => setVisibility("hidden"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS * 2)));
    expect(rpc).not.toHaveBeenCalled();
    act(() => setVisibility("visible"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS - 1)));
    expect(rpc).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)));
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("never lets a failed report interrupt reading", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "x", code: "PT404" } }));
    const view = (
      <QueryClientProvider client={new QueryClient()}>
        <DataProvider client={withAuth({ rpc }, null)}>
          <AuthProvider>
            <Probe chapterId="c-fail" />
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>
    );
    render(view);
    await settle();
    await act(async () => void (await vi.advanceTimersByTimeAsync(READ_DWELL_MS)));
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
