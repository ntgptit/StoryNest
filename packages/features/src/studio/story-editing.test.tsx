import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoryForm } from "@storynest/validation";
import { AppError } from "../_shared/errors.ts";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import {
  createStory,
  getStoryForEdit,
  listDeletedStories,
  setStoryDeleted,
  updateStory,
} from "./api/story-write.api.ts";
import {
  categoryOptions,
  emptyStoryForm,
  isSlugTaken,
  slugFromTitle,
  toStoryPayload,
  toStoryUpdate,
  validationMessage,
} from "./model/story-form.ts";
import { StoryFormScreen, StudioScreen } from "./index.ts";
import { studioText } from "./strings.ts";

// jsdom lacks ResizeObserver, which Radix Select (the category/status/visibility pickers) needs to mount.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

const STORY_ID = "5eed0000-0000-4000-8000-00000000d001";
const FORM: StoryForm = {
  title: "Rừng sương mù",
  slug: "rung-suong-mu",
  synopsis: "Một khu rừng.",
  categoryId: "2",
  languageCode: "vi",
  status: "ongoing",
  visibility: "public",
  isMature: true,
};

type Result = { data: unknown; error: unknown };
type Call = [string, unknown[]];

/** Records every builder call per table and answers through `respond(table, calls)`. */
function fakeClient(respond: (table: string, calls: Call[]) => Result) {
  const all: { table: string; calls: Call[] }[] = [];
  const from = vi.fn((table: string) => {
    const entry = { table, calls: [] as Call[] };
    all.push(entry);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "insert", "update", "eq", "is", "not", "order", "returns"]) {
      builder[method] = (...args: unknown[]) => {
        entry.calls.push([method, args]);
        return builder;
      };
    }
    builder.maybeSingle = () => {
      entry.calls.push(["maybeSingle", []]);
      return Promise.resolve(respond(table, entry.calls));
    };
    builder.then = (resolve: (value: unknown) => unknown) => resolve(respond(table, entry.calls));
    return builder;
  });
  const callsOf = (table: string, method: string) =>
    all.filter((e) => e.table === table).flatMap((e) => e.calls.filter(([m]) => m === method).map(([, a]) => a));
  return { from, callsOf };
}

describe("story form model", () => {
  it("proposes an ascii slug from a Vietnamese title", () => {
    expect(slugFromTitle("Đừng Bỏ Cuộc!")).toBe("dung-bo-cuoc");
    expect(slugFromTitle("  Rừng   sương mù ")).toBe("rung-suong-mu");
    expect(slugFromTitle("!!!")).toBe("");
    expect(slugFromTitle("a".repeat(300)).length).toBeLessThanOrEqual(120);
  });

  it("builds the database payload through storyCreateSchema: category as number or null, no identity fields", () => {
    expect(toStoryPayload(FORM)).toEqual({
      title: "Rừng sương mù",
      slug: "rung-suong-mu",
      synopsis: "Một khu rừng.",
      category_id: 2,
      language_code: "vi",
      status: "ongoing",
      visibility: "public",
      is_mature: true,
    });
    expect(toStoryPayload({ ...FORM, categoryId: "" }).category_id).toBeNull();
    expect(toStoryUpdate(FORM)).not.toHaveProperty("id");
  });

  it("starts a new story as a private draft in Vietnamese", () => {
    expect(emptyStoryForm()).toMatchObject({
      status: "draft",
      visibility: "private",
      languageCode: "vi",
      isMature: false,
      categoryId: "",
    });
  });

  it("lists each root category followed by its children, in display order", () => {
    const options = categoryOptions([
      { id: 3, slug: "c", name: "Con", parentId: 1, sortOrder: 1 },
      { id: 2, slug: "b", name: "Giả tưởng", parentId: null, sortOrder: 20 },
      { id: 1, slug: "a", name: "Lãng mạn", parentId: null, sortOrder: 10 },
    ]);
    expect(options.map((o) => o.label)).toEqual(["Lãng mạn", "Lãng mạn › Con", "Giả tưởng"]);
  });

  it("recognises a taken slug only for a unique violation, and translates validation codes", () => {
    expect(isSlugTaken(new AppError("conflict", "x", { code: "23505" }))).toBe(true);
    expect(isSlugTaken(new AppError("conflict", "x", { code: "23503" }))).toBe(false);
    expect(isSlugTaken(new AppError("invalid", "x", { code: "23505" }))).toBe(false);
    expect(validationMessage("slug_invalid")).toBe(studioText.validation.slugInvalid);
    expect(validationMessage(undefined)).toBeUndefined();
    expect(validationMessage("something_new")).toBe(studioText.errors.generic);
  });
});

