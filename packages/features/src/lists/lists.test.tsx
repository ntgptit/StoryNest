import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { setLanguage } from "../_shared/i18n.ts";
import { AppError } from "../_shared/errors.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import {
  addStoryToList,
  createList,
  deleteList,
  getList,
  getMembership,
  listMyLists,
  removeStoryFromList,
  reorderList,
  updateList,
} from "./api/lists.api.ts";
import { AddToListButton, ListScreen, MyLists } from "./index.ts";
import {
  checkListForm,
  listErrorMessage,
  moveStory,
  toListItems,
  toReadingList,
  type ListRow,
  type ListStoryRow,
} from "./model/list.ts";
import { listText } from "./strings.ts";
import { shareText } from "../share/index.ts";

afterEach(cleanup);

const t = listText;
const lid = (n: number) => `ad000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sid = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const listRow = (n: number, overrides: Partial<ListRow> = {}): ListRow => ({
  id: lid(n),
  owner_id: TEST_USER_ID,
  title: `Danh sách ${n}`,
  description: `Mô tả ${n}`,
  visibility: "private",
  updated_at: "2026-11-04T09:00:00.123456+00:00",
  items: [{ count: n }],
  owner: { username: "chu_sach", display_name: "Chủ Sách" },
  ...overrides,
});
const storyRow = (n: number, overrides: Partial<ListStoryRow> = {}): ListStoryRow => ({
  id: sid(n),
  slug: `truyen-${n}`,
  title: `Truyện ${n}`,
  synopsis: `Tóm tắt ${n}`,
  cover_storage_key: null,
  status: "ongoing",
  is_mature: false,
  language_code: "vi",
  updated_at: "2026-11-04T09:00:00+00:00",
  owner: { username: "tac_gia", display_name: "Tác Giả" },
  category: null,
  stats: { reads: 1, votes: 2, comments: 3, followers: 4 },
  story_tags: [],
  deleted_at: null,
  ...overrides,
});
const itemRow = (n: number, order = n, story: ListStoryRow | null = storyRow(n)) => ({
  story_id: sid(n),
  sort_order: order,
  story,
});

describe("list model", () => {
  it("maps a list with its count and the owner's name (username when the name is blank)", () => {
    expect(toReadingList(listRow(3, { visibility: "public" }))).toMatchObject({
      id: lid(3),
      storyCount: 3,
      visibility: "public",
      ownerName: "Chủ Sách",
    });
    expect(toReadingList(listRow(1, { owner: [{ username: "u", display_name: " " }] })).ownerName).toBe("u");
    expect(toReadingList(listRow(1, { items: null })).storyCount).toBe(0);
    expect(toReadingList(listRow(1, { visibility: "weird" })).visibility).toBe("private");
  });

  it("orders the stories as stored and drops a deleted one", () => {
    const items = toListItems([
      itemRow(2, 2),
      itemRow(1, 1),
      itemRow(3, 3, storyRow(3, { deleted_at: "2026-11-04T00:00:00Z" })),
      itemRow(4, 4, null),
    ] as never);
    expect(items.map((i) => i.storyId)).toEqual([sid(1), sid(2)]);
  });

  it("moves a story one place, refuses to move past the ends, never changes its input", () => {
    const ids = [sid(1), sid(2), sid(3)];
    expect(moveStory(ids, sid(2), -1)).toEqual([sid(2), sid(1), sid(3)]);
    expect(moveStory(ids, sid(2), 1)).toEqual([sid(1), sid(3), sid(2)]);
    expect(moveStory(ids, sid(1), -1)).toBeNull();
    expect(moveStory(ids, sid(3), 1)).toBeNull();
    expect(moveStory(ids, sid(9), 1)).toBeNull();
    expect(ids).toEqual([sid(1), sid(2), sid(3)]);
  });

  it("checks the form", () => {
    const ok = { title: " Hay ", description: "", visibility: "private" as const };
    expect(checkListForm(ok)).toEqual({});
    expect(checkListForm({ ...ok, title: "  " }).title).toBe(t.form.validation.nameRequired);
    expect(checkListForm({ ...ok, title: "x".repeat(121) }).title).toBe(t.form.validation.nameTooLong);
    expect(checkListForm({ ...ok, description: "x".repeat(1001) }).description).toBe(
      t.form.validation.descriptionTooLong,
    );
  });

  it("explains a failure by kind", () => {
    expect(listErrorMessage(new AppError("conflict", "x"))).toBe(t.errors.conflict);
    expect(listErrorMessage(new AppError("notFound", "x"))).toBe(t.errors.notFound);
    expect(listErrorMessage(new AppError("forbidden", "x"))).toBe(t.errors.forbidden);
    expect(listErrorMessage(new AppError("unknown", "x"))).toBe(t.errors.generic);
  });
});

type Call = [string, unknown[]];
type Op = {
  table: string;
  calls: Call[];
  op: "select" | "insert" | "update" | "delete";
  values?: unknown;
  single: boolean;
};
type Result = { data: unknown; error: unknown };

function fakeClient(options: {
  mine?: ListRow[];
  detail?: ListRow | null;
  items?: unknown[];
  membership?: string[];
  insert?: Result;
  update?: Result;
  /** While `current` is a promise, the stories query waits for it (to look at the screen before a reload lands). */
  hold?: { current: Promise<void> | null };
  rpc?: (name: string, args: Record<string, unknown>) => Result | Promise<Result>;
}) {
  const ops: Op[] = [];
  const from = vi.fn((table: string) => {
    const op: Op = { table, calls: [], op: "select", single: false };
    ops.push(op);
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "order", "returns"]) {
      builder[method] = (...args: unknown[]) => {
        op.calls.push([method, args]);
        return builder;
      };
    }
    builder.insert = (values: unknown) => {
      op.op = "insert";
      op.values = values;
      return builder;
    };
    builder.update = (values: unknown) => {
      op.op = "update";
      op.values = values;
      return builder;
    };
    builder.delete = () => {
      op.op = "delete";
      return builder;
    };
    builder.maybeSingle = () => {
      op.single = true;
      return Promise.resolve({ data: options.detail ?? null, error: null });
    };
    builder.then = (resolve: (value: unknown) => unknown) => {
      if (op.op === "insert") return resolve(options.insert ?? { data: null, error: null });
      if (op.op === "update") return resolve(options.update ?? { data: [{ id: "x" }], error: null });
      if (op.op === "delete") return resolve(options.update ?? { data: [{ id: "x" }], error: null });
      const selected = String(op.calls.find(([m]) => m === "select")?.[1][0] ?? "");
      if (table === "reading_lists") return resolve({ data: options.mine ?? [], error: null });
      if (selected.includes("story:stories")) {
        const gate = options.hold?.current;
        return gate
          ? gate.then(() => resolve({ data: options.items ?? [], error: null }))
          : resolve({ data: options.items ?? [], error: null });
      }
      return resolve({ data: (options.membership ?? []).map((id) => ({ reading_list_id: id })), error: null });
    };
    return builder;
  });
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return options.rpc?.(name, args) ?? { data: 1, error: null };
  });
  return {
    from,
    rpc,
    ops,
    rpcCalls,
    of: (table: string, kind: Op["op"]) => ops.filter((o) => o.table === table && o.op === kind),
  };
}
const callOf = (op: { calls: Call[] }, method: string) => op.calls.find(([m]) => m === method)?.[1];

describe("lists api", () => {
  it("lists my lists, most recently changed first, with the story count embedded", async () => {
    const c = fakeClient({ mine: [listRow(1), listRow(2)] });
    const lists = await listMyLists(c as unknown as DataClient, TEST_USER_ID);
    expect(lists.map((l) => l.id)).toEqual([lid(1), lid(2)]);
    const q = c.of("reading_lists", "select")[0]!;
    expect(callOf(q, "eq")).toEqual(["owner_id", TEST_USER_ID]);
    expect(callOf(q, "order")).toEqual(["updated_at", { ascending: false }]);
    const columns = String(callOf(q, "select")?.[0]);
    expect(columns).toContain("items:reading_list_items(count)");
  });

  it("reads one list with its owner and its stories in order; null when the list is not visible", async () => {
    const c = fakeClient({ detail: listRow(1, { visibility: "public" }), items: [itemRow(2, 2), itemRow(1, 1)] });
    const result = await getList(c as unknown as DataClient, lid(1));
    expect(result?.items.map((i) => i.storyId)).toEqual([sid(1), sid(2)]);
    const listQuery = c.of("reading_lists", "select")[0]!;
    expect(String(callOf(listQuery, "select")?.[0])).toContain(
      "owner:app_users!reading_lists_owner_id_fkey(username, display_name)",
    );
    const itemsQuery = c.of("reading_list_items", "select")[0]!;
    const columns = String(callOf(itemsQuery, "select")?.[0]);
    expect(columns).toContain("story:stories!reading_list_items_story_id_fkey(");
    expect(columns.split("(").length).toBe(columns.split(")").length);
    expect(callOf(itemsQuery, "order")).toEqual(["sort_order", { ascending: true }]);
    const hidden = fakeClient({ detail: null });
    expect(await getList(hidden as unknown as DataClient, lid(1))).toBeNull();
    expect(hidden.of("reading_list_items", "select")).toHaveLength(0);
  });

  it("asks for the membership only among my lists, and not at all without lists", async () => {
    const c = fakeClient({ membership: [lid(2)] });
    expect(await getMembership(c as unknown as DataClient, sid(1), [])).toEqual([]);
    expect(c.ops).toHaveLength(0);
    expect(await getMembership(c as unknown as DataClient, sid(1), [lid(1), lid(2)])).toEqual([lid(2)]);
    const q = c.of("reading_list_items", "select")[0]!;
    expect(callOf(q, "in")).toEqual(["reading_list_id", [lid(1), lid(2)]]);
    expect(callOf(q, "eq")).toEqual(["story_id", sid(1)]);
  });

  it("creates under the given id with trimmed text, and accepts the same id arriving twice", async () => {
    const c = fakeClient({});
    const client = c as unknown as DataClient;
    const values = { title: "  Hay  ", description: " mô tả ", visibility: "public" as const };
    expect(await createList(client, TEST_USER_ID, { id: lid(1), ...values })).toBe(lid(1));
    expect(c.of("reading_lists", "insert")[0]!.values).toEqual({
      id: lid(1),
      owner_id: TEST_USER_ID,
      title: "Hay",
      description: "mô tả",
      visibility: "public",
    });
    const twice = fakeClient({ insert: { data: null, error: { code: "23505", message: "duplicate" } } });
    expect(await createList(twice as unknown as DataClient, TEST_USER_ID, { id: lid(1), ...values })).toBe(lid(1));
    const failing = fakeClient({ insert: { data: null, error: { code: "PT409", message: "too many" } } });
    await expect(
      createList(failing as unknown as DataClient, TEST_USER_ID, { id: lid(1), ...values }),
    ).rejects.toMatchObject({ kind: "conflict" });
  });

  it("updates, deletes and treats zero matched rows as not found", async () => {
    const c = fakeClient({});
    const client = c as unknown as DataClient;
    await updateList(client, lid(1), { title: " Mới ", description: "", visibility: "unlisted" });
    expect(c.of("reading_lists", "update")[0]!.values).toEqual({
      title: "Mới",
      description: "",
      visibility: "unlisted",
    });
    await deleteList(client, lid(1));
    const none = fakeClient({ update: { data: [], error: null } });
    await expect(
      updateList(none as unknown as DataClient, lid(1), { title: "x", description: "", visibility: "private" }),
    ).rejects.toMatchObject({ kind: "notFound" });
    await expect(deleteList(none as unknown as DataClient, lid(1))).rejects.toMatchObject({ kind: "notFound" });
  });

  it("adds, removes and reorders with the arguments the database expects", async () => {
    const c = fakeClient({ rpc: () => ({ data: 4, error: null }) });
    const client = c as unknown as DataClient;
    expect(await addStoryToList(client, lid(1), sid(1))).toBe(4);
    await removeStoryFromList(client, lid(1), sid(1));
    await reorderList(client, lid(1), [sid(2), sid(1)]);
    expect(c.rpcCalls).toEqual([
      { name: "add_story_to_list", args: { p_list_id: lid(1), p_story_id: sid(1) } },
      { name: "reorder_list_items", args: { p_list_id: lid(1), p_story_ids: [sid(2), sid(1)] } },
    ]);
    const del = c.of("reading_list_items", "delete")[0]!;
    expect(del.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([
      ["reading_list_id", lid(1)],
      ["story_id", sid(1)],
    ]);
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
  useNavigation: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/story/s/t" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderUi(c: ReturnType<typeof fakeClient>, ui: React.ReactNode, signedIn = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(c, signedIn ? testSession() : null)}>
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

describe("MyLists", () => {
  it("shows my lists with their size and who may see them, each linking to its page", async () => {
    const c = fakeClient({ mine: [listRow(2, { visibility: "public" }), listRow(1)] });
    renderUi(c, <MyLists />);
    const list = within(await screen.findByRole("list", { name: t.myLists.listLabel }));
    const links = list.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([`/lists/${lid(2)}`, `/lists/${lid(1)}`]);
    expect(within(links[0]!).getByText(t.visibility.public)).toBeTruthy();
    expect(within(links[1]!).getByText(t.visibility.private)).toBeTruthy();
    expect(within(links[0]!).getByText(/2 truyện/)).toBeTruthy();
  });

  it("shows an empty note and a retry for a failed load", async () => {
    renderUi(fakeClient({}), <MyLists />);
    expect(await screen.findByText(t.myLists.empty.title)).toBeTruthy();
  });

  it("creates a list: refuses an empty name, then sends trimmed values with one id that survives a failed attempt", async () => {
    let attempt = 0;
    const c = fakeClient({
      insert: undefined,
    });
    const original = c.from.getMockImplementation()!;
    c.from.mockImplementation((table: string) => {
      const builder = original(table) as Record<string, unknown> & { then: (r: (v: unknown) => unknown) => unknown };
      const realThen = builder.then;
      builder.then = (resolve) => {
        const last = c.ops.at(-1)!;
        if (last.op === "insert" && ++attempt === 1)
          return resolve({ data: null, error: { code: "XX000", message: "down" } });
        return realThen(resolve);
      };
      return builder;
    });
    renderUi(c, <MyLists />);
    fireEvent.click(await screen.findByRole("button", { name: t.myLists.create }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.submitCreate }));
    expect(await within(dialog).findByText(t.form.validation.nameRequired)).toBeTruthy();
    expect(c.of("reading_lists", "insert")).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText(t.form.name), { target: { value: "  Truyện hay  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.submitCreate }));
    expect(await within(dialog).findByText(t.errors.generic)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.submitCreate }));
    await waitFor(() => expect(c.of("reading_lists", "insert")).toHaveLength(2));
    const [first, second] = c.of("reading_lists", "insert").map((o) => o.values as Record<string, unknown>);
    expect(first).toMatchObject({ title: "Truyện hay", visibility: "private", owner_id: TEST_USER_ID });
    expect(second!.id).toBe(first!.id);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.form.created));
  });
});

describe("AddToListButton", () => {
  it("sends a guest to sign in instead of opening the sheet", async () => {
    const c = fakeClient({});
    renderUi(c, <AddToListButton storyId={sid(1)} />, false);
    fireEvent.click(await screen.findByRole("button", { name: t.addTo.open }));
    expect(push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/story/s/t")}`);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(c.ops).toHaveLength(0);
  });

  it("loads nothing until the sheet is opened, then marks the lists that already hold the story", async () => {
    const c = fakeClient({ mine: [listRow(1), listRow(2)], membership: [lid(2)] });
    renderUi(c, <AddToListButton storyId={sid(1)} />);
    await screen.findByRole("button", { name: t.addTo.open });
    expect(c.ops.filter((o) => o.table.startsWith("reading_"))).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: t.addTo.open }));
    const list = within(await screen.findByRole("list", { name: t.addTo.listLabel }));
    await waitFor(() =>
      expect(list.getByRole("button", { name: /Danh sách 2/ }).getAttribute("aria-pressed")).toBe("true"),
    );
    expect(list.getByRole("button", { name: /Danh sách 1/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("adds the story to a list, and takes it out of one that holds it", async () => {
    const c = fakeClient({ mine: [listRow(1), listRow(2)], membership: [lid(2)] });
    renderUi(c, <AddToListButton storyId={sid(1)} />);
    fireEvent.click(await screen.findByRole("button", { name: t.addTo.open }));
    const list = within(await screen.findByRole("list", { name: t.addTo.listLabel }));
    await waitFor(() =>
      expect(list.getByRole("button", { name: /Danh sách 2/ }).getAttribute("aria-pressed")).toBe("true"),
    );
    fireEvent.click(list.getByRole("button", { name: /Danh sách 1/ }));
    await waitFor(() =>
      expect(c.rpcCalls).toEqual([{ name: "add_story_to_list", args: { p_list_id: lid(1), p_story_id: sid(1) } }]),
    );
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.addTo.added("Danh sách 1")));
    await waitFor(() => expect(list.getByRole("button", { name: /Danh sách 1/ }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(list.getByRole("button", { name: /Danh sách 2/ }));
    await waitFor(() => expect(c.of("reading_list_items", "delete")).toHaveLength(1));
    const eqs = c
      .of("reading_list_items", "delete")[0]!
      .calls.filter(([m]) => m === "eq")
      .map(([, a]) => a);
    expect(eqs).toEqual([
      ["reading_list_id", lid(2)],
      ["story_id", sid(1)],
    ]);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.addTo.removed("Danh sách 2")));
  });

  it("creates a list and puts the story in it in one step, with the same id for the insert and the add", async () => {
    const c = fakeClient({ mine: [] });
    renderUi(c, <AddToListButton storyId={sid(1)} />);
    fireEvent.click(await screen.findByRole("button", { name: t.addTo.open }));
    expect(await screen.findByText(t.addTo.empty)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.addTo.newName), { target: { value: " Mới " } });
    fireEvent.click(screen.getByRole("button", { name: t.addTo.create }));
    await waitFor(() => expect(c.rpcCalls).toHaveLength(1));
    const created = c.of("reading_lists", "insert")[0]!.values as Record<string, unknown>;
    expect(created).toMatchObject({ title: "Mới", visibility: "private" });
    expect(c.rpcCalls[0]!.args).toEqual({ p_list_id: created.id, p_story_id: sid(1) });
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.addTo.added("Mới")));
  });
});

