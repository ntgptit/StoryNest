"use client";

import { Button } from "@storynest/ui/components/button";
import { ImageCropDialog } from "@storynest/ui/widgets/image-crop-dialog";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { useRef } from "react";
import { usePublicUrl } from "../../_shared/avatar.tsx";
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
const renderCover: ImageRenderer = createBrowserRenderer({ aspect: COVER_ASPECT, maxWidth: COVER_MAX_WIDTH });

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
 * The story's cover with "change" and "remove". A new picture opens the crop editor (2:3 frame); "Use photo" uploads
 * the chosen part, "Cancel" uploads nothing. Authors decide how their cover looks.
 */
export function CoverEditor({
  story,
  title,
  render = renderCover,
}: {
  story: { id: string; coverStorageKey: string | null };
  title: string;
  render?: ImageRenderer;
}) {
  const toast = useAppToast();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadCover(story, render);
  const remove = useRemoveCover(story);
  const url = usePublicUrl(COVERS_BUCKET, story.coverStorageKey);
  const crop = useCropSource();
  const busy = upload.isPending || remove.isPending;
  const error = crop.error ?? upload.error ?? remove.error;

  const pick = (file: File | undefined) => {
    if (file === undefined) return;
    upload.reset();
    remove.reset();
    crop.open(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-none font-medium">{t.label}</p>
      <div className="flex items-end gap-4" aria-busy={busy}>
        <StoryCover title={title} coverUrl={url} className="w-24 shrink-0" />
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
      <p className="text-xs text-muted-foreground">{t.hint}</p>
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
            if (file !== undefined) upload.mutate({ file, crop: area }, { onSuccess: () => toast.success(t.saved) });
          }}
        />
      )}
    </div>
  );
}
