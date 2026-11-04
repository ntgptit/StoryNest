"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignIn } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { Input } from "@storynest/ui/components/input";
import { PasswordInput } from "@storynest/ui/components/password-input";
import { useForm } from "react-hook-form";
import { AuthCard, FormError } from "../components/auth-card.tsx";
import { TextLink } from "../components/auth-links.tsx";
import { useSignIn } from "../hooks/use-auth-actions.ts";
import { withNext } from "../model/auth-urls.ts";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { authErrorMessage, validationMessage } from "../model/messages.ts";
import { authText } from "../strings.ts";

const t = authText.signIn;

export function SignInScreen({
  next,
  notice,
  onSignedIn,
}: {
  /** Where the user was heading; only used to keep the link to sign-up pointing at the same place. */
  next?: string;
  /** Informational banner, e.g. "the confirmation link has expired". */
  notice?: string;
  onSignedIn: () => void;
}) {
  const form = useForm({
    resolver: translateErrors(zodResolver(signInSchema), validationMessage),
    defaultValues: { email: "", password: "" },
  });
  const signIn = useSignIn();
  const submit = form.handleSubmit((values: SignIn) => signIn.mutate(values, { onSuccess: onSignedIn }));

  return (
    <AuthCard
      title={t.title}
      description={t.description}
      footer={
        <>
          {t.noAccount} <TextLink href={withNext("/register", next)}>{t.toSignUp}</TextLink>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={signIn.isPending}>
          {notice ? (
            <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {notice}
            </p>
          ) : null}
          <FormError message={signIn.error ? authErrorMessage(signIn.error) : null} />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.email}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.password}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    showLabel={authText.showPassword}
                    hideLabel={authText.hidePassword}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-right text-sm">
            <TextLink href="/forgot-password">{t.forgot}</TextLink>
          </div>
          <Button type="submit" disabled={signIn.isPending}>
            {signIn.isPending ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
