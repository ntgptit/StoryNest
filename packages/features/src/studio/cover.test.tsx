import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidStorageKey } from "@storynest/utils";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import type { ImageRenderer, PreparedImage } from "../_shared/image-prepare.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { formatBytes } from "../_shared/use-image-sizes.ts";
import { currentLocale } from "../_shared/i18n.ts";
import { removeCover, uploadCover } from "./api/story-write.api.ts";
import { CoverEditor } from "./components/cover-editor.tsx";
import { studioText } from "./strings.ts";

afterEach(cleanup);

const STORY = "5eed0000-0000-4000-8000-00000000b00a";
const OLD_KEY = `${STORY}/old.webp`;
const prepared: PreparedImage = {
  blob: new Blob(["x"], { type: "image/webp" }),
  contentType: "image/webp",
  extension: "webp",
};
const t = studioText.form.cover;

interface Options {
  uploadError?: { message: string; statusCode: string } | null;
  updateError?: { code: string; message: string } | null;
  matchedRows?: number;
}

/** Records the order of storage and table calls, so "upload, save, then remove the old one" can be asserted. */
function fakeClient(options: Options = {}) {
  const calls: string[] = [];
  const buckets: string[] = [];
  const bucket = {
    upload: vi.fn(async (key: string) => {
      calls.push(`upload ${key}`);
      return { data: null, error: options.uploadError ?? null };
    }),
    remove: vi.fn(async (keys: string[]) => {
      calls.push(`remove ${keys.join(",")}`);
      return { data: [], error: null };
    }),
    getPublicUrl: (key: string) => ({ data: { publicUrl: `https://x.test/storage/v1/object/public/covers/${key}` } }),
  };
  const update = vi.fn((values: { cover_storage_key: string | null }) => {
    calls.push(`save ${values.cover_storage_key ?? "null"}`);
    return {
      eq: () => ({
        select: async () => ({
          data: options.updateError ? null : Array.from({ length: options.matchedRows ?? 1 }, () => ({ id: STORY })),
          error: options.updateError ?? null,
        }),
      }),
    };
  });
  const client = {
    from: vi.fn(() => ({ update })),
    storage: {
      from: vi.fn((name: string) => {
        buckets.push(name);
        return bucket;
      }),
    },
  } as unknown as DataClient;
  return { client, calls, bucket, buckets };
}

describe("uploadCover", () => {
  it("uploads into the story's folder of the covers bucket under a generated name, saves it, then removes the old file", async () => {
    const { client, calls, bucket, buckets } = fakeClient();
    const key = await uploadCover(client, { id: STORY, coverStorageKey: OLD_KEY }, prepared);
    expect(isValidStorageKey(key, STORY)).toBe(true);
    expect(key.endsWith(".webp")).toBe(true);
    expect(new Set(buckets)).toEqual(new Set(["covers"]));
    expect(calls).toEqual([`upload ${key}`, `save ${key}`, `remove ${OLD_KEY}`]);
    expect(bucket.upload).toHaveBeenCalledWith(key, prepared.blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  });

  it("removes nothing when there was no cover before", async () => {
    const { client, calls } = fakeClient();
    await uploadCover(client, { id: STORY, coverStorageKey: null }, prepared);
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["upload", "save"]);
  });

  it("keeps the old cover when the upload is refused", async () => {
    const { client, calls } = fakeClient({ uploadError: { message: "too big", statusCode: "413" } });
    await expect(uploadCover(client, { id: STORY, coverStorageKey: OLD_KEY }, prepared)).rejects.toMatchObject({
      kind: "invalid",
    });
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["upload"]);
  });

  it("removes the new object and keeps the old one when the story cannot be saved", async () => {
    const { client, calls } = fakeClient({ updateError: { code: "23514", message: "check" } });
    await expect(uploadCover(client, { id: STORY, coverStorageKey: OLD_KEY }, prepared)).rejects.toMatchObject({
      kind: "invalid",
    });
    const uploaded = calls[0]?.replace("upload ", "");
    expect(calls).toEqual([`upload ${uploaded}`, `save ${uploaded}`, `remove ${uploaded}`]);
  });

  it("treats a story that no row matched as not found and cleans up", async () => {
    const { client, calls } = fakeClient({ matchedRows: 0 });
    await expect(uploadCover(client, { id: STORY, coverStorageKey: OLD_KEY }, prepared)).rejects.toMatchObject({
      kind: "notFound",
    });
    expect(calls.at(-1)).toMatch(/^remove /);
    expect(calls.at(-1)).not.toContain(OLD_KEY);
  });

  it("a forbidden upload is reported as forbidden", async () => {
    const { client } = fakeClient({ uploadError: { message: "violates row-level security", statusCode: "403" } });
    await expect(uploadCover(client, { id: STORY, coverStorageKey: null }, prepared)).rejects.toMatchObject({
      kind: "forbidden",
    });
  });
});

describe("removeCover", () => {
  it("clears the story first, then deletes the file", async () => {
    const { client, calls } = fakeClient();
    await removeCover(client, { id: STORY, coverStorageKey: OLD_KEY });
    expect(calls).toEqual(["save null", `remove ${OLD_KEY}`]);
  });
});

describe("formatBytes", () => {
  it("shows kilobytes below a megabyte and megabytes with one decimal above, in the reader's language", () => {
    expect(formatBytes(84_000, "en")).toBe("84 kB");
    expect(formatBytes(400, "en")).toBe("1 kB");
    expect(formatBytes(3_240_000, "en")).toBe("3.2 MB");
    expect(formatBytes(3_240_000, "vi")).toBe("3,2 MB");
  });
});

