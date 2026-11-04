import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCount } from "@storynest/utils";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { getChapterVote, setChapterVote } from "./api/vote.api.ts";
import { VoteButton } from "./components/vote-button.tsx";
import { settledVote, voteErrorMessage, withVote } from "./model/vote.ts";
import { readerText } from "./strings.ts";

afterEach(cleanup);

const t = readerText.vote;
const CHAPTER_ID = "c0000000-0000-4000-8000-00000000a001";

describe("vote model", () => {
  it("shows the effect of a vote at once, never below zero, and leaves an unchanged state alone", () => {
    expect(withVote({ voted: false, votes: 4 }, true)).toEqual({ voted: true, votes: 5 });
    expect(withVote({ voted: true, votes: 5 }, false)).toEqual({ voted: false, votes: 4 });
    expect(withVote({ voted: true, votes: 0 }, false)).toEqual({ voted: false, votes: 0 });
    const same = { voted: true, votes: 3 };
    expect(withVote(same, true)).toBe(same);
    expect(same).toEqual({ voted: true, votes: 3 });
  });

  it("takes the server's count over the guess", () => {
    expect(settledVote(true, 9)).toEqual({ voted: true, votes: 9 });
    expect(settledVote(false, -1)).toEqual({ voted: false, votes: 0 });
  });

  it("explains a failure by kind", () => {
    expect(voteErrorMessage(new AppError("forbidden", "x"))).toBe(t.errors.forbidden);
    expect(voteErrorMessage(new AppError("network", "x"))).toBe(t.errors.network);
    expect(voteErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

interface FakeOptions {
  votes?: number | null;
  voted?: boolean;
  rpc?: (args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

function fakeClient(options: FakeOptions = {}) {
  const tables: string[] = [];
  const rpcCalls: Record<string, unknown>[] = [];
  const from = vi.fn((table: string) => {
    tables.push(table);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) builder[method] = () => builder;
    builder.maybeSingle = () =>
      Promise.resolve(
        table === "chapter_stats"
          ? { data: options.votes === null ? null : { votes: options.votes ?? 0 }, error: null }
          : { data: options.voted ? { chapter_id: CHAPTER_ID } : null, error: null },
      );
    return builder;
  });
  const rpc = vi.fn((_name: string, args: Record<string, unknown>) => {
    rpcCalls.push(args);
    return options.rpc ? options.rpc(args) : Promise.resolve({ data: 1, error: null });
  });
  return { from, rpc, tables, rpcCalls };
}

describe("vote api", () => {
  it("reads the count for a guest without asking about their vote", async () => {
    const c = fakeClient({ votes: 7 });
    expect(await getChapterVote(c as unknown as DataClient, CHAPTER_ID, null)).toEqual({ voted: false, votes: 7 });
    expect(c.tables).toEqual(["chapter_stats"]);
  });

  it("reads my vote too when signed in, and treats a missing counter row as zero", async () => {
    expect(
      await getChapterVote(fakeClient({ votes: 2, voted: true }) as unknown as DataClient, CHAPTER_ID, TEST_USER_ID),
    ).toEqual({
      voted: true,
      votes: 2,
    });
    expect(
      await getChapterVote(fakeClient({ votes: null }) as unknown as DataClient, CHAPTER_ID, TEST_USER_ID),
    ).toEqual({
      voted: false,
      votes: 0,
    });
  });

  it("sets the vote through the RPC and returns the count; an error is thrown with its kind", async () => {
    const c = fakeClient({ rpc: async () => ({ data: 12, error: null }) });
    expect(await setChapterVote(c as unknown as DataClient, CHAPTER_ID, true)).toBe(12);
    expect(c.rpcCalls).toEqual([{ p_chapter_id: CHAPTER_ID, p_voted: true }]);
    const refused = fakeClient({ rpc: async () => ({ data: null, error: { code: "42501", message: "denied" } }) });
    await expect(setChapterVote(refused as unknown as DataClient, CHAPTER_ID, true)).rejects.toMatchObject({
      kind: "forbidden",
    });
  });
});

const push = vi.fn();
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    pathname: "/story/s1/truyen/chuong-2",
  }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderButton(c: ReturnType<typeof fakeClient>, signedIn: boolean) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>
              <VoteButton chapterId={CHAPTER_ID} />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  toasts.show.mockClear();
});

describe("VoteButton", () => {
  it("shows the count to a guest and sends them to sign in, coming back here, instead of voting", async () => {
    const c = fakeClient({ votes: 1234 });
    renderButton(c, false);
    const button = await screen.findByRole("button", { name: t.guest });
    expect(screen.getByText(t.count(formatCount(1234, "vi")))).toBeTruthy();
    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/story/s1/truyen/chuong-2")}`);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it("votes: the count goes up at once, the button locks, and the server's count replaces the guess", async () => {
    let answer: (value: { data: unknown; error: unknown }) => void = () => undefined;
    const c = fakeClient({ votes: 4, rpc: () => new Promise((resolve) => (answer = resolve)) });
    renderButton(c, true);
    fireEvent.click(await screen.findByRole("button", { name: t.add }));
    // guess shown immediately, before the server answered
    expect(await screen.findByText(t.count("5"))).toBeTruthy();
    const pressed = screen.getByRole("button", { name: t.remove });
    expect(pressed.getAttribute("aria-pressed")).toBe("true");
    expect((pressed as HTMLButtonElement).disabled).toBe(true);
    // a second click while the first is running does nothing
    fireEvent.click(pressed);
    expect(c.rpcCalls).toEqual([{ p_chapter_id: CHAPTER_ID, p_voted: true }]);
    answer({ data: 9, error: null }); // someone else voted too
    expect(await screen.findByText(t.count("9"))).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByRole("button", { name: t.remove }) as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it("unvotes when already voted", async () => {
    const c = fakeClient({ votes: 3, voted: true, rpc: async () => ({ data: 2, error: null }) });
    renderButton(c, true);
    fireEvent.click(await screen.findByRole("button", { name: t.remove }));
    expect(await screen.findByText(t.count("2"))).toBeTruthy();
    expect(c.rpcCalls).toEqual([{ p_chapter_id: CHAPTER_ID, p_voted: false }]);
    expect(screen.getByRole("button", { name: t.add }).getAttribute("aria-pressed")).toBe("false");
  });

  it("puts the old state back and says why when the server refuses", async () => {
    const c = fakeClient({ votes: 4, rpc: async () => ({ data: null, error: { code: "42501", message: "denied" } }) });
    renderButton(c, true);
    fireEvent.click(await screen.findByRole("button", { name: t.add }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.forbidden));
    expect(await screen.findByText(t.count("4"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t.add }).getAttribute("aria-pressed")).toBe("false");
  });

  it("does not show anything until the count is known", () => {
    const c = fakeClient({ votes: 1 });
    renderButton(c, true);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
