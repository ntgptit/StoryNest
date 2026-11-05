"use client";

import { Button } from "@storynest/ui/components/button";
import { DropZone } from "@storynest/ui/widgets/drop-zone";
import { ImageCropDialog } from "@storynest/ui/widgets/image-crop-dialog";
import { useRef } from "react";
import { UserAvatar, firstLetter } from "../../_shared/avatar.tsx";
import type { Profile } from "../../_shared/auth.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useCropSource } from "../../_shared/use-crop-source.ts";
import { useRemoveAvatar, useUploadAvatar } from "../hooks/use-avatar.ts";
import { AVATAR_ACCEPTED_TYPES, type AvatarRenderer } from "../model/avatar-image.ts";
import { avatarErrorMessage } from "../model/messages.ts";
import { profileText } from "../strings.ts";

const t = profileText.avatar;

/**
 * Shows the current picture with "change" and "remove". A new file, picked or dropped onto the picture row
 * (Lucian 032), opens the crop editor (round mask, square result); "Use photo" uploads the chosen square, "Cancel"
 * uploads nothing.
 */
export function AvatarEditor({ profile, render }: { profile: Profile; render?: AvatarRenderer }) {
  const toast = useAppToast();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar(profile, render);
  const remove = useRemoveAvatar(profile);
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
      <DropZone label={t.drop} disabled={busy} onFiles={(files) => pick(files[0])} className="self-start pr-2">
        <div className="flex items-center gap-4" aria-busy={busy}>
          <UserAvatar
            storageKey={profile.avatar_storage_key}
            fallback={firstLetter(profile.display_name)}
            className="size-20"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? t.uploading : profile.avatar_storage_key === null ? t.add : t.change}
            </Button>
            {profile.avatar_storage_key === null ? null : (
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
              accept={AVATAR_ACCEPTED_TYPES.join(",")}
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
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {avatarErrorMessage(error)}
        </p>
      )}
      {crop.source === null ? null : (
        <ImageCropDialog
          imageUrl={crop.source.url}
          imageWidth={crop.source.width}
          imageHeight={crop.source.height}
          aspect={1}
          shape="round"
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
