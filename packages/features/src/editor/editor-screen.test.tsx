import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { getChapterDraft, saveChapterDraft } from "./api/draft.api.ts";
import { ChapterEditorScreen } from "./index.ts";
import { editorText } from "./strings.ts";

// jsdom has no layout: ProseMirror measures the selection with these when it scrolls it into view.
const noRects = { length: 0, item: () => null, [Symbol.iterator]: function* () {} };
const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
for (const proto of [Element.prototype, Range.prototype] as {
  getClientRects?: unknown;
  getBoundingClientRect?: unknown;
}[]) {
  proto.getClientRects ??= () => noRects;
  proto.getBoundingClientRect ??= () => zeroRect;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

const t = editorText;
const STORY_ID = "5eed0000-0000-4000-8000-00000000d001";
const CHAPTER_ID = "c0000000-0000-4000-8000-000000000001";
const bid = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BODY = [
  { block_id: bid(1), type: "heading", text: "Mở đầu" },
  { block_id: bid(2), type: "paragraph", text: "Một hai ba" },
];

type Result = { data: unknown; error: unknown };
type Call = [string, unknown[]];

function fakeClient(options: { draft?: Record<string, unknown> | null; updateRows?: (calls: Call[]) => Result }) {
  const updates: { values: unknown; calls: Call[] }[] = [];
  const draftRow =
    options.draft === undefined
      ? { chapter_id: CHAPTER_ID, title: "Chương một", body: BODY, revision: 3, chapter: { story_id: STORY_ID } }
      : options.draft;
  const from = vi.fn(() => {
    const calls: Call[] = [];
    let updating: unknown;
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, args]);
        return builder;
      };
    }
    builder.update = (values: unknown) => {
      updating = values;
      updates.push({ values, calls });
      return builder;
    };
    builder.maybeSingle = () => Promise.resolve({ data: draftRow, error: null });
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve(
        updating !== undefined
          ? (options.updateRows?.(calls) ?? { data: [{ revision: 0 }], error: null })
          : { data: null, error: null },
      );
    return builder;
  });
  return { from, updates };
}

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _r, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function setup(t1: ReturnType<typeof fakeClient>, strict = false) {
  const editor: { current: Editor | null } = { current: null };
  const Wrapper = strict ? StrictMode : ({ children }: { children: React.ReactNode }) => <>{children}</>;
  render(
    <Wrapper>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DataProvider client={withAuth(t1, testSession())}>
          <AuthProvider>
            <PlatformProvider adapter={adapter}>
              <ToastProvider port={toasts}>
                <ChapterEditorScreen storyId={STORY_ID} chapterId={CHAPTER_ID} onEditor={(e) => (editor.current = e)} />
              </ToastProvider>
            </PlatformProvider>
          </AuthProvider>
        </DataProvider>
      </QueryClientProvider>
    </Wrapper>,
  );
  return editor;
}

const editorReady = (editor: { current: Editor | null }) => waitFor(() => expect(editor.current).not.toBeNull());
const clickSave = () => fireEvent.click(screen.getByRole("button", { name: t.save }));

describe("draft api", () => {
  it("returns null when the draft is hidden, and refuses a body it cannot represent instead of opening it", async () => {
    const hidden = fakeClient({ draft: null });
    expect(await getChapterDraft(hidden as unknown as DataClient, CHAPTER_ID)).toBeNull();

    const broken = fakeClient({
      draft: {
        chapter_id: CHAPTER_ID,
        title: "x",
        body: [{ type: "mystery" }],
        revision: 1,
        chapter: { story_id: STORY_ID },
      },
    });
    await expect(getChapterDraft(broken as unknown as DataClient, CHAPTER_ID)).rejects.toMatchObject({
      kind: "invalid",
    });
  });

  it("accepts the empty body of a new chapter and the embed as object or array", async () => {
    const empty = fakeClient({
      draft: { chapter_id: CHAPTER_ID, title: "x", body: [], revision: 1, chapter: [{ story_id: STORY_ID }] },
    });
    expect(await getChapterDraft(empty as unknown as DataClient, CHAPTER_ID)).toMatchObject({
      body: [],
      revision: 1,
      storyId: STORY_ID,
    });
  });

  it("saves against the revision it was based on and reports the new one; a stale revision is a conflict", async () => {
    const ok = fakeClient({});
    const client = ok as unknown as DataClient;
    const revision = await saveChapterDraft(client, TEST_USER_ID, {
      chapterId: CHAPTER_ID,
      title: "T",
      body: BODY as never,
      expectedRevision: 3,
    });
    expect(revision).toBe(4);
    expect(ok.updates[0]?.values).toMatchObject({ title: "T", revision: 4, updated_by: TEST_USER_ID });
    expect(ok.updates[0]?.calls).toContainEqual(["eq", ["revision", 3]]);
    expect(ok.updates[0]?.calls).toContainEqual(["eq", ["chapter_id", CHAPTER_ID]]);

    const stale = fakeClient({ updateRows: () => ({ data: [], error: null }) });
    await expect(
      saveChapterDraft(stale as unknown as DataClient, TEST_USER_ID, {
        chapterId: CHAPTER_ID,
        title: "T",
        body: BODY as never,
        expectedRevision: 3,
      }),
    ).rejects.toMatchObject({ kind: "conflict" });
  });

  it("never sends a body that breaks the contract", async () => {
    const t1 = fakeClient({});
    await expect(
      saveChapterDraft(t1 as unknown as DataClient, TEST_USER_ID, {
        chapterId: CHAPTER_ID,
        title: "T",
        body: [] as never,
        expectedRevision: 1,
      }),
    ).rejects.toBeDefined();
    expect(t1.updates).toEqual([]);
  });
});

