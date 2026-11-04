import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import type { StoryListRow } from "../discovery/index.ts";
import { listRecommendedForMe, listSimilarStories } from "./api/recommendations.api.ts";
import { ForYouStories, REASON, SimilarStories, reasonText, recommendationKeys, recommendationText } from "./index.ts";
import { FOR_ME_LIMIT, SIMILAR_LIMIT, toRecommendations } from "./model/recommendation.ts";

afterEach(cleanup);

const t = recommendationText;
const uuid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const storyRow = (n: number): StoryListRow => ({
  id: uuid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: "",
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T00:00:00.123456+00:00",
  owner: { username: "demo_an", display_name: "An Nhiên" },
  category: null,
  stats: null,
  story_tags: [],
});
const row = (n: number, reason: string, detail: string | null = null, score: number | string = 3) => ({
  story_id: uuid(n),
  reason,
  detail,
  score,
});

type Result = { data: unknown; error: unknown };

function fakeClient(options: { similar?: Result; forMe?: Result; stories?: StoryListRow[] }) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const inQueries: string[][] = [];
  const rpc = (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    const promise = Promise.resolve(
      (name === "similar_stories" ? options.similar : options.forMe) ?? { data: [], error: null },
    );
    return Object.assign(promise, { returns: () => promise });
  };
  const from = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.in = (_c: string, ids: string[]) => {
      inQueries.push(ids);
      return b;
    };
    b.returns = () => Promise.resolve({ data: options.stories ?? [], error: null });
    return b;
  };
  return { client: { rpc, from } as unknown as DataClient, rpcCalls, inQueries };
}

describe("reasonText", () => {
  it("says why for every reason the database gives", () => {
    expect(reasonText({ reason: REASON.SHARED_TAGS, detail: "Thẻ A, Thẻ B" })).toBe(
      t.reasons.sharedTags("Thẻ A, Thẻ B"),
    );
    expect(reasonText({ reason: REASON.SAME_CATEGORY, detail: "Lãng mạn" })).toBe(t.reasons.sameCategory("Lãng mạn"));
    expect(reasonText({ reason: REASON.CO_READERS, detail: null })).toBe(t.reasons.coReaders);
    expect(reasonText({ reason: REASON.FOLLOWED_AUTHOR, detail: "An Nhiên" })).toBe(
      t.reasons.followedAuthor("An Nhiên"),
    );
    expect(reasonText({ reason: REASON.LIBRARY_SIMILAR, detail: "Rừng sương mù" })).toBe(
      t.reasons.librarySimilar("Rừng sương mù"),
    );
  });

  it("gives no sentence rather than a wrong one: a reason without its detail, or one this version does not know", () => {
    for (const reason of [REASON.SHARED_TAGS, REASON.SAME_CATEGORY, REASON.FOLLOWED_AUTHOR, REASON.LIBRARY_SIMILAR]) {
      expect(reasonText({ reason, detail: null })).toBeNull();
      expect(reasonText({ reason, detail: "" })).toBeNull();
    }
    expect(reasonText({ reason: "from_the_future", detail: "x" })).toBeNull();
  });

  it("uses the codes the database uses", () => {
    expect(REASON).toEqual({
      SHARED_TAGS: "shared_tags",
      SAME_CATEGORY: "same_category",
      CO_READERS: "co_readers",
      FOLLOWED_AUTHOR: "followed_author",
      LIBRARY_SIMILAR: "library_similar",
    });
  });
});

describe("toRecommendations", () => {
  it("keeps the database's order, converts the score and drops a story that vanished", () => {
    const stories = new Map([
      [uuid(2), { id: uuid(2) } as never],
      [uuid(1), { id: uuid(1) } as never],
    ]);
    const result = toRecommendations(
      [row(1, "shared_tags", "x", "7"), row(9, "co_readers"), row(2, "co_readers", null, 4)],
      stories,
    );
    expect(result.map((r) => [r.story.id, r.reason, r.score])).toEqual([
      [uuid(1), "shared_tags", 7],
      [uuid(2), "co_readers", 4],
    ]);
  });
});

