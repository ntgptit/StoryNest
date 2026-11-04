"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys, type Profile } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { removeAvatar, uploadAvatar } from "../api/profile.api.ts";
import { prepareAvatar, type AvatarRenderer } from "../model/avatar-image.ts";

/** Picks, crops, uploads and saves a new picture; the fresh profile goes into the auth cache so the header updates. */
export function useUploadAvatar(profile: Profile, render?: AvatarRenderer) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, File>({
    mutationFn: async (file) => {
      const avatar = await prepareAvatar(file, render); // AvatarError passes through, the screen has text for it
      try {
        return await uploadAvatar(getClient(), profile, avatar);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: (saved) => queryClient.setQueryData(authKeys.profile(profile.id), saved),
  });
}

export function useRemoveAvatar(profile: Profile) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<Profile, AppError, void>({
    mutationFn: async () => {
      try {
        return await removeAvatar(getClient(), profile);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: (saved) => queryClient.setQueryData(authKeys.profile(profile.id), saved),
  });
}