describe("ChapterEditorScreen", () => {
  it("opens the draft: title, text, word count and a toolbar for what a chapter can hold", async () => {
    const editor = setup(fakeClient({}));
    expect(((await screen.findByLabelText(t.chapterTitle)) as HTMLInputElement).value).toBe("Chương một");
    await editorReady(editor);
    expect(screen.getByText("Một hai ba")).toBeTruthy();
    expect(screen.getByText(new RegExp(t.words("5")))).toBeTruthy(); // "Mở đầu" (2 words) + "Một hai ba" (3)
  });

  it("offers formatting for bold, italic, underline, strike, heading, divider, a picture, undo and redo only", async () => {
    setup(fakeClient({}));
    const toolbar = await screen.findByRole("toolbar", { name: t.toolbar.label });
    const labels = Array.from(toolbar.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual([
      t.toolbar.heading,
      t.toolbar.bold,
      t.toolbar.italic,
      t.toolbar.underline,
      t.toolbar.strike,
      t.toolbar.divider,
      t.toolbar.image,
      t.toolbar.undo,
      t.toolbar.redo,
    ]);
  });

  it("saves the body with the editor's block ids against the current revision and then the next one", async () => {
    const t1 = fakeClient({});
    const editor = setup(t1);
    await editorReady(editor);
    act(() => {
      editor.current?.commands.setTextSelection(editor.current.state.doc.content.size - 1);
      editor.current?.commands.insertContent(" bốn");
    });
    expect(await screen.findByText(new RegExp(t.unsaved))).toBeTruthy();
    clickSave();
    await waitFor(() => expect(t1.updates).toHaveLength(1));
    const first = t1.updates[0]!;
    expect(first.calls).toContainEqual(["eq", ["revision", 3]]);
    const body = (first.values as { body: { block_id: string; type: string; text?: string }[] }).body;
    expect(body.map((b) => b.block_id)).toEqual([bid(1), bid(2)]); // ids survive an edit
    expect(body[1]?.text).toBe("Một hai ba bốn");
    expect(toasts.show).toHaveBeenCalledWith("success", t.saved);
    await waitFor(() => expect(screen.queryByText(new RegExp(t.unsaved))).toBeNull());

    act(() => void editor.current?.commands.insertContent("!"));
    clickSave();
    await waitFor(() => expect(t1.updates).toHaveLength(2));
    expect(t1.updates[1]?.calls).toContainEqual(["eq", ["revision", 4]]); // the second save is based on the first
  });

  it("does not send an empty title and says why", async () => {
    const t1 = fakeClient({});
    setup(t1);
    fireEvent.change(await screen.findByLabelText(t.chapterTitle), { target: { value: "   " } });
    clickSave();
    expect(await screen.findByText(t.validation.titleRequired)).toBeTruthy();
    expect(t1.updates).toEqual([]);
  });

  it("on a conflict it keeps the author's text on screen, explains, and reloads the saved draft only when asked", async () => {
    const t1 = fakeClient({ updateRows: () => ({ data: [], error: null }) });
    const editor = setup(t1);
    await editorReady(editor);
    act(() => void editor.current?.commands.insertContent("Của tôi"));
    clickSave();
    expect(await screen.findByText(t.conflict.title)).toBeTruthy();
    expect(editor.current?.getText()).toContain("Của tôi"); // nothing was thrown away
    fireEvent.click(screen.getByRole("button", { name: t.conflict.reload }));
    await waitFor(() => expect(screen.queryByText(t.conflict.title)).toBeNull());
    await waitFor(() => expect(editor.current?.getText()).not.toContain("Của tôi"));
  });

  it("opens an empty draft as one empty paragraph and saves it", async () => {
    const t1 = fakeClient({
      draft: { chapter_id: CHAPTER_ID, title: "Mới", body: [], revision: 1, chapter: { story_id: STORY_ID } },
    });
    const editor = setup(t1);
    await editorReady(editor);
    clickSave();
    await waitFor(() => expect(t1.updates).toHaveLength(1));
    const body = (t1.updates[0]?.values as { body: { type: string; text: string }[] }).body;
    expect(body).toEqual([expect.objectContaining({ type: "paragraph", text: "" })]);
  });

  it("explains a draft it cannot read instead of opening (and later overwriting) it", async () => {
    setup(
      fakeClient({
        draft: {
          chapter_id: CHAPTER_ID,
          title: "x",
          body: [{ type: "mystery" }],
          revision: 1,
          chapter: { story_id: STORY_ID },
        },
      }),
    );
    expect(await screen.findByText(t.cannotOpen.title)).toBeTruthy();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("shows not found for a hidden draft and for a chapter that belongs to another story", async () => {
    setup(fakeClient({ draft: null }));
    expect(await screen.findByText(t.notFound.title)).toBeTruthy();
    cleanup();
    setup(
      fakeClient({
        draft: {
          chapter_id: CHAPTER_ID,
          title: "x",
          body: BODY,
          revision: 1,
          chapter: { story_id: "5eed0000-0000-4000-8000-0000000000ff" },
        },
      }),
    );
    expect(await screen.findByText(t.notFound.title)).toBeTruthy();
  });
});

describe("autosave and recovery", () => {
  const type = (editor: { current: Editor | null }, text: string) =>
    act(() => void editor.current?.commands.insertContent(text));
  const backupKey = `storynest.draftBackup.${CHAPTER_ID}`;

  it("saves by itself after a pause, quietly, against the current revision", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const t1 = fakeClient({});
    const editor = setup(t1);
    await editorReady(editor);
    toasts.show.mockClear();
    type(editor, " thêm");
    await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
    expect(t1.updates).toHaveLength(0); // still inside the pause
    await act(async () => void (await vi.advanceTimersByTimeAsync(800)));
    expect(t1.updates).toHaveLength(1);
    expect(t1.updates[0]?.calls).toContainEqual(["eq", ["revision", 3]]);
    expect(await screen.findByText(new RegExp(t.status.saved))).toBeTruthy();
    expect(toasts.show).not.toHaveBeenCalled(); // background saves do not pop toasts
  });

  it("still autosaves under React Strict Mode (effects run, are cleaned up and run again on the same component)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const t1 = fakeClient({});
    const editor = setup(t1, true);
    await editorReady(editor);
    type(editor, " strict");
    await act(async () => void (await vi.advanceTimersByTimeAsync(2300)));
    expect(t1.updates).toHaveLength(1);
  });

  it("when the connection fails it keeps the text, says so, retries, and finishes without the author doing anything", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let attempts = 0;
    const t1 = fakeClient({
      updateRows: () => {
        attempts += 1;
        return attempts === 1
          ? { data: null, error: { message: "Failed to fetch", name: "TypeError" } }
          : { data: [{ revision: 4 }], error: null };
      },
    });
    const editor = setup(t1);
    await editorReady(editor);
    type(editor, " ngoại tuyến");
    await act(async () => void (await vi.advanceTimersByTimeAsync(2100)));
    expect(await screen.findByText(new RegExp(t.status.error))).toBeTruthy();
    expect(editor.current?.getText()).toContain("ngoại tuyến");
    expect(window.localStorage.getItem(backupKey)).toContain("ngoại tuyến"); // a copy on this device meanwhile
    await act(async () => void (await vi.advanceTimersByTimeAsync(2200)));
    expect(t1.updates).toHaveLength(2);
    expect(await screen.findByText(new RegExp(t.status.saved))).toBeTruthy();
    await waitFor(() => expect(window.localStorage.getItem(backupKey)).toBeNull()); // saved: the copy is not needed
  });

  it("retries at once when the browser reports it is back online", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let attempts = 0;
    const t1 = fakeClient({
      updateRows: () => {
        attempts += 1;
        return attempts === 1
          ? { data: null, error: { message: "Failed to fetch", name: "TypeError" } }
          : { data: [{ revision: 4 }], error: null };
      },
    });
    const editor = setup(t1);
    await editorReady(editor);
    type(editor, "x");
    await act(async () => void (await vi.advanceTimersByTimeAsync(2100)));
    await screen.findByText(new RegExp(t.status.error));
    act(() => void window.dispatchEvent(new Event("online")));
    await act(async () => void (await vi.advanceTimersByTimeAsync(50)));
    expect(t1.updates).toHaveLength(2);
  });

  it("warns before leaving while there is unsaved text, and not once it is saved", async () => {
    const t1 = fakeClient({});
    const editor = setup(t1);
    await editorReady(editor);
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false); // nothing typed
    type(editor, " chưa lưu");
    expect(leave()).toBe(true);
    clickSave();
    await waitFor(() => expect(t1.updates).toHaveLength(1));
    await waitFor(() => expect(leave()).toBe(false));
  });

  it("saves as soon as the tab is hidden instead of waiting for the pause", async () => {
    const t1 = fakeClient({});
    const editor = setup(t1);
    await editorReady(editor);
    type(editor, " ẩn tab");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(t1.updates).toHaveLength(1));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("offers an unsaved copy from this device and restores it as the new text, which then autosaves", async () => {
    window.localStorage.setItem(
      backupKey,
      JSON.stringify({
        baseRevision: 3,
        title: "Tên đã gõ",
        body: [{ block_id: bid(1), type: "paragraph", text: "Chữ chưa kịp lưu" }],
        savedAt: new Date().toISOString(),
      }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const t1 = fakeClient({});
    const editor = setup(t1);
    expect(await screen.findByText(t.backup.title)).toBeTruthy();
    await editorReady(editor);
    fireEvent.click(screen.getByRole("button", { name: t.backup.restore }));
    expect(editor.current?.getText()).toContain("Chữ chưa kịp lưu");
    expect((screen.getByLabelText(t.chapterTitle) as HTMLInputElement).value).toBe("Tên đã gõ");
    expect(screen.queryByText(t.backup.title)).toBeNull();
    await act(async () => void (await vi.advanceTimersByTimeAsync(2200)));
    expect(t1.updates).toHaveLength(1);
    expect(t1.updates[0]?.values).toMatchObject({ title: "Tên đã gõ" });
  });

  it("warns when the unsaved copy was written on an older revision, and can be discarded", async () => {
    window.localStorage.setItem(
      backupKey,
      JSON.stringify({
        baseRevision: 1,
        title: "Cũ",
        body: [{ block_id: bid(1), type: "paragraph", text: "bản cũ" }],
        savedAt: new Date().toISOString(),
      }),
    );
    setup(fakeClient({}));
    expect(await screen.findByText(new RegExp(t.backup.olderBase))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t.backup.discard }));
    expect(screen.queryByText(t.backup.title)).toBeNull();
    expect(window.localStorage.getItem(backupKey)).toBeNull();
  });

  it("does not bother the author with a copy identical to what the server has", async () => {
    window.localStorage.setItem(
      backupKey,
      JSON.stringify({ baseRevision: 3, title: "Chương một", body: BODY, savedAt: new Date().toISOString() }),
    );
    setup(fakeClient({}));
    await screen.findByLabelText(t.chapterTitle);
    expect(screen.queryByText(t.backup.title)).toBeNull();
  });

  it("after a conflict the author's text is kept on this device and offered back after reloading", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const t1 = fakeClient({ updateRows: () => ({ data: [], error: null }) });
    const editor = setup(t1);
    await editorReady(editor);
    type(editor, " bản của tôi");
    await act(async () => void (await vi.advanceTimersByTimeAsync(600))); // the periodic copy is written
    window.localStorage.clear(); // ...and lost: the conflict itself must write one again
    await act(async () => void (await vi.advanceTimersByTimeAsync(1600)));
    expect(await screen.findByText(t.conflict.title)).toBeTruthy();
    expect(window.localStorage.getItem(backupKey)).toContain("bản của tôi");
    expect(t1.updates).toHaveLength(1);
    await act(async () => void (await vi.advanceTimersByTimeAsync(30_000)));
    expect(t1.updates).toHaveLength(1); // a conflict is not retried in the background

    fireEvent.click(screen.getByRole("button", { name: t.conflict.reload }));
    expect(await screen.findByText(t.backup.title)).toBeTruthy(); // my version is offered on top of the fresh draft
  });
});

describe("server/client boundary", () => {
  it('queries.ts must not be a "use client" module, the hook must be', () => {
    expect(readFileSync("src/editor/queries.ts", "utf8")).not.toMatch(/^\s*["']use client["']/m);
    expect(readFileSync("src/editor/hooks/use-chapter-draft.ts", "utf8")).toMatch(/^"use client"/);
  });
});
