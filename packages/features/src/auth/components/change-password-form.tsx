"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPassword } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { PasswordInput } from "@storynest/ui/components/password-input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../_shared/auth.tsx";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { useChangePassword } from "../hooks/use-auth-actions.ts";
import { authErrorMessage, validationMessage } from "../model/messages.ts";
import { authText } from "../strings.ts";
import { FormError } from "./auth-card.tsx";
import { PasswordStrength } from "./password-strength.tsx";

const t = authText.change;
const labels = authText.reset;

/**
 * Change the password of the signed-in account. The current password is required (re-authentication). Renders
 * nothing for accounts that have no password (a social sign-in has none to change).
 */
export function ChangePasswordForm() {
  const auth = useAuth();
  const toast = useAppToast();
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const form = useForm({
    resolver: translateErrors(zodResolver(resetPasswordSchema), validationMessage),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (auth.status !== "authenticated" || !auth.user.email || auth.user.app_metadata?.provider !== "email") {
    return null;
  }
  const email = auth.user.email;

  const submit = form.handleSubmit((values: ResetPassword) => {
    if (current === "") {
      setCurrentError(t.currentRequired);
      return;
    }
    setCurrentError(null);
    change.mutate(
      { email, currentPassword: current, newPassword: values.password },
      {
        onSuccess: () => {
          toast.success(t.success);
          setCurrent("");
          form.reset();
        },
      },
    );
  });

  // The re-authentication step fails with "invalid credentials": here that means the current password.
  const failure = change.error
    ? change.error.code === "invalid_credentials"
      ? t.wrongCurrent
      : authErrorMessage(change.error)
    : null;

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={change.isPending}>
        <FormError message={failure} />
        <div className="flex flex-col gap-2">
          <label htmlFor="change-current" className="text-sm leading-none font-medium">
            {t.current}
          </label>
          <PasswordInput
            id="change-current"
            autoComplete="current-password"
            showLabel={authText.showPassword}
            hideLabel={authText.hidePassword}
            value={current}
            aria-invalid={currentError !== null}
            onChange={(event) => setCurrent(event.target.value)}
          />
          {currentError ? (
            <p role="alert" className="text-sm text-destructive">
              {currentError}
            </p>
          ) : null}
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labels.password}</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  showLabel={authText.showPassword}
                  hideLabel={authText.hidePassword}
                  {...field}
                />
              </FormControl>
              <PasswordStrength value={field.value} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labels.confirm}</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  showLabel={authText.showPassword}
                  hideLabel={authText.hidePassword}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="self-start" disabled={change.isPending}>
          {change.isPending ? t.submitting : t.submit}
        </Button>
      </form>
    </Form>
  );
}