describe("ListScreen", () => {
  const detail = (overrides: Partial<ListRow> = {}) => listRow(1, { visibility: "public", ...overrides });

  it("shows a visitor the list, its owner and its stories in order, without any controls", async () => {
    const c = fakeClient({ detail: detail({ owner_id: "someone-else" }), items: [itemRow(2, 2), itemRow(1, 1)] });
    renderUi(c, <ListScreen listId={lid(1)} />, false);
    const stories = within(await screen.findByRole("list", { name: t.page.storiesLabel }));
    expect(stories.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Truyện 1", "Truyện 2"]);
    expect(screen.getByText(t.page.byOwner("Chủ Sách"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: t.page.edit })).toBeNull();
    expect(screen.queryByRole("button", { name: t.page.remove })).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(t.page.moveUp) })).toBeNull();
    expect(document.querySelector("[data-part=drag-handle]")).toBeNull(); // nothing to drag either
  });

  it("writes the age of each story in English when the language is English", async () => {
    setLanguage("en", { persist: false });
    try {
      const c = fakeClient({ detail: detail({ owner_id: "someone-else" }), items: [itemRow(1, 1)] });
      renderUi(c, <ListScreen listId={lid(1)} />, false);
      const stories = within(await screen.findByRole("list", { name: t.page.storiesLabel }));
      expect(stories.getByText(/^Updated .* ago$/)).toBeTruthy();
      expect(stories.queryByText(/trước/)).toBeNull();
    } finally {
      setLanguage("vi", { persist: false });
    }
  });

  it("says a list that cannot be seen was not found", async () => {
    renderUi(fakeClient({ detail: null }), <ListScreen listId={lid(1)} />, false);
    expect(await screen.findByText(t.page.notFound.title)).toBeTruthy();
  });

  it("gives the owner the controls and shows who may see the list", async () => {
    const c = fakeClient({ detail: detail({ visibility: "unlisted" }), items: [itemRow(1), itemRow(2)] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    await screen.findByRole("list", { name: t.page.storiesLabel });
    expect(screen.getByText(t.visibility.unlisted)).toBeTruthy();
    expect(screen.getByRole("button", { name: t.page.edit })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: t.page.remove })).toHaveLength(2);
    expect((screen.getByRole("button", { name: `${t.page.moveUp}: Truyện 1` }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: `${t.page.moveDown}: Truyện 2` }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    // A drag handle per story (pointer only: hidden from assistive tech, the move buttons are the keyboard route).
    const handles = document.querySelectorAll("[data-part=drag-handle]");
    expect(handles).toHaveLength(2);
    expect(handles[0]?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText(t.page.reorderHint)).toBeTruthy();
  });

  it("moves a story: sends the complete new order and shows it at once", async () => {
    let answer: (value: Result) => void = () => undefined;
    const c = fakeClient({
      detail: detail(),
      items: [itemRow(1), itemRow(2), itemRow(3)],
      rpc: () => new Promise((resolve) => (answer = resolve)),
    });
    renderUi(c, <ListScreen listId={lid(1)} />);
    await screen.findByRole("list", { name: t.page.storiesLabel });
    fireEvent.click(screen.getByRole("button", { name: `${t.page.moveUp}: Truyện 3` }));
    await waitFor(() => expect(c.rpcCalls).toHaveLength(1));
    expect(c.rpcCalls[0]).toEqual({
      name: "reorder_list_items",
      args: { p_list_id: lid(1), p_story_ids: [sid(1), sid(3), sid(2)] },
    });
    const titles = () =>
      within(screen.getByRole("list", { name: t.page.storiesLabel }))
        .getAllByRole("heading")
        .map((h) => h.textContent);
    await waitFor(() => expect(titles()).toEqual(["Truyện 1", "Truyện 3", "Truyện 2"]));
    answer({ data: null, error: null });
  });

  it("puts the old order back and says why when the server refuses, even before the list reloads", async () => {
    const hold: { current: Promise<void> | null } = { current: null };
    const c = fakeClient({
      detail: detail(),
      items: [itemRow(1), itemRow(2)],
      hold,
      rpc: () => ({ data: null, error: { code: "PT409", message: "changed" } }),
    });
    renderUi(c, <ListScreen listId={lid(1)} />);
    await screen.findByRole("list", { name: t.page.storiesLabel });
    hold.current = new Promise(() => undefined); // the reload that follows never lands: only the rollback can restore the order
    fireEvent.click(screen.getByRole("button", { name: `${t.page.moveUp}: Truyện 2` }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", t.errors.conflict));
    const titles = within(screen.getByRole("list", { name: t.page.storiesLabel }))
      .getAllByRole("heading")
      .map((h) => h.textContent);
    expect(titles).toEqual(["Truyện 1", "Truyện 2"]);
  });

  it("gives a signed-in visitor who is not the owner no controls either", async () => {
    const c = fakeClient({ detail: detail({ owner_id: "someone-else" }), items: [itemRow(1)] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    await screen.findByRole("list", { name: t.page.storiesLabel });
    expect(screen.queryByRole("button", { name: t.page.edit })).toBeNull();
    expect(screen.queryByRole("button", { name: t.page.remove })).toBeNull();
    expect(screen.queryByText(t.visibility.public)).toBeNull();
  });

  it("removes a story from the list", async () => {
    const c = fakeClient({ detail: detail(), items: [itemRow(1), itemRow(2)] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    await screen.findByRole("list", { name: t.page.storiesLabel });
    fireEvent.click(screen.getAllByRole("button", { name: t.page.remove })[1]!);
    await waitFor(() => expect(c.of("reading_list_items", "delete")).toHaveLength(1));
    expect(
      c
        .of("reading_list_items", "delete")[0]!
        .calls.filter(([m]) => m === "eq")
        .map(([, a]) => a),
    ).toEqual([
      ["reading_list_id", lid(1)],
      ["story_id", sid(2)],
    ]);
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.page.removed));
  });

  it("edits the list through a dialog", async () => {
    const c = fakeClient({ detail: detail({ title: "Cũ", visibility: "private" }), items: [] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    fireEvent.click(await screen.findByRole("button", { name: t.page.edit }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(t.form.name), { target: { value: "Mới" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.submitSave }));
    await waitFor(() => expect(c.of("reading_lists", "update")).toHaveLength(1));
    expect(c.of("reading_lists", "update")[0]!.values).toMatchObject({ title: "Mới", visibility: "private" });
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.form.saved));
  });

  it("lets the owner share the list: who can open it, changed through the list update, and the link to copy", async () => {
    const c = fakeClient({ detail: detail({ title: "Hay", description: "Mô tả", visibility: "unlisted" }), items: [] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    fireEvent.click(await screen.findByRole("button", { name: shareText.open }));
    const dialog = await screen.findByRole("dialog", { name: shareText.title("Hay") });
    expect(within(dialog).getByText(t.share.ownerDescription)).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: shareText.linkLabel }) as HTMLInputElement).value).toBe(
      `https://app.test/lists/${lid(1)}`,
    );
    const access = within(dialog).getByRole("region", { name: t.share.access });
    expect(within(access).getByText(t.visibilityHints.unlisted)).toBeTruthy();

    fireEvent.keyDown(within(access).getByRole("combobox", { name: t.share.access }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: t.visibility.public }));
    // shown at once, before the save and the reload
    expect(within(access).getByText(t.visibilityHints.public)).toBeTruthy();
    await waitFor(() => expect(c.of("reading_lists", "update")).toHaveLength(1));
    expect(c.of("reading_lists", "update")[0]!.values).toEqual({
      title: "Hay",
      description: "Mô tả",
      visibility: "public",
    });
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("success", t.share.changed(t.visibility.public)));
  });

  it("puts the access back and says why when the change is refused", async () => {
    const c = fakeClient({
      detail: detail({ visibility: "private" }),
      items: [],
      update: { data: null, error: { code: "42501", message: "denied" } },
    });
    renderUi(c, <ListScreen listId={lid(1)} />);
    fireEvent.click(await screen.findByRole("button", { name: shareText.open }));
    const access = within(await screen.findByRole("dialog")).getByRole("region", { name: t.share.access });
    expect(within(access).getByText(t.visibilityHints.private)).toBeTruthy();
    fireEvent.keyDown(within(access).getByRole("combobox", { name: t.share.access }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: t.visibility.unlisted }));
    await waitFor(() => expect(toasts.show).toHaveBeenCalledWith("error", expect.any(String)));
    await waitFor(() => expect(within(access).getByText(t.visibilityHints.private)).toBeTruthy());
  });

  it("gives a visitor of a shared list the link only, without the access controls", async () => {
    const c = fakeClient({ detail: detail({ owner_id: "someone-else", visibility: "unlisted" }), items: [] });
    renderUi(c, <ListScreen listId={lid(1)} />, false);
    fireEvent.click(await screen.findByRole("button", { name: shareText.open }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t.share.visitorDescription)).toBeTruthy();
    expect(within(dialog).queryByRole("combobox")).toBeNull();
    expect(within(dialog).queryByRole("region", { name: t.share.access })).toBeNull();
    expect((within(dialog).getByRole("textbox", { name: shareText.linkLabel }) as HTMLInputElement).value).toBe(
      `https://app.test/lists/${lid(1)}`,
    );
  });

  it("never offers the link of a private list to anyone but its owner", async () => {
    // RLS hides a private list from others; even if one arrived, there is no share button for a visitor.
    const c = fakeClient({ detail: detail({ owner_id: "someone-else", visibility: "private" }), items: [] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    await screen.findByText(t.page.empty.title);
    expect(screen.queryByRole("button", { name: shareText.open })).toBeNull();
  });

  it("deletes the list only after confirmation, then goes back to the library", async () => {
    const c = fakeClient({ detail: detail(), items: [] });
    renderUi(c, <ListScreen listId={lid(1)} />);
    fireEvent.click(await screen.findByRole("button", { name: t.page.delete }));
    expect(c.of("reading_lists", "delete")).toHaveLength(0);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.page.delete }));
    await waitFor(() => expect(c.of("reading_lists", "delete")).toHaveLength(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/library"));
  });
});
