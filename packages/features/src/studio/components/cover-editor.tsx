"use client";

import { Button } from "@storynest/ui/components/button";
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

/** The story's cover with "change" and "remove". A new picture is cropped to 2:3 and uploaded at once. */
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
  const busy = upload.isPending || remove.isPending;
  const error = upload.error ?? remove.error;

  const pick = (file: File | undefined) => {
    if (file === undefined) return;
    upload.reset();
    remove.reset();
    upload.mutate(file, { onSuccess: () => toast.success(t.saved) });
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
    </div>
  );
}
