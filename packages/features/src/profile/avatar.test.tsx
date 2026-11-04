import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidStorageKey } from "@storynest/utils";
import type { Profile } from "../_shared/auth.tsx";
import { useAvatarUrl } from "../_shared/avatar.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { ToastProvider } from "../_shared/toast.tsx";
import { removeAvatar, uploadAvatar } from "./api/profile.api.ts";
import { AvatarEditor } from "./components/avatar-editor.tsx";
import {
  AVATAR_MAX_INPUT_BYTES,
  AVATAR_SIZE,
  AvatarError,
  outputSide,
  prepareAvatar,
  squareCrop,
  type AvatarRenderer,
  type PreparedAvatar,
} from "./model/avatar-image.ts";
import { profileText } from "./strings.ts";

afterEach(cleanup);

const USER = "5eed0000-0000-4000-8000-0000000000a1";
const OLD_KEY = `${USER}/old.webp`;
const prepared: PreparedAvatar = {
  blob: new Blob(["x"], { type: "image/webp" }),
  contentType: "image/webp",
  extension: "webp",
};
const profileOf = (key: string | null): Profile => ({
  id: USER,
  username: "reader",
  display_name: "Người Đọc",
  bio: null,
  avatar_storage_key: key,
  account_status: "active",
});

interface Options {
  uploadError?: { message: string; statusCode: string } | null;
  updateError?: { code: string; message: string } | null;
}

/** Records the order of storage and table calls, so "upload, save, then remove the old one" can be asserted. */
function fakeClient(options: Options = {}) {
  const calls: string[] = [];
  const bucket = {
    upload: vi.fn(async (key: string) => {
      calls.push(`upload ${key}`);
      return { data: null, error: options.uploadError ?? null };
    }),
    remove: vi.fn(async (keys: string[]) => {
      calls.push(`remove ${keys.join(",")}`);
      return { data: [], error: null };
    }),
    getPublicUrl: (key: string) => ({ data: { publicUrl: `https://x.test/storage/v1/object/public/avatars/${key}` } }),
  };
  const update = vi.fn((values: { avatar_storage_key: string | null }) => {
    calls.push(`save ${values.avatar_storage_key ?? "null"}`);
    return {
      eq: () => ({
        select: () => ({
          single: async () => ({
            data: options.updateError ? null : profileOf(values.avatar_storage_key),
            error: options.updateError ?? null,
          }),
        }),
      }),
    };
  });
  const from = vi.fn(() => ({ update }));
  const storageFrom = vi.fn(() => bucket);
  const client = { from, storage: { from: storageFrom } } as unknown as DataClient;
  return { client, calls, bucket, update, storageFrom };
}

describe("squareCrop / outputSide", () => {
  it("takes the centred square of a landscape, a portrait and a square picture", () => {
    expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
    expect(squareCrop(200, 401)).toEqual({ sx: 0, sy: 100, side: 200 });
    expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 });
  });

  it("shrinks big pictures to the avatar size and never upscales small ones", () => {
    expect(outputSide(4000)).toBe(AVATAR_SIZE);
    expect(outputSide(100)).toBe(100);
    expect(outputSide(0)).toBe(1);
  });
});

describe("prepareAvatar", () => {
  const file = (type: string, size = 10) => new File([new Uint8Array(size)], "a", { type });
  const render_: AvatarRenderer = async () => prepared;

  it("hands an accepted file to the renderer", async () => {
    await expect(prepareAvatar(file("image/png"), render_)).resolves.toBe(prepared);
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])("refuses the type %j", async (type) => {
    await expect(prepareAvatar(file(type), render_)).rejects.toMatchObject({ problem: "type" });
  });

  it("refuses a file over the limit, and accepts one exactly at it", async () => {
    await expect(prepareAvatar(file("image/png", AVATAR_MAX_INPUT_BYTES + 1), render_)).rejects.toMatchObject({
      problem: "tooLarge",
    });
    await expect(prepareAvatar(file("image/png", AVATAR_MAX_INPUT_BYTES), render_)).resolves.toBe(prepared);
  });

  it("reports a file the browser cannot decode as unreadable", async () => {
    const broken: AvatarRenderer = async () => {
      throw new Error("decode");
    };
    const error = await prepareAvatar(file("image/png"), broken).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AvatarError);
    expect(error).toMatchObject({ problem: "unreadable" });
  });
});

