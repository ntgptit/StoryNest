"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPassword } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { Input } from "@storynest/ui/components/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthCard, FormError } from "../components/auth-card.tsx";
import { TextLink } from "../components/auth-links.tsx";
import { useRequestPasswordReset } from "../hooks/use-auth-actions.ts";
import { authErrorMessage } from "../model/messages.ts";
import { translateErrors } from "../model/translated-resolver.ts";
import { authText } from "../strings.ts";

const t = authText.forgot;

export function ForgotPasswordScreen() {
  const form = useForm({ resolver: translateErrors(zodResolver(forgotPasswordSchema)), defaultValues: { email: "" } });
  const request = useRequestPasswordReset();
  const [sent, setSent] = useState(false);
  const submit = form.handleSubmit((values: ForgotPassword) =>
    request.mutate(values, { onSuccess: () => setSent(true) }),
  );

  const back = <TextLink href="/login">{t.back}</TextLink>;

  if (sent) {
    return (
      <AuthCard title={t.sentTitle} footer={back}>
        <p role="status" className="text-sm text-muted-foreground">
          {t.sentBody}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.title} description={t.description} footer={back}>
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={request.isPending}>
          <FormError message={request.error ? authErrorMessage(request.error) : null} />
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
          <Button type="submit" disabled={request.isPending}>
            {request.isPending ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
