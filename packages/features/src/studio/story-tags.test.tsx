import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../_shared/errors.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { getStoryForEdit, setStoryTags } from "./api/story-write.api.ts";
import { TagEditor } from "./components/tag-editor.tsx";
import {
  MAX_STORY_TAGS,
  TAG_NAME_MAX_LENGTH,
  addTags,
  cleanTagName,
  isValidTag,
  removeTag,
  sameTags,
  splitTagInput,
  tagSlug,
  tagsErrorMessage,
  type TagChip,
} from "./model/tags.ts";
import { storyMetaDescription } from "../story/index.ts";
import { StoryFormScreen } from "./index.ts";
import { studioText } from "./strings.ts";

// jsdom lacks ResizeObserver, which Radix Select (the category/status/visibility pickers) needs to mount.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const t = studioText.tags;
const chip = (name: string): TagChip => ({ slug: tagSlug(name), name });
const STORY_ID = "5eed0000-0000-4000-8000-00000000d001";

describe("tag model", () => {
  it("mirrors the database limits (set_story_tags): 10 tags per story, names of up to 40 characters", () => {
    expect(MAX_STORY_TAGS).toBe(10);
    expect(TAG_NAME_MAX_LENGTH).toBe(40);
  });

  it("cleans names the way the database does", () => {
    expect(cleanTagName("  Phiêu   lưu \n")).toBe("Phiêu lưu");
  });

  it("gives the same slug to spellings of one tag, and does not cut an overlong one", () => {
    expect(tagSlug("Lãng mạn")).toBe("lang-man");
    expect(tagSlug("  lang   man!! ")).toBe("lang-man");
    expect(tagSlug("Đời thường")).toBe("doi-thuong");
    expect(tagSlug("a".repeat(100))).toHaveLength(100);
  });

  it("splits what was typed or pasted at commas, semicolons and line breaks", () => {
    expect(splitTagInput("a b, c;d\n e ,, ")).toEqual(["a b", "c", "d", "e"]);
    expect(splitTagInput("  ,; ")).toEqual([]);
  });

  it("accepts names of up to 40 characters whose slug has 2 to 40 characters", () => {
    expect(isValidTag("ab")).toBe(true);
    expect(isValidTag("a")).toBe(false);
    expect(isValidTag("a!")).toBe(false);
    expect(isValidTag("!!!")).toBe(false);
    expect(isValidTag("a".repeat(TAG_NAME_MAX_LENGTH))).toBe(true);
    expect(isValidTag("a".repeat(TAG_NAME_MAX_LENGTH + 1))).toBe(false);
    expect(isValidTag(`abc${"!".repeat(TAG_NAME_MAX_LENGTH - 2)}`)).toBe(false); // 41 characters, slug "abc"
  });

  it("adds tags, ignoring a repeat of the same tag in any spelling and keeping the first spelling", () => {
    const first = addTags([], "Lãng mạn");
    expect(first).toEqual({ tags: [chip("Lãng mạn")], problem: null });
    const again = addTags(first.tags, "lang  MAN, Phiêu lưu");
    expect(again.tags.map((tag) => tag.name)).toEqual(["Lãng mạn", "Phiêu lưu"]);
    expect(again.problem).toBeNull();
  });

  it("skips an invalid name, reports it, and still adds the valid ones", () => {
    const result = addTags([], "a, Hợp lệ, !!!");
    expect(result.tags.map((tag) => tag.name)).toEqual(["Hợp lệ"]);
    expect(result.problem).toBe("invalid");
  });

  it("takes no more than the per-story maximum and says so", () => {
    const names = Array.from({ length: MAX_STORY_TAGS + 2 }, (_, i) => `thẻ ${i}`).join(",");
    const result = addTags([], names);
    expect(result.tags).toHaveLength(MAX_STORY_TAGS);
    expect(result.problem).toBe("tooMany");
    const full = addTags(result.tags, "thẻ 0, thẻ 1");
    expect(full.problem).toBeNull(); // repeats are not "too many"
    expect(addTags(result.tags, "mới").problem).toBe("tooMany");
    // a bad name after the limit was hit does not hide that the list is full
    expect(addTags(result.tags, "mới, !!!").problem).toBe("tooMany");
  });

  it("removes by slug and compares lists regardless of order", () => {
    const list = [chip("a b"), chip("c d")];
    expect(removeTag(list, "a-b")).toEqual([chip("c d")]);
    expect(sameTags(list, [chip("c d"), chip("a b")])).toBe(true);
    expect(sameTags(list, [chip("a b")])).toBe(false);
    expect(sameTags(list, [chip("a b"), chip("x y")])).toBe(false);
    expect(sameTags([], [])).toBe(true);
  });

  it("tells a quota refusal from a bad name", () => {
    expect(tagsErrorMessage(new AppError("conflict", "x"))).toBe(t.errors.quota);
    expect(tagsErrorMessage(new AppError("invalid", "x"))).toBe(t.errors.invalid);
    expect(tagsErrorMessage(new AppError("forbidden", "x"))).toBe(t.errors.forbidden);
    expect(tagsErrorMessage(new AppError("network", "x"))).toBe(studioText.errors.network);
    expect(tagsErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

type Result = { data: unknown; error: unknown };

/** stories / story_tags / categories / story_collaborators and the two tag RPCs, with every write recorded. */
function fakeClient(options: {
  storyTags?: { slug: string; display_name: string }[];
  setTags?: (args: Record<string, unknown>) => Result;
  popular?: { tag_id: number; slug: string; display_name: string; stories_count: number }[];
  storyRow?: Record<string, unknown>;
}) {
  const writes: { table: string; op: string; values: unknown }[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const storyRow = {
    id: STORY_ID,
    owner_id: TEST_USER_ID,
    slug: "rung-suong-mu",
    title: "Rừng sương mù",
    synopsis: "",
    category_id: null,
    language_code: "vi",
    status: "ongoing",
    visibility: "public",
    is_mature: false,
    deleted_at: null,
    ...options.storyRow,
  };
  const from = (table: string) => {
    let op = "select";
    let values: unknown;
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "not", "order", "returns"]) b[method] = () => b;
    b.insert = (v: unknown) => {
      op = "insert";
      values = v;
      writes.push({ table, op, values });
      return b;
    };
    b.update = (v: unknown) => {
      op = "update";
      values = v;
      writes.push({ table, op, values });
      return b;
    };
    const answer = (): Result => {
      if (table === "categories") return { data: [], error: null };
      if (table === "story_tags") return { data: (options.storyTags ?? []).map((tag) => ({ tag })), error: null };
      if (table === "story_collaborators") return { data: null, error: null };
      if (op === "update") return { data: [{ id: STORY_ID }], error: null };
      if (op === "insert") return { data: null, error: null };
      return { data: storyRow, error: null };
    };
    b.maybeSingle = () => Promise.resolve(answer());
    b.then = (resolve: (value: unknown) => unknown) => resolve(answer());
    return b;
  };
  const rpc = (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    const result =
      name === "set_story_tags"
        ? (options.setTags?.(args) ?? {
            data: (args.p_names as string[]).map((n, i) => ({ tag_id: i, slug: tagSlug(n), display_name: n })),
            error: null,
          })
        : { data: options.popular ?? [], error: null };
    const promise = Promise.resolve(result);
    return Object.assign(promise, { returns: () => promise });
  };
  return { client: { from, rpc } as unknown as DataClient, writes, rpcCalls };
}

const POPULAR = [
  { tag_id: 1, slug: "tinh-yeu", display_name: "Tình yêu", stories_count: 5 },
  { tag_id: 2, slug: "phieu-luu", display_name: "Phiêu lưu", stories_count: 3 },
];

describe("tag api", () => {
  it("sends the names to the RPC and returns the tags as stored", async () => {
    const f = fakeClient({
      setTags: () => ({ data: [{ tag_id: 1, slug: "lang-man", display_name: "Lãng mạn" }], error: null }),
    });
    expect(await setStoryTags(f.client, STORY_ID, ["lang man", "Lãng mạn"])).toEqual([
      { slug: "lang-man", name: "Lãng mạn" },
    ]);
    expect(f.rpcCalls).toEqual([
      { name: "set_story_tags", args: { p_story_id: STORY_ID, p_names: ["lang man", "Lãng mạn"] } },
    ]);
  });

  it("throws what the database refuses with", async () => {
    const f = fakeClient({ setTags: () => ({ data: null, error: { code: "PT409", message: "quota" } }) });
    await expect(setStoryTags(f.client, STORY_ID, ["abc"])).rejects.toMatchObject({ message: "quota" });
  });

  it("loads a story's tags for editing, by name", async () => {
    const f = fakeClient({
      storyTags: [
        { slug: "phieu-luu", display_name: "Phiêu lưu" },
        { slug: "bi-an", display_name: "Bí ẩn" },
      ],
    });
    const story = await getStoryForEdit(f.client, TEST_USER_ID, STORY_ID);
    expect(story?.tags).toEqual([
      { slug: "bi-an", name: "Bí ẩn" },
      { slug: "phieu-luu", name: "Phiêu lưu" },
    ]);
  });
});

const push = vi.fn();
const toasts = { show: vi.fn() };
const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/studio" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

function renderUi(client: DataClient, ui: ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, testSession())}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  toasts.show.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

function Harness({ initial = [] as TagChip[], error }: { initial?: TagChip[]; error?: string }) {
  const [value, setValue] = useState<TagChip[]>(initial);
  return <TagEditor value={value} onChange={setValue} error={error} />;
}

const names = () => screen.queryAllByRole("listitem").map((li) => li.textContent);

describe("TagEditor", () => {
  const field = () => screen.getByLabelText(t.label) as HTMLInputElement;
  const chips = () => within(screen.getByRole("list", { name: t.listLabel }));

  it("turns what was typed into a tag on Enter and on a comma, and empties the field", () => {
    renderUi(fakeClient({}).client, <Harness />);
    fireEvent.change(field(), { target: { value: "Tình yêu" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(chips().getByText("#Tình yêu")).toBeTruthy();
    expect(field().value).toBe("");
    fireEvent.change(field(), { target: { value: "Phiêu lưu," } });
    expect(chips().getByText("#Phiêu lưu")).toBeTruthy();
    expect(screen.getByText(t.count(2, MAX_STORY_TAGS))).toBeTruthy();
  });

  it("takes a pasted list as several tags, and commits when the field is left", () => {
    renderUi(fakeClient({}).client, <Harness />);
    fireEvent.change(field(), { target: { value: "a b, c d, e f" } });
    expect(chips().getAllByRole("listitem")).toHaveLength(3);
    fireEvent.change(field(), { target: { value: "g h" } });
    fireEvent.blur(field());
    expect(chips().getAllByRole("listitem")).toHaveLength(4);
  });

  it("removes the last tag on Backspace in an empty field, and any tag with its button", () => {
    renderUi(fakeClient({}).client, <Harness initial={[chip("một"), chip("hai"), chip("ba ba")]} />);
    fireEvent.keyDown(field(), { key: "Backspace" });
    expect(chips().queryByText("#ba ba")).toBeNull();
    fireEvent.change(field(), { target: { value: "x" } });
    fireEvent.keyDown(field(), { key: "Backspace" });
    expect(chips().getAllByRole("listitem")).toHaveLength(2); // the field had text: Backspace edits the text
    fireEvent.click(screen.getByRole("button", { name: t.remove("một") }));
    expect(chips().queryByText("#một")).toBeNull();
    expect(chips().getByText("#hai")).toBeTruthy();
  });

  it("explains an invalid tag and a full list", () => {
    renderUi(fakeClient({}).client, <Harness />);
    fireEvent.change(field(), { target: { value: "a," } });
    expect(screen.getByRole("alert").textContent).toBe(t.problems.invalid(TAG_NAME_MAX_LENGTH));
    expect(screen.queryByRole("list", { name: t.listLabel })).toBeNull();
    fireEvent.change(field(), {
      target: { value: Array.from({ length: MAX_STORY_TAGS + 1 }, (_, i) => `thẻ ${i}`).join(",") },
    });
    expect(screen.getByRole("alert").textContent).toBe(t.problems.tooMany(MAX_STORY_TAGS));
    expect(field().disabled).toBe(true);
  });

  it("shows a problem from the last save", () => {
    renderUi(fakeClient({}).client, <Harness error={t.errors.quota} />);
    expect(screen.getByRole("alert").textContent).toBe(t.errors.quota);
  });

  it("offers the popular tags that are not chosen yet, and adds one on click", async () => {
    renderUi(fakeClient({ popular: POPULAR }).client, <Harness initial={[chip("Tình yêu")]} />);
    const suggestions = within(await screen.findByRole("list", { name: t.suggestionsLabel }));
    expect(suggestions.queryByText("#Tình yêu")).toBeNull();
    fireEvent.click(suggestions.getByRole("button", { name: "#Phiêu lưu" }));
    expect(chips().getByText("#Phiêu lưu")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("list", { name: t.suggestionsLabel })).toBeNull());
  });

  it("offers no more than eight suggestions, and none once the list is full", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      tag_id: i,
      slug: `thẻ-phổ-biến-${i}`,
      display_name: `Phổ biến ${i}`,
      stories_count: 20 - i,
    }));
    renderUi(fakeClient({ popular: many }).client, <Harness />);
    const list = await screen.findByRole("list", { name: t.suggestionsLabel });
    expect(within(list).getAllByRole("button")).toHaveLength(8);
    cleanup();

    const full = Array.from({ length: MAX_STORY_TAGS }, (_, i) => chip(`đã chọn ${i}`));
    renderUi(fakeClient({ popular: many }).client, <Harness initial={full} />);
    await waitFor(() => expect(screen.getByText(t.count(MAX_STORY_TAGS, MAX_STORY_TAGS))).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("list", { name: t.suggestionsLabel })).toBeNull();
  });

  it("shows no alert element when there is nothing to say", () => {
    renderUi(fakeClient({}).client, <Harness />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(names()).toEqual([]);
  });
});

describe("StoryFormScreen: tags", () => {
  const save = () => screen.getByRole("button", { name: studioText.form.submitSave }) as HTMLButtonElement;
  const create = () => screen.getByRole("button", { name: studioText.form.submitCreate });
  const addTag = (name: string) => {
    fireEvent.change(screen.getByLabelText(t.label), { target: { value: `${name},` } });
  };

  it("creates the story and then sets its tags, then opens it", async () => {
    const f = fakeClient({});
    renderUi(f.client, <StoryFormScreen />);
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Đêm không ngủ" } });
    addTag("Tình yêu");
    addTag("phiêu lưu");
    fireEvent.click(create());

    await waitFor(() => expect(push).toHaveBeenCalled());
    const inserted = f.writes.find((w) => w.table === "stories" && w.op === "insert")?.values as { id: string };
    expect(f.rpcCalls.filter((c) => c.name === "set_story_tags")).toEqual([
      { name: "set_story_tags", args: { p_story_id: inserted.id, p_names: ["Tình yêu", "phiêu lưu"] } },
    ]);
    expect(push).toHaveBeenCalledWith(`/studio/story/${inserted.id}`);
  });

  it("does not call the tag RPC when no tag was chosen", async () => {
    const f = fakeClient({});
    renderUi(f.client, <StoryFormScreen />);
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Không thẻ" } });
    fireEvent.click(create());
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(f.rpcCalls.filter((c) => c.name === "set_story_tags")).toEqual([]);
  });

  it("still opens the new story when its tags are refused, and says why", async () => {
    const f = fakeClient({ setTags: () => ({ data: null, error: { code: "PT409", message: "quota" } }) });
    renderUi(f.client, <StoryFormScreen />);
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Quá hạn mức" } });
    addTag("thẻ mới");
    fireEvent.click(create());
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(toasts.show).toHaveBeenCalledWith("error", t.savedWithoutTags(t.errors.quota));
  });

  it("shows a story's tags when editing", async () => {
    renderUi(
      fakeClient({ storyTags: [{ slug: "tinh-yeu", display_name: "Tình yêu" }] }).client,
      <StoryFormScreen storyId={STORY_ID} />,
    );
    expect(await within(await screen.findByRole("list", { name: t.listLabel })).findByText("#Tình yêu")).toBeTruthy();
    expect(save().disabled).toBe(true);
  });

  it("saves only the tags when only the tags changed, without touching the story row", async () => {
    const f = fakeClient({ storyTags: [{ slug: "tinh-yeu", display_name: "Tình yêu" }] });
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    await screen.findByRole("list", { name: t.listLabel });
    addTag("Phiêu lưu");
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.click(save());
    await waitFor(() => expect(f.rpcCalls.filter((c) => c.name === "set_story_tags")).toHaveLength(1));
    expect(f.rpcCalls.find((c) => c.name === "set_story_tags")?.args).toEqual({
      p_story_id: STORY_ID,
      p_names: ["Tình yêu", "Phiêu lưu"],
    });
    expect(f.writes.filter((w) => w.table === "stories" && w.op === "update")).toEqual([]);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", studioText.form.saved));
    await waitFor(() => expect(save().disabled).toBe(true)); // saved: nothing left to save
  });

  it("shows the tags as the database stored them after saving", async () => {
    const f = fakeClient({
      storyTags: [],
      setTags: () => ({ data: [{ tag_id: 1, slug: "lang-man", display_name: "Lãng mạn" }], error: null }),
    });
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    await screen.findByLabelText(studioText.form.storyTitle);
    addTag("lang man");
    fireEvent.click(save());
    expect(await within(await screen.findByRole("list", { name: t.listLabel })).findByText("#Lãng mạn")).toBeTruthy();
  });

  it("saves the story and leaves the tags alone when only the story changed", async () => {
    const f = fakeClient({ storyTags: [{ slug: "tinh-yeu", display_name: "Tình yêu" }] });
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Tên mới" } });
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.click(save());
    await waitFor(() => expect(f.writes.filter((w) => w.table === "stories" && w.op === "update")).toHaveLength(1));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", studioText.form.saved));
    expect(f.rpcCalls.filter((c) => c.name === "set_story_tags")).toEqual([]);
  });

  it("saves both when both changed", async () => {
    const f = fakeClient({});
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Tên mới" } });
    addTag("Bí ẩn");
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.click(save());
    await waitFor(() => expect(f.rpcCalls.filter((c) => c.name === "set_story_tags")).toHaveLength(1));
    expect(f.writes.filter((w) => w.table === "stories" && w.op === "update")).toHaveLength(1);
  });

  it("keeps the story saved but tells the author when the tags are refused, and lets them retry", async () => {
    let refuse = true;
    const f = fakeClient({
      setTags: (args) =>
        refuse
          ? { data: null, error: { code: "PT409", message: "quota" } }
          : {
              data: (args.p_names as string[]).map((n, i) => ({ tag_id: i, slug: tagSlug(n), display_name: n })),
              error: null,
            },
    });
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Tên mới" } });
    addTag("Quá nhiều");
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.click(save());
    expect((await screen.findByRole("alert")).textContent).toBe(t.errors.quota);
    expect(f.writes.filter((w) => w.table === "stories" && w.op === "update")).toHaveLength(1);
    expect(toasts.show).not.toHaveBeenCalledWith("success", studioText.form.saved);
    expect(save().disabled).toBe(false); // the tags are still waiting to be saved

    refuse = false;
    fireEvent.click(save());
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", studioText.form.saved));
    expect(screen.queryByRole("alert")).toBeNull();
    // the story was not rewritten the second time: only the tags were still pending
    expect(f.writes.filter((w) => w.table === "stories" && w.op === "update")).toHaveLength(1);
  });
});

describe("StoryFormScreen: visibility, link preview and unsaved changes", () => {
  const form = studioText.form;
  const bar = () => screen.queryByRole("region", { name: form.unsaved.region });

  it("chooses the visibility from radio cards that carry the existing hints", async () => {
    const f = fakeClient({});
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    const group = await screen.findByRole("radiogroup", { name: form.visibility });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    const checked = within(group).getByRole("radio", { checked: true });
    expect(checked.textContent).toContain(form.visibilityHints.public);
    fireEvent.click(within(group).getByRole("radio", { name: new RegExp(studioText.visibility.unlisted) }));
    fireEvent.click(screen.getByRole("button", { name: form.submitSave }));
    await waitFor(() => expect(f.writes.find((w) => w.table === "stories" && w.op === "update")).toBeTruthy());
    expect(f.writes.find((w) => w.table === "stories" && w.op === "update")?.values).toMatchObject({
      visibility: "unlisted",
    });
  });

  it("previews the search result with the story page's own description cut and address", async () => {
    const long = `${"Một câu chuyện dài ".repeat(12)}kết thúc`;
    renderUi(fakeClient({ storyRow: { synopsis: long } }).client, <StoryFormScreen storyId={STORY_ID} />);
    const preview = await screen.findByRole("region", { name: form.seoPreview.region });
    expect(preview.querySelector('[data-part="title"]')?.textContent).toBe("Rừng sương mù");
    expect(preview.querySelector('[data-part="description"]')?.textContent).toBe(storyMetaDescription(long));
    expect(await within(preview).findByText(`app.test › story › ${STORY_ID} › rung-suong-mu`)).toBeTruthy();
    expect(within(preview).getByText(form.seoPreview.descriptionLength(long.length, 160))).toBeTruthy();
    expect(within(preview).queryByText(form.seoPreview.notIndexed)).toBeNull(); // public, not 18+

    fireEvent.change(screen.getByLabelText(form.storyTitle), { target: { value: "Tên khác" } });
    expect(preview.querySelector('[data-part="title"]')?.textContent).toBe("Tên khác");
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(studioText.visibility.private) }));
    expect(await within(preview).findByText(form.seoPreview.notIndexed)).toBeTruthy();
  });

  it("shows the unsaved bar with the number of changes, and Discard puts everything back", async () => {
    renderUi(fakeClient({}).client, <StoryFormScreen storyId={STORY_ID} />);
    const title = (await screen.findByLabelText(form.storyTitle)) as HTMLInputElement;
    expect(bar()).toBeNull(); // hidden from assistive tech while clean
    fireEvent.change(title, { target: { value: "Tên mới" } });
    fireEvent.change(screen.getByLabelText(studioText.tags.label), { target: { value: "Bí ẩn," } });
    const region = await screen.findByRole("region", { name: form.unsaved.region });
    expect(within(region).getByRole("status").textContent).toBe(form.unsaved.count(2));
    fireEvent.click(within(region).getByRole("button", { name: form.unsaved.discard }));
    await waitFor(() => expect(title.value).toBe("Rừng sương mù"));
    expect(screen.queryByText("#Bí ẩn")).toBeNull();
    expect(bar()).toBeNull();
  });

  it("saves from the bar with the form's own save, and stops a link away while unsaved", async () => {
    const f = fakeClient({});
    renderUi(f.client, <StoryFormScreen storyId={STORY_ID} />);
    fireEvent.change(await screen.findByLabelText(form.storyTitle), { target: { value: "Tên mới" } });
    const region = await screen.findByRole("region", { name: form.unsaved.region });
    // a link outside the form (the chapters link above it) is stopped and the bar warns
    expect(fireEvent.click(screen.getByText(form.chaptersLink))).toBe(false);
    expect(region.getAttribute("data-state")).toBe("warning");
    expect(within(region).getByRole("status").textContent).toBe(form.unsaved.warning);
    // the form's own Cancel is an explicit choice
    expect(fireEvent.click(screen.getByRole("link", { name: form.cancel }))).toBe(true);
    fireEvent.click(within(region).getByRole("button", { name: form.unsaved.save }));
    await waitFor(() => expect(f.writes.filter((w) => w.table === "stories" && w.op === "update")).toHaveLength(1));
    await waitFor(() => expect(bar()).toBeNull());
  });

  it("has no unsaved bar when creating a story", async () => {
    renderUi(fakeClient({}).client, <StoryFormScreen />);
    fireEvent.change(await screen.findByLabelText(form.storyTitle), { target: { value: "Mới" } });
    expect(bar()).toBeNull();
  });
});
