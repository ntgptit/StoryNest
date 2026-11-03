"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPassword } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { PasswordInput } from "@storynest/ui/components/password-input";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { useForm } from "react-hook-form";
import { useAuth } from "../../_shared/auth.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { AuthCard, FormError } from "../components/auth-card.tsx";
import { TextLink } from "../components/auth-links.tsx";
import { useUpdatePassword } from "../hooks/use-auth-actions.ts";
import { authErrorMessage } from "../model/messages.ts";
import { translateErrors } from "../model/translated-resolver.ts";
import { authText } from "../strings.ts";

const t = authText.reset;

/**
 * Reached from the reset-email link: /auth/callback has already exchanged the link's code for a recovery session,
 * so the user is "signed in" here. Without a session (expired or reused link) we explain and offer a new link.
 */
export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const auth = useAuth();
  const toast = useAppToast();
  const form = useForm({
    resolver: translateErrors(zodResolver(resetPasswordSchema)),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const update = useUpdatePassword();
  const submit = form.handleSubmit((values: ResetPassword) =>
    update.mutate(values.password, {
      onSuccess: () => {
        toast.success(t.success);
        onDone();
      },
    }),
  );

  if (auth.status === "loading") return <Skeleton className="mx-auto h-72 w-full max-w-sm rounded-xl" />;

  if (auth.status === "unauthenticated") {
    return (
      <AuthCard title={t.invalidLinkTitle} description={t.invalidLinkBody}>
        <TextLink href="/forgot-password">{t.requestNew}</TextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.title} description={t.description}>
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={update.isPending}>
          <FormError message={update.error ? authErrorMessage(update.error) : null} />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.password}</FormLabel>
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
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.confirm}</FormLabel>
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
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