describe("uploadAvatar", () => {
  it("uploads into the user's own folder under a generated name, saves it, and only then removes the old file", async () => {
    const { client, calls, bucket } = fakeClient();
    const saved = await uploadAvatar(client, profileOf(OLD_KEY), prepared);
    const key = saved.avatar_storage_key ?? "";
    expect(isValidStorageKey(key, USER)).toBe(true);
    expect(key.endsWith(".webp")).toBe(true);
    expect(calls).toEqual([`upload ${key}`, `save ${key}`, `remove ${OLD_KEY}`]);
    expect(bucket.upload).toHaveBeenCalledWith(key, prepared.blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  });

  it("removes nothing when there was no picture before", async () => {
    const { client, calls } = fakeClient();
    await uploadAvatar(client, profileOf(null), prepared);
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["upload", "save"]);
  });

  it("keeps the old picture and uploads nothing more when the upload is refused", async () => {
    const { client, calls } = fakeClient({ uploadError: { message: "too big", statusCode: "413" } });
    await expect(uploadAvatar(client, profileOf(OLD_KEY), prepared)).rejects.toMatchObject({ kind: "invalid" });
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["upload"]);
  });

  it("removes the new object, and keeps the old one, when the profile cannot be saved", async () => {
    const { client, calls } = fakeClient({ updateError: { code: "23514", message: "check" } });
    await expect(uploadAvatar(client, profileOf(OLD_KEY), prepared)).rejects.toMatchObject({ kind: "invalid" });
    const uploaded = calls[0]?.replace("upload ", "");
    expect(calls).toEqual([`upload ${uploaded}`, `save ${uploaded}`, `remove ${uploaded}`]);
  });

  it("a forbidden upload is reported as forbidden", async () => {
    const { client } = fakeClient({
      uploadError: { message: "new row violates row-level security", statusCode: "403" },
    });
    await expect(uploadAvatar(client, profileOf(null), prepared)).rejects.toMatchObject({ kind: "forbidden" });
  });
});

describe("removeAvatar", () => {
  it("clears the profile first, then deletes the file", async () => {
    const { client, calls } = fakeClient();
    const saved = await removeAvatar(client, profileOf(OLD_KEY));
    expect(saved.avatar_storage_key).toBeNull();
    expect(calls).toEqual(["save null", `remove ${OLD_KEY}`]);
  });
});

function Probe({ storageKey }: { storageKey: string | null }) {
  return <p data-testid="url">{useAvatarUrl(storageKey) ?? "none"}</p>;
}

describe("useAvatarUrl", () => {
  it("builds the public address, and is empty without a key or without a client", () => {
    const { client } = fakeClient();
    const { rerender } = render(
      <DataProvider client={client}>
        <Probe storageKey={OLD_KEY} />
      </DataProvider>,
    );
    expect(screen.getByTestId("url").textContent).toBe(`https://x.test/storage/v1/object/public/avatars/${OLD_KEY}`);
    rerender(
      <DataProvider client={client}>
        <Probe storageKey={null} />
      </DataProvider>,
    );
    expect(screen.getByTestId("url").textContent).toBe("none");
    rerender(<Probe storageKey={OLD_KEY} />); // no provider at all: a page that never configured data
    expect(screen.getByTestId("url").textContent).toBe("none");
  });
});

describe("AvatarEditor", () => {
  function setup(profile: Profile, renderer: AvatarRenderer, client: DataClient) {
    const toast = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DataProvider client={client}>
          <ToastProvider port={{ show: toast }}>
            <AvatarEditor profile={profile} render={renderer} />
          </ToastProvider>
        </DataProvider>
      </QueryClientProvider>,
    );
    return { toast, queryClient };
  }
  const choose = (file: File) =>
    fireEvent.change(screen.getByLabelText(profileText.avatar.inputLabel), { target: { files: [file] } });

  it("uploads the chosen picture and says so", async () => {
    const { client, calls } = fakeClient();
    const { toast } = setup(profileOf(null), async () => prepared, client);
    choose(new File(["x"], "me.png", { type: "image/png" }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(calls.map((c) => c.split(" ")[0])).toEqual(["upload", "save"]);
  });

  it("shows why a wrong file was refused, and uploads nothing", async () => {
    const { client, calls } = fakeClient();
    setup(profileOf(null), async () => prepared, client);
    choose(new File(["x"], "me.gif", { type: "image/gif" }));
    expect((await screen.findByRole("alert")).textContent).toBe(profileText.avatar.errors.type);
    expect(calls).toEqual([]);
  });

  it("offers Remove only when there is a picture, and removes it", async () => {
    const none = fakeClient();
    setup(profileOf(null), async () => prepared, none.client);
    expect(screen.queryByRole("button", { name: profileText.avatar.remove })).toBeNull();
    cleanup();

    const some = fakeClient();
    const { toast } = setup(profileOf(OLD_KEY), async () => prepared, some.client);
    expect(screen.getByRole("button", { name: profileText.avatar.change })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: profileText.avatar.remove }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(some.calls).toEqual(["save null", `remove ${OLD_KEY}`]);
  });

  it("shows the server's refusal as a message", async () => {
    const { client } = fakeClient({ uploadError: { message: "mime type not allowed", statusCode: "415" } });
    setup(profileOf(null), async () => prepared, client);
    choose(new File(["x"], "me.png", { type: "image/png" }));
    expect((await screen.findByRole("alert")).textContent).toBe(profileText.avatar.errors.rejected);
  });
});
