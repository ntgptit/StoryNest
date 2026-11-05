import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import { DataProvider } from "../_shared/data.tsx";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { StoryRatingPanel } from "./components/story-rating.tsx";
import { canRate, formatAverage, ratingErrorMessage, toRating } from "./model/rating.ts";
import { storyText } from "./strings.ts";

afterEach(cleanup);

const STORY = "s0000000-0000-4000-8000-000000000001";
const t = storyText.rating;

describe("rating model", () => {
  it("reads the summary (numeric text from PostgREST) and keeps the reading fields of a set answer", () => {
    const first = toRating({
      rating_avg: "3.50",
      rating_count: 2,
      my_stars: null,
      chapters_read: 1,
      chapters_needed: 1,
    });
    expect(first).toEqual({ average: 3.5, count: 2, mine: null, chaptersRead: 1, chaptersNeeded: 1 });
    const after = toRating({ rating_avg: 4, rating_count: 3, my_stars: 5 }, first);
    expect(after).toMatchObject({ average: 4, count: 3, mine: 5, chaptersRead: 1 });
    expect(toRating({ rating_avg: null, rating_count: 0, my_stars: null }).average).toBeNull();
  });

  it("needs the chapters the server asks for", () => {
    expect(canRate({ average: null, count: 0, mine: null, chaptersRead: 0, chaptersNeeded: 1 })).toBe(false);
    expect(canRate({ average: null, count: 0, mine: null, chaptersRead: 1, chaptersNeeded: 1 })).toBe(true);
    expect(canRate({ average: null, count: 0, mine: null, chaptersRead: 0, chaptersNeeded: 0 })).toBe(true);
  });

  it("formats the average with one decimal and words the refusals", () => {
    expect(formatAverage(3.5, "en")).toBe("3.5");
    expect(formatAverage(4, "vi")).toBe("4,0");
    expect(ratingErrorMessage(new AppError("forbidden", "x", { details: "own_story" }))).toBe(t.ownStory);
    expect(ratingErrorMessage(new AppError("forbidden", "x", { details: "read_first" }))).toBe(t.readFirst);
    expect(ratingErrorMessage(new AppError("network", "x"))).toBe(t.network);
  });
});

const push = vi.fn();
const adapter: PlatformAdapter = {
  isNative: false,
  platform: "web",
  Link: ({ href, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/story/x" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderPanel(rpc: (name: string, args: Record<string, unknown>) => unknown, signedIn = true) {
  const client = { rpc: vi.fn(async (name: string, args: Record<string, unknown>) => rpc(name, args)) };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>
              <StoryRatingPanel storyId={STORY} locale="en" />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
  return client;
}

describe("StoryRatingPanel", () => {
  it("shows the average and rates with the stars", async () => {
    const client = renderPanel((name) =>
      name === "get_story_rating"
        ? {
            data: [{ rating_avg: 4.25, rating_count: 8, my_stars: null, chapters_read: 2, chapters_needed: 1 }],
            error: null,
          }
        : { data: [{ rating_avg: 4.33, rating_count: 9, my_stars: 5 }], error: null },
    );
    expect(await screen.findByText(t.summary("4.3", "8", 8))).toBeTruthy();
    const slider = screen.getByRole("slider", { name: t.yours });
    await waitFor(() => expect(slider.getAttribute("aria-disabled")).toBeNull());
    fireEvent.keyDown(slider, { key: "End" });
    await waitFor(() => expect(client.rpc).toHaveBeenCalledWith("set_story_rating", { p_story_id: STORY, p_stars: 5 }));
    expect(await screen.findByText(t.summary("4.3", "9", 9))).toBeTruthy();
    fireEvent.keyDown(slider, { key: "0" });
    await waitFor(() =>
      expect(client.rpc).toHaveBeenCalledWith("set_story_rating", { p_story_id: STORY, p_stars: null }),
    );
  });

  it("keeps the stars off until a chapter was read, and sends guests to sign in", async () => {
    renderPanel(() => ({
      data: [{ rating_avg: null, rating_count: 0, my_stars: null, chapters_read: 0, chapters_needed: 1 }],
      error: null,
    }));
    expect(await screen.findByText(t.needRead(1))).toBeTruthy();
    expect(screen.getByRole("slider", { name: t.yours }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(t.none)).toBeTruthy();
    cleanup();
    renderPanel(() => ({ data: [], error: null }), false);
    expect((await screen.findByRole("link", { name: t.guest })).getAttribute("href")).toContain("/login");
  });
});
