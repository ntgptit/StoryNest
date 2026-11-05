"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { profileFormSchema, type ProfileForm } from "@storynest/validation";
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
import { Input } from "@storynest/ui/components/input";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Textarea } from "@storynest/ui/components/textarea";
import { AvailabilityHint } from "@storynest/ui/widgets/availability-hint";
import { UnsavedChangesBar, useLeaveGuard } from "@storynest/ui/widgets/unsaved-changes-bar";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth, type Profile } from "../../_shared/auth.tsx";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useUpdateProfile } from "../hooks/use-update-profile.ts";
import { useUsernameAvailability } from "../hooks/use-username-availability.ts";
import { isUsernameTaken, profileErrorMessage, validationMessage } from "../model/messages.ts";
import { AvatarEditor } from "../components/avatar-editor.tsx";
import { profileText } from "../strings.ts";

const t = profileText.edit;

/** Own-profile editor. `onSaved` runs after a successful save (the app navigates back to the profile). */
export function EditProfileScreen({ onSaved, cancelHref = "/me" }: { onSaved: () => void; cancelHref?: string }) {
  const auth = useAuth();

  if (auth.status === "loading" || (auth.status === "authenticated" && auth.profileLoading)) {
    return <Skeleton className="h-96 w-full max-w-xl rounded-xl" />;
  }
  if (auth.status === "unauthenticated") {
    return (
      <p className="text-sm text-muted-foreground">
        {t.signInRequired}{" "}
        <AppLink
          href="/login?next=%2Fme%2Fedit"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.signIn}
        </AppLink>
      </p>
    );
  }
  if (auth.profile === null) return <p className="text-sm text-muted-foreground">{t.missingProfile}</p>;

  return <EditProfileForm userId={auth.user.id} profile={auth.profile} onSaved={onSaved} cancelHref={cancelHref} />;
}

function EditProfileForm({
  userId,
  profile,
  onSaved,
  cancelHref,
}: {
  userId: string;
  profile: Profile;
  onSaved: () => void;
  cancelHref: string;
}) {
  const toast = useAppToast();
  const update = useUpdateProfile(userId);
  const form = useForm({
    resolver: translateErrors(zodResolver(profileFormSchema), validationMessage),
    defaultValues: { username: profile.username, display_name: profile.display_name, bio: profile.bio ?? "" },
  });

  const submit = form.handleSubmit((values: ProfileForm) =>
    update.mutate(values, {
      onSuccess: () => {
        toast.success(t.saved);
        onSaved();
      },
      // A taken username belongs on the username field, not in a generic banner.
      onError: (error) => {
        if (isUsernameTaken(error))
          form.setError("username", { type: "server", message: profileText.errors.usernameTaken });
      },
    }),
  );

  const availability = useUsernameAvailability(form.watch("username") ?? "", profile.username);

  const bannerError = update.error && !isUsernameTaken(update.error) ? profileErrorMessage(update.error) : null;

  // Unsaved changes: a Save / Discard bar, and leaving the page asks first (Lucian 250). The form's own Cancel link
  // is an explicit choice and is not stopped.
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = form.formState.isDirty;
  const [leaveWarning, setLeaveWarning] = useState(0);
  useLeaveGuard({
    dirty,
    message: t.unsaved.leave,
    onBlocked: () => setLeaveWarning((count) => count + 1),
    allowInside: formRef,
  });

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      <AvatarEditor profile={profile} />
      <Form {...form}>
        <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={update.isPending}>
          {bannerError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {bannerError}
            </p>
          ) : null}
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.displayName}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
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
                  <Input autoComplete="username" autoCapitalize="none" spellCheck={false} {...field} />
                </FormControl>
                <FormDescription>{t.usernameHint}</FormDescription>
                <AvailabilityHint status={availability} labels={t.availability} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.bio}</FormLabel>
                <FormControl>
                  <Textarea rows={5} {...field} value={typeof field.value === "string" ? field.value : ""} />
                </FormControl>
                <FormDescription>{t.bioHint}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending ? t.submitting : t.submit}
            </Button>
            <Button asChild variant="ghost">
              <AppLink href={cancelHref}>{t.cancel}</AppLink>
            </Button>
          </div>
        </form>
      </Form>
      <UnsavedChangesBar
        dirty={dirty}
        message={t.unsaved.count(Object.keys(form.formState.dirtyFields).length)}
        warning={leaveWarning}
        warningText={t.unsaved.warning}
        saveLabel={t.unsaved.save}
        savingLabel={t.submitting}
        discardLabel={t.unsaved.discard}
        label={t.unsaved.region}
        saving={update.isPending}
        onSave={() => void submit()}
        onDiscard={() => form.reset()}
      />
    </div>
  );
}
