"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProfileForm } from "@storynest/validation";
import { authKeys, type Profile } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { updateProfile } from "../api/profile.api.ts";

/** Saves the profile and puts the fresh row into the auth cache, so the header and /me update without a refetch. */
export function useUpdateProfile(userId: string) {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<Profile, AppError, ProfileForm>({
    mutationFn: async (input) => {
      try {
        return await updateProfile(getClient(), userId, input);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: (profile) => queryClient.setQueryData(authKeys.profile(userId), profile),
  });
}
