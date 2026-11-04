import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { listMyStories } from "./api/studio.api.ts";
import { mergeStudioStories, toStudioStory, type StudioStory, type StudioStoryRow } from "./model/studio-story.ts";
import { StudioScreen } from "./index.ts";
import { studioText } from "./strings.ts";

afterEach(cleanup);

const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, overrides: Partial<StudioStoryRow> = {}): StudioStoryRow => ({
  id: uuid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  status: "ongoing",
  visibility: "public",
  is_mature: false,
  cover_storage_key: null,
  updated_at: `2026-11-04T00:00:0${n}.123456+00:00`,
  chapters: [{ count: n }],
  ...overrides,
});

type Call = [string, unknown[]];
function table(respond: () => { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "returns"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => resolve(respond());
  return { calls, builder };
}
const args = (calls: Call[], method: string) => calls.filter(([m]) => m === method).map(([, a]) => a);

function fakeClient(owned: () => { data: unknown; error: unknown }, shared: () => { data: unknown; error: unknown }) {
  const stories = table(owned);
  const collaborators = table(shared);
  const from = vi.fn((name: string) => (name === "stories" ? stories.builder : collaborators.builder));
  return { from, stories: stories.calls, collaborators: collaborators.calls };
}

describe("listMyStories", () => {
  it("asks only for the user's own and invited stories, skipping deleted ones, in two queries", async () => {
    const t = fakeClient(
      () => ({ data: [], error: null }),
      () => ({ data: [], error: null }),
    );
    await listMyStories(withAuth(t, null), TEST_USER_ID);
    expect(args(t.stories, "eq")).toContainEqual(["owner_id", TEST_USER_ID]);
    expect(args(t.stories, "is")).toContainEqual(["deleted_at", null]);
    expect(args(t.collaborators, "eq")).toContainEqual(["user_id", TEST_USER_ID]);
    expect(args(t.collaborators, "is")).toContainEqual(["story.deleted_at", null]);
    expect(String(args(t.stories, "select")[0]?.[0])).toContain("chapters(count)");
    expect(String(args(t.collaborators, "select")[0]?.[0])).toContain("story_collaborators_story_id_fkey");
    expect(t.from).toHaveBeenCalledTimes(2);
  });

  it("merges owned and shared stories newest first, with the right role", async () => {
    const t = fakeClient(
      () => ({ data: [row(1), row(3)], error: null }),
      () => ({
        data: [
          { collaborator_role: "editor", story: row(2) },
          { collaborator_role: "co_author", story: row(4) },
        ],
        error: null,
      }),
    );
    const stories = await listMyStories(withAuth(t, null), TEST_USER_ID);
    expect(stories.map((s) => [s.id, s.role])).toEqual([
      [uuid(4), "co_author"],
      [uuid(3), "owner"],
      [uuid(2), "editor"],
      [uuid(1), "owner"],
    ]);
  });

  it("ignores a collaborator row with an unknown role instead of showing it with a made-up one", async () => {
    const t = fakeClient(
      () => ({ data: [], error: null }),
      () => ({ data: [{ collaborator_role: "admin", story: row(1) }], error: null }),
    );
    expect(await listMyStories(withAuth(t, null), TEST_USER_ID)).toEqual([]);
  });

  it("surfaces a database error instead of an empty list", async () => {
    const t = fakeClient(
      () => ({ data: null, error: { message: "x", code: "XX000" } }),
      () => ({ data: [], error: null }),
    );
    await expect(listMyStories(withAuth(t, null), TEST_USER_ID)).rejects.toBeDefined();
  });
});

describe("model", () => {
  it("keeps a story once and lets the owner role win; ties on time are ordered by id", () => {
    const owned = [toStudioStory(row(1), "owner")];
    const shared: StudioStory[] = [
      toStudioStory(row(1), "editor"),
      toStudioStory(row(2, { updated_at: row(1).updated_at }), "editor"),
    ];
    const merged = mergeStudioStories(owned, shared);
    expect(merged).toHaveLength(2);
    expect(merged.find((s) => s.id === uuid(1))?.role).toBe("owner");
    expect(merged.map((s) => s.id)).toEqual([uuid(2), uuid(1)]);
  });

  it("counts chapters from the embed and shows an unknown visibility as private", () => {
    expect(toStudioStory(row(1, { chapters: [{ count: 7 }] }), "owner").chapterCount).toBe(7);
    expect(toStudioStory(row(1, { chapters: null }), "owner").chapterCount).toBe(0);
    expect(toStudioStory(row(1, { chapters: [] }), "owner").chapterCount).toBe(0);
    expect(toStudioStory(row(1, { visibility: "weird" }), "owner").visibility).toBe("private");
  });
});

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/studio" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderStudio(client: DataClient) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>
              <StudioScreen />
            </ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("StudioScreen", () => {
  it("lists stories with status, visibility, role and a link to the story page", async () => {
    const t = fakeClient(
      () => ({ data: [row(1, { visibility: "private", status: "draft", is_mature: true })], error: null }),
      () => ({ data: [{ collaborator_role: "editor", story: row(2) }], error: null }),
    );
    renderStudio(withAuth(t, testSession()));

    const list = await screen.findByRole("list", { name: studioText.listLabel });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // newest first: story 2 (shared, editor) then story 1 (owned, private draft, mature)
    expect(within(items[0]!).getByText("Truyện 2")).toBeTruthy();
    expect(within(items[0]!).getByText(studioText.role.editor)).toBeTruthy();
    expect(within(items[0]!).getByText(studioText.visibility.public)).toBeTruthy();
    expect(within(items[1]!).getByText(studioText.visibility.private)).toBeTruthy();
    expect(within(items[1]!).queryByText(studioText.role.owner)).toBeNull(); // the owner needs no badge
    expect(within(items[1]!).getByText("18+")).toBeTruthy();
    expect(items[1]!.textContent).toContain(studioText.chapterCount(1));
    const link = within(items[1]!).getByRole("link", { name: studioText.view });
    expect(link.getAttribute("href")).toBe(`/story/${uuid(1)}/truyen-1`);
    // the audience figures are for the owner and co-authors: the owned story links to them, the one shared as editor does not
    expect(within(items[1]!).getByRole("link", { name: studioText.statsLink }).getAttribute("href")).toBe(
      `/studio/story/${uuid(1)}/stats`,
    );
    expect(within(items[0]!).queryByRole("link", { name: studioText.statsLink })).toBeNull();
  });

  it("shows an empty state when the author has no stories", async () => {
    const t = fakeClient(
      () => ({ data: [], error: null }),
      () => ({ data: [], error: null }),
    );
    renderStudio(withAuth(t, testSession()));
    expect(await screen.findByText(studioText.empty.title)).toBeTruthy();
  });

  it("shows a retryable error state when loading fails", async () => {
    const t = fakeClient(
      () => ({ data: null, error: { message: "x", code: "XX000" } }),
      () => ({ data: [], error: null }),
    );
    renderStudio(withAuth(t, testSession()));
    expect(await screen.findByText(studioText.error.title)).toBeTruthy();
    expect(screen.getByRole("button", { name: studioText.error.retry })).toBeTruthy();
  });

  it("does not query anything for a guest (the page is protected, but the screen must not leak a request)", async () => {
    const t = fakeClient(
      () => ({ data: [], error: null }),
      () => ({ data: [], error: null }),
    );
    renderStudio(withAuth(t, null));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(t.from).not.toHaveBeenCalled();
  });
});

describe("server/client boundary", () => {
  it('queries.ts must not be a "use client" module, the hook must be', () => {
    expect(readFileSync("src/studio/queries.ts", "utf8")).not.toMatch(/^\s*["']use client["']/m);
    expect(readFileSync("src/studio/hooks/use-my-stories.ts", "utf8")).toMatch(/^"use client"/);
  });
});
