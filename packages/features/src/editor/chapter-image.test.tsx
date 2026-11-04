import { Editor } from "@tiptap/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidStorageKey } from "@storynest/utils";
import { chapterBodySchema } from "@storynest/validation";
import type { DataClient } from "../_shared/client.ts";
import { AppError } from "../_shared/errors.ts";
import { ImageError, type PreparedImage } from "../_shared/image-prepare.ts";
import { uploadChapterImage } from "./api/images.api.ts";
import { EditorToolbar } from "./components/editor-toolbar.tsx";
import { NODE, STORAGE_KEY_ATTRIBUTE, bodyToDoc, docToBody, type EditorNode } from "./model/body-converter.ts";
import { editorExtensions } from "./model/extensions.ts";
import { imageErrorMessage } from "./model/image-messages.ts";
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

const STORY = "5eed0000-0000-4000-8000-00000000b00a";
const t = editorText.toolbar;
const prepared: PreparedImage = {
  blob: new Blob(["x"], { type: "image/webp" }),
  contentType: "image/webp",
  extension: "webp",
};
const editors: Editor[] = [];
afterEach(() => {
  cleanup();
  editors.splice(0).forEach((e) => e.destroy());
});

function fakeClient(uploadError: { message: string; statusCode: string } | null = null) {
  const upload = vi.fn(async () => ({ data: null, error: uploadError }));
  const from = vi.fn(() => ({ upload }));
  return { client: { storage: { from } } as unknown as DataClient, upload, from };
}

describe("uploadChapterImage", () => {
  it("uploads into the story's folder of the chapter-images bucket under a generated name", async () => {
    const { client, upload, from } = fakeClient();
    const key = await uploadChapterImage(client, STORY, prepared);
    expect(from).toHaveBeenCalledWith("chapter-images");
    expect(isValidStorageKey(key, STORY)).toBe(true);
    expect(key.endsWith(".webp")).toBe(true);
    expect(upload).toHaveBeenCalledWith(key, prepared.blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  });

  it.each([
    ["403", "forbidden"],
    ["401", "unauthenticated"],
    ["413", "invalid"],
    ["415", "invalid"],
  ])("maps a %s answer to %s", async (statusCode, kind) => {
    const { client } = fakeClient({ message: "no", statusCode });
    await expect(uploadChapterImage(client, STORY, prepared)).rejects.toMatchObject({ kind });
  });
});

describe("imageErrorMessage", () => {
  it("explains a file the browser could not use, the server's refusal and a missing permission", () => {
    expect(imageErrorMessage(new ImageError("type"))).toBe(t.imageErrors.type);
    expect(imageErrorMessage(new ImageError("tooLarge"))).toBe(t.imageErrors.tooLarge);
    expect(imageErrorMessage(new ImageError("unreadable"))).toBe(t.imageErrors.unreadable);
    expect(imageErrorMessage(new AppError("invalid", "x"))).toBe(t.imageErrors.rejected);
    expect(imageErrorMessage(new AppError("forbidden", "x"))).toBe(t.imageErrors.forbidden);
    expect(imageErrorMessage(new AppError("network", "x"))).toBe(t.imageErrors.network);
    expect(imageErrorMessage(new Error("boom"))).toBe(t.imageErrors.generic);
  });
});

describe("the picture block in the editor", () => {
  const KEY = `${STORY}/p.webp`;
  const make = (imageUrl?: (key: string) => string | null) => {
    const editor = new Editor({
      extensions: editorExtensions(imageUrl ? { imageUrl } : {}),
      content: bodyToDoc([
        { block_id: "b0000000-0000-4000-8000-000000000001", type: "paragraph", text: "Trước" },
        { block_id: "b0000000-0000-4000-8000-000000000002", type: "image", image_storage_key: KEY },
      ]),
    });
    editors.push(editor);
    return editor;
  };

  it("shows the picture from the address the resolver gives", () => {
    const editor = make((key) => `https://x.test/chapter-images/${key}`);
    expect(editor.view.dom.querySelector("figure img")?.getAttribute("src")).toBe(
      `https://x.test/chapter-images/${KEY}`,
    );
  });

  it("shows an empty frame, and still keeps the key, when there is no resolver or no address", () => {
    for (const editor of [make(), make(() => null)]) {
      expect(editor.view.dom.querySelector("figure img")).toBeNull();
      expect(editor.view.dom.querySelector("figure")?.getAttribute("data-storage-key")).toBe(KEY);
    }
  });

  it("an inserted picture becomes a valid image block with its own id, and the text around it stays", () => {
    const editor = make(() => null);
    const key = `${STORY}/new.webp`;
    editor.commands.focus("start");
    editor.commands.insertContent({ type: NODE.image, attrs: { [STORAGE_KEY_ATTRIBUTE]: key } });
    const body = docToBody(editor.getJSON() as EditorNode);
    expect(chapterBodySchema.safeParse(body).success).toBe(true);
    const images = body.filter((b) => b.type === "image");
    expect(images.map((b) => b.type === "image" && b.image_storage_key).sort()).toEqual([KEY, key].sort());
    expect(new Set(body.map((b) => b.block_id)).size).toBe(body.length);
    expect(body.some((b) => b.type === "paragraph" && b.text === "Trước")).toBe(true);
  });
});

describe("the picture button", () => {
  const editor = () => {
    const e = new Editor({ extensions: editorExtensions(), content: bodyToDoc([]) });
    editors.push(e);
    return e;
  };

  it("hands the picked file over, and offers nothing when the screen cannot upload", () => {
    const onImage = vi.fn();
    const { rerender } = render(<EditorToolbar editor={editor()} onImage={onImage} />);
    expect(screen.getByRole("button", { name: t.image })).toBeTruthy();
    const file = new File(["x"], "me.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(t.imageInput), { target: { files: [file] } });
    expect(onImage).toHaveBeenCalledWith(file);

    rerender(<EditorToolbar editor={editor()} />);
    expect(screen.queryByRole("button", { name: t.image })).toBeNull();
    expect(screen.queryByLabelText(t.imageInput)).toBeNull();
  });

  it("is disabled while a picture uploads", () => {
    render(<EditorToolbar editor={editor()} onImage={vi.fn()} imageBusy />);
    expect((screen.getByRole("button", { name: t.imageUploading }) as HTMLButtonElement).disabled).toBe(true);
  });
});