describe("story write api", () => {
  it("inserts with the client id and the owner, and surfaces a duplicate slug as a unique violation", async () => {
    const ok = fakeClient(() => ({ data: null, error: null }));
    expect(await createStory(ok as unknown as DataClient, TEST_USER_ID, STORY_ID, FORM)).toBe(STORY_ID);
    expect(ok.callsOf("stories", "insert")[0]?.[0]).toMatchObject({
      id: STORY_ID,
      owner_id: TEST_USER_ID,
      slug: "rung-suong-mu",
      category_id: 2,
    });

    const taken = fakeClient(() => ({ data: null, error: { code: "23505", message: "duplicate key", status: 409 } }));
    const error = await createStory(taken as unknown as DataClient, TEST_USER_ID, STORY_ID, FORM).catch(
      (e: unknown) => e,
    );
    expect(error).toBeDefined();
  });

  it("updates by id and treats zero matched rows as not found (not editable)", async () => {
    const ok = fakeClient(() => ({ data: [{ id: STORY_ID }], error: null }));
    await updateStory(ok as unknown as DataClient, STORY_ID, FORM);
    expect(ok.callsOf("stories", "eq")).toContainEqual(["id", STORY_ID]);
    expect(ok.callsOf("stories", "update")[0]?.[0]).not.toHaveProperty("owner_id");

    const none = fakeClient(() => ({ data: [], error: null }));
    await expect(updateStory(none as unknown as DataClient, STORY_ID, FORM)).rejects.toMatchObject({
      kind: "notFound",
    });
  });

  it("soft deletes with a timestamp and restores with null; never hard deletes", async () => {
    const t = fakeClient(() => ({ data: [{ id: STORY_ID }], error: null }));
    await setStoryDeleted(t as unknown as DataClient, STORY_ID, true);
    await setStoryDeleted(t as unknown as DataClient, STORY_ID, false);
    const [first, second] = t.callsOf("stories", "update").map(([v]) => v as { deleted_at: string | null });
    expect(typeof first?.deleted_at).toBe("string");
    expect(Number.isNaN(Date.parse(first?.deleted_at ?? ""))).toBe(false);
    expect(second?.deleted_at).toBeNull();
    expect(t.callsOf("stories", "delete" as never)).toEqual([]);
  });

  it("opens a story for its owner and for collaborators, and not for anyone else", async () => {
    const storyRow = {
      id: STORY_ID,
      owner_id: "someone-else",
      slug: "s",
      title: "T",
      synopsis: "",
      category_id: null,
      language_code: "vi",
      status: "draft",
      visibility: "private",
      is_mature: false,
      deleted_at: null,
    };
    const respond =
      (role: string | null) =>
      (table: string): Result =>
        table === "stories"
          ? { data: storyRow, error: null }
          : { data: role ? { collaborator_role: role } : null, error: null };

    expect(
      (await getStoryForEdit(fakeClient(respond("co_author")) as unknown as DataClient, TEST_USER_ID, STORY_ID))?.role,
    ).toBe("co_author");
    expect(
      (await getStoryForEdit(fakeClient(respond("editor")) as unknown as DataClient, TEST_USER_ID, STORY_ID))?.role,
    ).toBe("editor");
    expect(
      await getStoryForEdit(fakeClient(respond(null)) as unknown as DataClient, TEST_USER_ID, STORY_ID),
    ).toBeNull();
    expect(
      await getStoryForEdit(fakeClient(respond("admin")) as unknown as DataClient, TEST_USER_ID, STORY_ID),
    ).toBeNull();

    const own = fakeClient((table) =>
      table === "stories"
        ? { data: { ...storyRow, owner_id: TEST_USER_ID }, error: null }
        : { data: null, error: null },
    );
    const mine = await getStoryForEdit(own as unknown as DataClient, TEST_USER_ID, STORY_ID);
    expect(mine?.role).toBe("owner");
    expect(mine?.form).toMatchObject({ categoryId: "", status: "draft", visibility: "private" });
    expect(own.callsOf("story_collaborators", "select")).toEqual([]); // the owner needs no second query

    const missing = fakeClient(() => ({ data: null, error: null }));
    expect(await getStoryForEdit(missing as unknown as DataClient, TEST_USER_ID, STORY_ID)).toBeNull();
  });

  it("lists only the caller's own deleted stories, newest deletion first", async () => {
    const t = fakeClient(() => ({
      data: [
        { id: "a", title: "A", deleted_at: "2026-11-04T00:00:00Z" },
        { id: "b", title: "B", deleted_at: null },
      ],
      error: null,
    }));
    const list = await listDeletedStories(t as unknown as DataClient, TEST_USER_ID);
    expect(list).toEqual([{ id: "a", title: "A", deletedAt: "2026-11-04T00:00:00Z" }]);
    expect(t.callsOf("stories", "eq")).toContainEqual(["owner_id", TEST_USER_ID]);
    expect(t.callsOf("stories", "not")).toContainEqual(["deleted_at", "is", null]);
    expect(t.callsOf("stories", "order")).toContainEqual(["deleted_at", { ascending: false }]);
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
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/studio/new" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};

const categoryRows = [
  { id: 1, slug: "lang-man", name: "Lãng mạn", parent_id: null, sort_order: 10 },
  { id: 2, slug: "gia-tuong", name: "Giả tưởng", parent_id: null, sort_order: 20 },
];

function renderScreen(client: DataClient, ui: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={client}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={{ show: vi.fn() }}>{ui}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("StoryFormScreen: create", () => {
  const setup = (insertResult: Result = { data: null, error: null }) => {
    const t = fakeClient((table, calls) => {
      if (table === "categories") return { data: categoryRows, error: null };
      if (calls.some(([m]) => m === "insert")) return insertResult;
      return { data: null, error: null };
    });
    renderScreen(withAuth(t, testSession()), <StoryFormScreen />);
    return t;
  };

  it("fills the slug from the title until the author edits it", async () => {
    setup();
    const title = await screen.findByLabelText(studioText.form.storyTitle);
    const slug = screen.getByLabelText(studioText.form.slug) as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Đừng Bỏ Cuộc" } });
    expect(slug.value).toBe("dung-bo-cuoc");
    fireEvent.change(slug, { target: { value: "my-own" } });
    fireEvent.change(title, { target: { value: "Đừng Bỏ Cuộc 2" } });
    expect(slug.value).toBe("my-own");
  });

  it("creates the story with a client id and the owner, then opens it", async () => {
    push.mockClear();
    const t = setup();
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Đêm không ngủ" } });
    fireEvent.click(screen.getByRole("button", { name: studioText.form.submitCreate }));

    await waitFor(() => expect(t.callsOf("stories", "insert")).toHaveLength(1));
    const inserted = t.callsOf("stories", "insert")[0]?.[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({
      owner_id: TEST_USER_ID,
      slug: "dem-khong-ngu",
      status: "draft",
      visibility: "private",
      category_id: null,
    });
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/studio/story/${inserted.id}`));
  });

  it("shows validation messages and sends nothing when the title is missing", async () => {
    const t = setup();
    fireEvent.click(await screen.findByRole("button", { name: studioText.form.submitCreate }));
    expect(await screen.findByText(studioText.validation.titleRequired)).toBeTruthy();
    expect(t.callsOf("stories", "insert")).toEqual([]);
  });

  it("tells the author when the slug is already used instead of a generic error", async () => {
    const t = setup({ data: null, error: { code: "23505", message: "duplicate key value", status: 409 } });
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Trùng" } });
    fireEvent.click(screen.getByRole("button", { name: studioText.form.submitCreate }));
    expect(await screen.findByText(studioText.errors.slugTaken)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(t.callsOf("stories", "insert")).toHaveLength(1);
  });

  it("reuses the same id when the author retries after a failure (no duplicate story)", async () => {
    const t = setup({ data: null, error: { code: "23505", message: "duplicate key value", status: 409 } });
    fireEvent.change(await screen.findByLabelText(studioText.form.storyTitle), { target: { value: "Thử lại" } });
    fireEvent.click(screen.getByRole("button", { name: studioText.form.submitCreate }));
    await screen.findByText(studioText.errors.slugTaken);
    fireEvent.click(screen.getByRole("button", { name: studioText.form.submitCreate }));
    await waitFor(() => expect(t.callsOf("stories", "insert")).toHaveLength(2));
    const [a, b] = t.callsOf("stories", "insert").map(([v]) => (v as { id: string }).id);
    expect(a).toBe(b);
  });
});

describe("StoryFormScreen: edit", () => {
  const storyRow = (overrides: Record<string, unknown> = {}) => ({
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
    ...overrides,
  });

  function setup(row: unknown, collaboratorRole: string | null = null) {
    const t = fakeClient((table, calls) => {
      if (table === "categories") return { data: categoryRows, error: null };
      if (table === "story_collaborators")
        return { data: collaboratorRole ? { collaborator_role: collaboratorRole } : null, error: null };
      if (calls.some(([m]) => m === "update")) return { data: [{ id: STORY_ID }], error: null };
      return { data: row, error: null };
    });
    renderScreen(withAuth(t, testSession()), <StoryFormScreen storyId={STORY_ID} />);
    return t;
  }

  it("loads the story into the form and enables saving only after a change", async () => {
    const t = setup(storyRow());
    const title = (await screen.findByLabelText(studioText.form.storyTitle)) as HTMLInputElement;
    expect(title.value).toBe("Rừng sương mù");
    const save = screen.getByRole("button", { name: studioText.form.submitSave }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(title, { target: { value: "Rừng sương mù 2" } });
    await waitFor(() => expect(save.disabled).toBe(false));
    fireEvent.click(save);
    await waitFor(() => expect(t.callsOf("stories", "update")).toHaveLength(1));
    expect(t.callsOf("stories", "update")[0]?.[0]).toMatchObject({ title: "Rừng sương mù 2", slug: "rung-suong-mu" });
  });

  it("does not rewrite the slug when the title changes while editing (published links stay stable)", async () => {
    setup(storyRow());
    const title = await screen.findByLabelText(studioText.form.storyTitle);
    fireEvent.change(title, { target: { value: "Rừng sương mù mới" } });
    expect((screen.getByLabelText(studioText.form.slug) as HTMLInputElement).value).toBe("rung-suong-mu");
  });

  it("shows a read-only notice to an editor (editors cannot change story settings)", async () => {
    setup(storyRow({ owner_id: "someone-else" }), "editor");
    expect(await screen.findByText(studioText.form.readOnly)).toBeTruthy();
    expect(screen.queryByLabelText(studioText.form.storyTitle)).toBeNull();
  });

  it("shows not found for a story the user does not work on", async () => {
    setup(storyRow({ owner_id: "someone-else" }), null);
    expect(await screen.findByText(studioText.form.notFound.title)).toBeTruthy();
  });

  it("asks for confirmation before deleting, then soft deletes and returns to the studio", async () => {
    push.mockClear();
    const t = setup(storyRow());
    fireEvent.click(await screen.findByRole("button", { name: studioText.form.delete }));
    const dialog = await screen.findByRole("dialog");
    expect(t.callsOf("stories", "update")).toEqual([]); // nothing yet
    fireEvent.click(within(dialog).getByRole("button", { name: studioText.form.deleteConfirm }));
    await waitFor(() => expect(t.callsOf("stories", "update")).toHaveLength(1));
    expect(typeof (t.callsOf("stories", "update")[0]?.[0] as { deleted_at: unknown }).deleted_at).toBe("string");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/studio"));
  });

  it("only the owner sees the delete button; a co-author does not", async () => {
    setup(storyRow({ owner_id: "someone-else" }), "co_author");
    await screen.findByLabelText(studioText.form.storyTitle);
    expect(screen.queryByRole("button", { name: studioText.form.delete })).toBeNull();
  });

  it("offers to restore a deleted story", async () => {
    const t = setup(storyRow({ deleted_at: "2026-11-04T00:00:00+00:00" }));
    expect(await screen.findByText(studioText.form.deletedNotice)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: studioText.form.restore }));
    await waitFor(() => expect(t.callsOf("stories", "update")).toHaveLength(1));
    expect((t.callsOf("stories", "update")[0]?.[0] as { deleted_at: unknown }).deleted_at).toBeNull();
  });
});

describe("StudioScreen: create link and deleted stories", () => {
  function setup(deleted: unknown[]) {
    const t = fakeClient((table, calls) => {
      if (table === "story_collaborators") return { data: [], error: null };
      if (calls.some(([m]) => m === "update")) return { data: [{ id: "a" }], error: null };
      if (calls.some(([m, a]) => m === "not" && (a as unknown[])[0] === "deleted_at"))
        return { data: deleted, error: null };
      return { data: [], error: null };
    });
    renderScreen(withAuth(t, testSession()), <StudioScreen />);
    return t;
  }

  it("links to the create page", async () => {
    setup([]);
    expect((await screen.findByRole("link", { name: studioText.create })).getAttribute("href")).toBe("/studio/new");
  });

  it("hides deleted stories behind a toggle and restores one", async () => {
    const t = setup([{ id: "a", title: "Truyện cũ", deleted_at: "2026-11-03T00:00:00+00:00" }]);
    expect(screen.queryByText("Truyện cũ")).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: studioText.deleted.toggleShow(1) }));
    expect(await screen.findByText("Truyện cũ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: studioText.deleted.restore }));
    await waitFor(() => expect(t.callsOf("stories", "update")).toHaveLength(1));
    expect((t.callsOf("stories", "update")[0]?.[0] as { deleted_at: unknown }).deleted_at).toBeNull();
  });

  it("shows no deleted section when there is nothing deleted", async () => {
    setup([]);
    await screen.findByText(studioText.empty.title);
    expect(screen.queryByRole("button", { name: /Hiện truyện đã xóa/ })).toBeNull();
  });
});