describe("recommendation api", () => {
  it("shows a short list: six similar stories on a story page, eight personal ones on the home page", () => {
    expect(SIMILAR_LIMIT).toBe(6);
    expect(FOR_ME_LIMIT).toBe(8);
  });

  it("asks for similar stories of this one and fetches the cards in the database's order", async () => {
    const f = fakeClient({
      similar: { data: [row(3, "shared_tags", "A"), row(1, "same_category", "B")], error: null },
      stories: [storyRow(1), storyRow(3)],
    });
    const items = await listSimilarStories(f.client, uuid(7));
    expect(f.rpcCalls).toEqual([
      { name: "similar_stories", args: { p_story_id: uuid(7), p_include_mature: false, p_limit: SIMILAR_LIMIT } },
    ]);
    expect(items.map((i) => i.story.id)).toEqual([uuid(3), uuid(1)]);
    expect(f.inQueries).toEqual([[uuid(3), uuid(1)]]);
  });

  it("asks for personal recommendations, with the limit and the mature switch it was given", async () => {
    const f = fakeClient({ forMe: { data: [row(1, "followed_author", "An")], error: null }, stories: [storyRow(1)] });
    expect(await listRecommendedForMe(f.client)).toHaveLength(1);
    await listRecommendedForMe(f.client, { limit: 3, includeMature: true });
    expect(f.rpcCalls.map((c) => c.args)).toEqual([
      { p_include_mature: false, p_limit: FOR_ME_LIMIT },
      { p_include_mature: true, p_limit: 3 },
    ]);
  });

  it("makes no second request when there is nothing to suggest", async () => {
    const f = fakeClient({});
    expect(await listSimilarStories(f.client, uuid(1))).toEqual([]);
    expect(await listRecommendedForMe(f.client)).toEqual([]);
    expect(f.inQueries).toEqual([]);
  });

  it("throws what the database refuses with", async () => {
    const f = fakeClient({ forMe: { data: null, error: { code: "42501", message: "not allowed" } } });
    await expect(listRecommendedForMe(f.client)).rejects.toMatchObject({ message: "not allowed" });
  });

  it("has query keys that tell stories and readers apart", () => {
    expect(recommendationKeys.similar("a")).not.toEqual(recommendationKeys.similar("b"));
    expect(recommendationKeys.forMe("u1")).not.toEqual(recommendationKeys.forMe("u2"));
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
  useNavigation: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    refresh: () => undefined,
    pathname: "/",
  }),
  appOrigin: () => "https://app.test",
  openExternal: () => undefined,
};

function renderUi(client: DataClient, ui: ReactNode, signedIn = false) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession(TEST_USER_ID) : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>{ui}</PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("SimilarStories", () => {
  it("shows the suggested stories as cards, each with the sentence that says why", async () => {
    const f = fakeClient({
      similar: {
        data: [row(1, "shared_tags", "Phiêu lưu"), row(2, "co_readers"), row(3, "mystery_reason", "?")],
        error: null,
      },
      stories: [storyRow(1), storyRow(2), storyRow(3)],
    });
    renderUi(f.client, <SimilarStories storyId={uuid(7)} />);
    const section = within(await screen.findByRole("region", { name: t.similarTitle }));
    expect(section.getByRole("heading", { name: t.similarTitle })).toBeTruthy();
    expect((await section.findByText("Truyện 1")).closest("a")?.getAttribute("href")).toBe(
      `/story/${uuid(1)}/truyen-1`,
    );
    expect(section.getByText(t.reasons.sharedTags("Phiêu lưu"))).toBeTruthy();
    expect(section.getByText(t.reasons.coReaders)).toBeTruthy();
    // a reason this version does not know: the story is shown without a sentence
    expect(section.getByText("Truyện 3")).toBeTruthy();
    expect(section.queryByText("?")).toBeNull();
  });

  it("shows nothing when there is nothing to suggest, and nothing when the request fails", async () => {
    const empty = fakeClient({});
    renderUi(empty.client, <SimilarStories storyId={uuid(7)} />);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole("region", { name: t.similarTitle })).toBeNull();
    expect(empty.rpcCalls).toHaveLength(1);
    cleanup();

    const broken = fakeClient({ similar: { data: null, error: { code: "500", message: "boom" } } });
    renderUi(broken.client, <SimilarStories storyId={uuid(7)} />);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole("region", { name: t.similarTitle })).toBeNull();
  });
});

describe("ForYouStories", () => {
  it("shows a signed-in reader their suggestions with the reasons", async () => {
    const f = fakeClient({
      forMe: {
        data: [row(1, "followed_author", "An Nhiên", 5), row(2, "library_similar", "Rừng sương mù")],
        error: null,
      },
      stories: [storyRow(1), storyRow(2)],
    });
    renderUi(f.client, <ForYouStories />, true);
    const section = within(await screen.findByRole("region", { name: t.forMeTitle }));
    expect(await section.findByText("Truyện 1")).toBeTruthy();
    expect(section.getByText(t.reasons.followedAuthor("An Nhiên"))).toBeTruthy();
    expect(section.getByText(t.reasons.librarySimilar("Rừng sương mù"))).toBeTruthy();
  });

  it("does not ask for anything on behalf of a guest", async () => {
    const f = fakeClient({ forMe: { data: [row(1, "followed_author", "x")], error: null }, stories: [storyRow(1)] });
    renderUi(f.client, <ForYouStories />, false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(f.rpcCalls).toEqual([]);
    expect(screen.queryByRole("region", { name: t.forMeTitle })).toBeNull();
  });
});
