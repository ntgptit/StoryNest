"use client";

import {
  ForgotPasswordScreen,
  ResetPasswordScreen,
  SignInScreen,
  SignUpScreen,
  authText,
  useNavigation,
} from "@storynest/features";
import { safeRedirectPath } from "@storynest/utils";

/**
 * Thin client wrappers: they translate "the user is signed in now" into Next navigation. After a session change we
 * refresh so server components (and the header) re-render with the new cookies.
 */

export function SignInPage({ next, callbackFailed }: { next?: string; callbackFailed?: boolean }) {
  const navigation = useNavigation();
  return (
    <SignInScreen
      next={next}
      notice={callbackFailed ? authText.notices.callbackFailed : undefined}
      onSignedIn={() => {
        navigation.replace(safeRedirectPath(next));
        navigation.refresh();
      }}
    />
  );
}

export function SignUpPage({ next }: { next?: string }) {
  const navigation = useNavigation();
  const destination = safeRedirectPath(next);
  return (
    <SignUpScreen
      next={destination}
      onSignedUp={() => {
        navigation.replace(destination);
        navigation.refresh();
      }}
    />
  );
}

export function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}

export function ResetPasswordPage() {
  const navigation = useNavigation();
  return (
    <ResetPasswordScreen
      onDone={() => {
        navigation.replace("/");
        navigation.refresh();
      }}
    />
  );
}
