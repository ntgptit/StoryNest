"use client";

import { useMutation } from "@tanstack/react-query";
import type { ForgotPassword, SignIn, SignUp } from "@storynest/validation";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { usePlatform } from "../../_shared/platform.tsx";
import { requestPasswordReset, signInWithPassword, signUpWithPassword, updatePassword } from "../api/auth.api.ts";
import { authCallbackUrl } from "../model/auth-urls.ts";

// Mutations never retry (see createQueryClient), so a wrong password is reported once, immediately.

export function useSignIn() {
  const getClient = useDataClientGetter();
  return useMutation<void, AppError, SignIn>({
    mutationFn: async (input) => {
      try {
        await signInWithPassword(getClient(), input);
      } catch (error) {
        throw toAppError(error);
      }
    },
  });
}

export function useSignUp(next: string) {
  const getClient = useDataClientGetter();
  const { appOrigin } = usePlatform();
  return useMutation<{ needsEmailConfirmation: boolean }, AppError, SignUp>({
    mutationFn: async (input) => {
      try {
        return await signUpWithPassword(getClient(), input, { emailRedirectTo: authCallbackUrl(appOrigin(), next) });
      } catch (error) {
        throw toAppError(error);
      }
    },
  });
}

export function useRequestPasswordReset() {
  const getClient = useDataClientGetter();
  const { appOrigin } = usePlatform();
  return useMutation<void, AppError, ForgotPassword>({
    mutationFn: async (input) => {
      try {
        await requestPasswordReset(getClient(), input, { redirectTo: authCallbackUrl(appOrigin(), "/reset-password") });
      } catch (error) {
        throw toAppError(error);
      }
    },
  });
}

export function useUpdatePassword() {
  const getClient = useDataClientGetter();
  return useMutation<void, AppError, string>({
    mutationFn: async (password) => {
      try {
        await updatePassword(getClient(), password);
      } catch (error) {
        throw toAppError(error);
      }
    },
  });
}