describe("CoverEditor", () => {
  /** jsdom has no image decoder nor object URLs: a picked file decodes as a 1200 x 600 picture. */
  let revoke: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    revoke = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 1200, height: 600, close: () => {} })),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:picked");
    URL.revokeObjectURL = revoke as unknown as typeof URL.revokeObjectURL;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  const confirmCrop = async () => fireEvent.click(await screen.findByRole("button", { name: t.crop.confirm }));

  function setup(coverStorageKey: string | null, renderer: ImageRenderer, client: DataClient) {
    const toast = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider client={client}>
          <ToastProvider port={{ show: toast }}>
            <CoverEditor story={{ id: STORY, coverStorageKey }} title="Rừng sương mù" render={renderer} />
          </ToastProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    return { toast };
  }
  const choose = (file: File) => fireEvent.change(screen.getByLabelText(t.inputLabel), { target: { files: [file] } });

  it("opens a 2:3 crop editor on pick, then uploads the chosen part and says so", async () => {
    const { client, calls } = fakeClient();
    const renderer = vi.fn<ImageRenderer>(async () => prepared);
    const { toast } = setup(null, renderer, client);
    choose(new File(["x"], "me.png", { type: "image/png" }));
    const frame = await screen.findByRole("application", { name: t.crop.frame });
    expect(frame.style.aspectRatio).toMatch(/^0\.666/); // the 2:3 frame
    expect(calls).toEqual([]);
    fireEvent.change(screen.getByRole("slider", { name: t.crop.zoom }), { target: { value: "200" } });
    await confirmCrop();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["upload", "save"]);
    expect(renderer).toHaveBeenCalledWith(expect.any(File), { x: 500, y: 150, width: 200, height: 300 });
    expect(revoke).toHaveBeenCalledWith("blob:picked");
  });

  it("veils the cover while uploading, then shows the original and the uploaded size", async () => {
    const { client } = fakeClient();
    let finish: (value: PreparedImage) => void = () => {};
    const small: PreparedImage = { ...prepared, blob: new Blob(["y".repeat(84_000)], { type: "image/webp" }) };
    const renderer = vi.fn<ImageRenderer>(() => new Promise((resolve) => (finish = resolve)));
    const { toast } = setup(null, renderer, client);
    choose(new File(["x".repeat(2_400_000)], "me.png", { type: "image/png" }));
    await confirmCrop();
    await waitFor(() =>
      expect(document.querySelector('[data-slot="upload-veil"]')?.getAttribute("data-busy")).toBe("true"),
    );
    finish(small);
    await waitFor(() => expect(toast).toHaveBeenCalled());
    const locale = currentLocale();
    expect(document.querySelector('[data-slot="upload-veil"]')?.getAttribute("data-busy")).toBeNull();
    expect(
      screen.getByText(t.size.summary(formatBytes(2_400_000, locale), formatBytes(84_000, locale), 97)),
    ).toBeTruthy();
    // A new pick hides the old numbers.
    choose(new File(["x"], "again.png", { type: "image/png" }));
    await screen.findByRole("application", { name: t.crop.frame });
    expect(document.querySelector('[data-slot="size-shrink"]')).toBeNull();
  });

  it("uploads nothing when the crop is cancelled", async () => {
    const { client, calls } = fakeClient();
    const renderer = vi.fn<ImageRenderer>(async () => prepared);
    setup(null, renderer, client);
    choose(new File(["x"], "me.png", { type: "image/png" }));
    fireEvent.click(await screen.findByRole("button", { name: t.crop.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(revoke).toHaveBeenCalledWith("blob:picked");
    expect(renderer).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it("shows the current cover from the public address", () => {
    const { client } = fakeClient();
    setup(OLD_KEY, async () => prepared, client);
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      `https://x.test/storage/v1/object/public/covers/${OLD_KEY}`,
    );
  });

  it("shows why a wrong file was refused, and uploads nothing", async () => {
    const { client, calls } = fakeClient();
    setup(null, async () => prepared, client);
    choose(new File(["x"], "me.gif", { type: "image/gif" }));
    expect((await screen.findByRole("alert")).textContent).toBe(t.errors.type);
    expect(calls).toEqual([]);
  });

  it("offers Remove only when there is a cover, and removes it", async () => {
    const none = fakeClient();
    setup(null, async () => prepared, none.client);
    expect(screen.queryByRole("button", { name: t.remove })).toBeNull();
    cleanup();

    const some = fakeClient();
    const { toast } = setup(OLD_KEY, async () => prepared, some.client);
    fireEvent.click(screen.getByRole("button", { name: t.remove }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(some.calls).toEqual(["save null", `remove ${OLD_KEY}`]);
  });

  it("explains a refusal by the server", async () => {
    const { client } = fakeClient({ uploadError: { message: "mime type not allowed", statusCode: "415" } });
    setup(null, async () => prepared, client);
    choose(new File(["x"], "me.png", { type: "image/png" }));
    await confirmCrop();
    expect((await screen.findByRole("alert")).textContent).toBe(t.errors.rejected);
  });

  it("explains a missing permission", async () => {
    const { client } = fakeClient({ uploadError: { message: "violates row-level security", statusCode: "403" } });
    setup(null, async () => prepared, client);
    choose(new File(["x"], "me.png", { type: "image/png" }));
    await confirmCrop();
    expect((await screen.findByRole("alert")).textContent).toBe(t.errors.forbidden);
  });
});
