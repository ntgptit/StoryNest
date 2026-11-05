"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPassword } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { Input } from "@storynest/ui/components/input";
import { useCountdown } from "@storynest/ui/lib/use-countdown";
import { EnvelopeSent, ResendButton } from "@storynest/ui/widgets/envelope-sent";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthCard, FormError } from "../components/auth-card.tsx";
import { EmailTypoFix } from "../components/email-typo-fix.tsx";
import { TextLink } from "../components/auth-links.tsx";
import { useRequestPasswordReset } from "../hooks/use-auth-actions.ts";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { authErrorMessage, validationMessage } from "../model/messages.ts";
import { RESEND_COOLDOWN_SECONDS } from "../model/resend.ts";
import { authText } from "../strings.ts";

const t = authText.forgot;

export function ForgotPasswordScreen() {
  const form = useForm({
    resolver: translateErrors(zodResolver(forgotPasswordSchema), validationMessage),
    defaultValues: { email: "" },
  });
  const request = useRequestPasswordReset();
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Bumped by every successful resend: replays the envelope and says "sent again".
  const [resent, setResent] = useState(0);
  const cooldown = useCountdown(RESEND_COOLDOWN_SECONDS);
  const submit = form.handleSubmit((values: ForgotPassword) =>
    request.mutate(values, {
      onSuccess: () => {
        setSentTo(values.email);
        cooldown.restart();
      },
    }),
  );

  const back = <TextLink href="/login">{t.back}</TextLink>;

  if (sentTo !== null) {
    // The same request again (the reset email has no separate "resend" call), after Supabase's minimum gap.
    const resend = () =>
      request.mutate(
        { email: sentTo },
        {
          onSuccess: () => {
            setResent((count) => count + 1);
            cooldown.restart();
          },
        },
      );
    return (
      <AuthCard title={t.sentTitle} footer={back}>
        <div className="flex flex-col gap-3 text-center">
          <EnvelopeSent key={resent} />
          <p role="status" className="text-sm text-muted-foreground">
            {resent > 0 ? `${t.resent} ` : ""}
            {t.sentBody}
            <span className="mt-2 block font-medium break-all text-foreground">{sentTo}</span>
          </p>
          <p className="text-xs text-muted-foreground">{t.spamHint}</p>
          <FormError message={request.error ? authErrorMessage(request.error) : null} />
          <ResendButton
            secondsLeft={cooldown.left}
            total={RESEND_COOLDOWN_SECONDS}
            label={t.resend}
            waitingLabel={t.resendIn}
            pending={request.isPending}
            onResend={resend}
          />
          <Button
            type="button"
            variant="ghost"
            className="self-center"
            onClick={() => {
              request.reset();
              setSentTo(null);
            }}
          >
            {t.differentEmail}
          </Button>
        </div>
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
                <EmailTypoFix
                  value={field.value}
                  onFix={(address) => {
                    field.onChange(address);
                    form.setFocus("email");
                  }}
                >
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
                </EmailTypoFix>
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
