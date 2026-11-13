"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUp } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@storynest/ui/components/form";
import { FormErrorSummary } from "@storynest/ui/components/form-error-summary";
import { Input } from "@storynest/ui/components/input";
import { PasswordInput } from "@storynest/ui/components/password-input";
import { useState } from "react";
import { AvailabilityHint } from "@storynest/ui/widgets/availability-hint";
import { useCountdown } from "@storynest/ui/lib/use-countdown";
import { EnvelopeSent, ResendButton } from "@storynest/ui/widgets/envelope-sent";
import { useForm } from "react-hook-form";
import { AuthCard, FormError } from "../components/auth-card.tsx";
import { EmailTypoFix } from "../components/email-typo-fix.tsx";
import { PasswordStrength } from "../components/password-strength.tsx";
import { TextLink } from "../components/auth-links.tsx";
import { LockoutNotice, useLockout } from "../components/lockout.tsx";
import { useUsernameAvailability } from "../../profile/index.ts";
import { useResendConfirmation, useSignUp } from "../hooks/use-auth-actions.ts";
import { withNext } from "../model/auth-urls.ts";
import { RESEND_COOLDOWN_SECONDS } from "../model/resend.ts";
import { markFirstRunDue } from "../model/first-run.ts";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { authErrorMessage, retryAfterSeconds, validationMessage } from "../model/messages.ts";
import { authText } from "../strings.ts";

const t = authText.signUp;

export function SignUpScreen({
  next = "/",
  onSignedUp,
}: {
  /** Destination after the email link is opened, and after sign-up when no confirmation is required. */
  next?: string;
  /** Called only when sign-up produced a session straight away (email confirmation disabled). */
  onSignedUp: () => void;
}) {
  const form = useForm({
    resolver: translateErrors(zodResolver(signUpSchema), validationMessage),
    defaultValues: { email: "", password: "", username: "", display_name: "" },
  });
  const signUp = useSignUp(next);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const lockout = useLockout();
  const username = form.watch("username");
  const availability = useUsernameAvailability(typeof username === "string" ? username : "");
  const resendConfirmation = useResendConfirmation(next);
  const cooldown = useCountdown(RESEND_COOLDOWN_SECONDS);
  // Bumped by every successful resend: replays the envelope and says "sent again".
  const [resent, setResent] = useState(0);
  const [resendWait, setResendWait] = useState(RESEND_COOLDOWN_SECONDS);
  const resend = (email: string) =>
    resendConfirmation.mutate(email, {
      onSuccess: () => {
        setResent((count) => count + 1);
        setResendWait(RESEND_COOLDOWN_SECONDS);
        cooldown.restart();
      },
      onError: (error) => {
        // Use the server's own wait when it names one.
        const seconds = retryAfterSeconds(error);
        if (seconds === null) return;
        setResendWait(seconds);
        cooldown.restart(seconds);
      },
    });
  const submit = form.handleSubmit((values: SignUp) => {
    if (lockout.locked) return;
    lockout.clear();
    signUp.mutate(values, {
      onSuccess: (result) => {
        // The app frame shows a short intro the first time this account is signed in here (Lucian 383).
        markFirstRunDue();
        if (result.needsEmailConfirmation) {
          setConfirmationSentTo(values.email);
          setResendWait(RESEND_COOLDOWN_SECONDS);
          cooldown.restart();
        } else onSignedUp();
      },
      onError: lockout.start,
    });
  });

  if (confirmationSentTo) {
    return (
      <AuthCard title={t.checkEmailTitle} footer={<TextLink href={withNext("/login", next)}>{t.toSignIn}</TextLink>}>
        <div className="flex flex-col gap-3 text-center">
          <EnvelopeSent key={resent} />
          <p role="status" className="text-sm text-muted-foreground">
            {resent > 0 ? `${t.resent} ` : ""}
            {t.checkEmailBody}
            <span className="mt-2 block font-medium break-all text-foreground">{confirmationSentTo}</span>
          </p>
          <p className="text-xs text-muted-foreground">{t.checkEmailHint}</p>
          <FormError message={resendConfirmation.error ? authErrorMessage(resendConfirmation.error) : null} />
          <ResendButton
            secondsLeft={cooldown.left}
            total={resendWait}
            label={t.resend}
            waitingLabel={t.resendIn}
            pending={resendConfirmation.isPending}
            onResend={() => resend(confirmationSentTo)}
          />
          <Button
            type="button"
            variant="ghost"
            className="self-center"
            onClick={() => {
              resendConfirmation.reset();
              setConfirmationSentTo(null);
            }}
          >
            {t.differentEmail}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t.title}
      description={t.description}
      footer={
        <>
          {t.haveAccount} <TextLink href={withNext("/login", next)}>{t.toSignIn}</TextLink>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={signUp.isPending}>
          {lockout.total !== null ? (
            <LockoutNotice lockout={lockout} />
          ) : (
            <FormError message={signUp.error ? authErrorMessage(signUp.error) : null} />
          )}
          <FormErrorSummary title={t.errorSummary} />
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
                <FormDescription>{t.passwordHint}</FormDescription>
                <PasswordStrength value={field.value} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.username}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    {...field}
                    value={typeof field.value === "string" ? field.value : ""}
                  />
                </FormControl>
                <FormDescription>{t.usernameHint}</FormDescription>
                <AvailabilityHint status={availability} labels={t.usernameAvailability} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.displayName}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} value={typeof field.value === "string" ? field.value : ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={signUp.isPending || lockout.locked}>
            {signUp.isPending ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
