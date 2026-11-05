"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EmailTypoHint } from "@storynest/ui/widgets/email-typo-hint";
import { suggestEmailFix } from "../model/email-typo.ts";
import { authText } from "../strings.ts";

/** Pause after typing before a suggestion shows, so it does not flicker while the domain is still being typed. */
export const EMAIL_TYPO_DELAY_MS = 400;

/**
 * Wraps an email input (around the FormControl, not inside it) and offers "Did you mean …@gmail.com?" below it when
 * the domain looks mistyped (Lucian 264). Pressing it calls `onFix` with the corrected address (the caller puts it in
 * the field) and flashes the field once; the address is never changed without that press, and validation is
 * unaffected.
 */
export function EmailTypoFix({
  value,
  onFix,
  children,
}: {
  value: string;
  onFix: (address: string) => void;
  /** The email input. */
  children: ReactNode;
}) {
  const [settled, setSettled] = useState(value);
  const [fixes, setFixes] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), EMAIL_TYPO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // Only a suggestion for what is in the field now (not for a value already edited further).
  const fix = settled === value ? suggestEmailFix(value) : null;

  return (
    // One block (no gap of its own), so an empty suggestion area takes no room in the form's spacing.
    <div className="flex flex-col">
      <div className="relative">
        {children}
        {fixes > 0 ? (
          <span
            key={fixes}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-md motion-safe:animate-fix-flash"
          />
        ) : null}
      </div>
      <div aria-live="polite">
        {fix ? (
          <EmailTypoHint
            key={fix.address}
            className="mt-2"
            suggestion={fix}
            before={authText.emailTypo.before}
            after={authText.emailTypo.after}
            onAccept={() => {
              setFixes((count) => count + 1);
              onFix(fix.address);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
