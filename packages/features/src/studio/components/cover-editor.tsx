"use client";

import { Button } from "@storynest/ui/components/button";
import { DropZone } from "@storynest/ui/widgets/drop-zone";
import { ImageCropDialog } from "@storynest/ui/widgets/image-crop-dialog";
import { SizeShrink } from "@storynest/ui/widgets/size-shrink";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { UploadVeil } from "@storynest/ui/widgets/upload-veil";
import { useRef, useState } from "react";
import { usePublicUrl } from "../../_shared/avatar.tsx";
import { currentLocale } from "../../_shared/i18n.ts";
import { formatBytes, useImageSizes } from "../../_shared/use-image-sizes.ts";
import {
  ImageError,
  createBrowserRenderer,
  IMAGE_ACCEPTED_TYPES,
  type ImageRenderer,
} from "../../_shared/image-prepare.ts";
import { AppError } from "../../_shared/errors.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { useCropSource } from "../../_shared/use-crop-source.ts";
import { COVERS_BUCKET } from "../api/story-write.api.ts";
import { useRemoveCover, useUploadCover } from "../hooks/use-story-editing.ts";
import { studioText } from "../strings.ts";

const t = studioText.form.cover;

/** Width of a stored cover. 2:3 like StoryCover; 600 px is sharp at the biggest place a cover is shown. */
export const COVER_MAX_WIDTH = 600;
export const COVER_ASPECT = 2 / 3;
const renderCover: ImageRenderer = createBrowserRenderer({
  aspect: COVER_ASPECT,
  maxWidth: COVER_MAX_WIDTH,
  placeholder: true,
});

function coverErrorMessage(error: Error): string {
  if (error instanceof ImageError) return t.errors[error.problem];
  if (error instanceof AppError) {
    if (error.kind === "invalid") return t.errors.rejected;
    if (error.kind === "forbidden" || error.kind === "unauthenticated") return t.errors.forbidden;
    if (error.kind === "network") return t.errors.network;
  }
  return t.errors.generic;
}

/**
 * The story's cover with "change" and "remove". A new picture, picked or dropped onto the cover row (Lucian 032),
 * opens the crop editor (2:3 frame); "Use photo" uploads the chosen part, "Cancel" uploads nothing. Authors decide
 * how their cover looks. While it uploads a veil with a turning ring lies over the cover (Lucian 082, no byte
 * progress exists), and afterwards the original and uploaded file size are shown (Lucian 301).
 */
export function CoverEditor({
  story,
  title,
  render = renderCover,
}: {
  story: { id: string; coverStorageKey: string | null; coverBlurhash?: string | null };
  title: string;
  render?: ImageRenderer;
}) {
  const toast = useAppToast();
  const input = useRef<HTMLInputElement>(null);
  const measured = useImageSizes(render);
  const upload = useUploadCover(story, measured.render);
  const remove = useRemoveCover(story);
  const [uploaded, setUploaded] = useState(0);
  const locale = currentLocale();
  const url = usePublicUrl(COVERS_BUCKET, story.coverStorageKey);
  const crop = useCropSource();
  const busy = upload.isPending || remove.isPending;
  const error = crop.error ?? upload.error ?? remove.error;

  const pick = (file: File | undefined) => {
    if (file === undefined) return;
    upload.reset();
    remove.reset();
    measured.clear();
    crop.open(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-none font-medium">{t.label}</p>
      <DropZone label={t.drop} disabled={busy} onFiles={(files) => pick(files[0])} className="self-start pr-2">
        <div className="flex items-end gap-4" aria-busy={busy}>
          <UploadVeil busy={upload.isPending} done={uploaded} className="w-24 shrink-0 rounded-lg">
            <StoryCover title={title} coverUrl={url} placeholder={story.coverBlurhash} />
          </UploadVeil>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? t.uploading : story.coverStorageKey === null ? t.add : t.change}
            </Button>
            {story.coverStorageKey === null ? null : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  upload.reset();
                  crop.clearError();
                  measured.clear();
                  remove.mutate(undefined, { onSuccess: () => toast.success(t.removed) });
                }}
              >
                {t.remove}
              </Button>
            )}
            <input
              ref={input}
              type="file"
              accept={IMAGE_ACCEPTED_TYPES.join(",")}
              aria-label={t.inputLabel}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                pick(event.target.files?.[0]);
                event.target.value = ""; // picking the same file again must still fire
              }}
            />
          </div>
        </div>
      </DropZone>
      <p className="text-xs text-muted-foreground">
        {t.hint} <span className="pointer-coarse:hidden">{t.dropHint}</span>
      </p>
      {measured.sizes === null || busy ? null : (
        <SizeShrink
          original={measured.sizes.original}
          result={measured.sizes.prepared}
          formatSize={(bytes) => formatBytes(bytes, locale)}
          labels={t.size}
        />
      )}
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {coverErrorMessage(error)}
        </p>
      )}
      {crop.source === null ? null : (
        <ImageCropDialog
          imageUrl={crop.source.url}
          imageWidth={crop.source.width}
          imageHeight={crop.source.height}
          aspect={COVER_ASPECT}
          labels={t.crop}
          onCancel={crop.close}
          onConfirm={(area) => {
            const file = crop.source?.file;
            crop.close();
            if (file !== undefined)
              upload.mutate(
                { file, crop: area },
                {
                  onSuccess: () => {
                    measured.commit();
                    setUploaded((count) => count + 1);
                    toast.success(t.saved);
                  },
                },
              );
          }}
        />
      )}
    </div>
  );
}
