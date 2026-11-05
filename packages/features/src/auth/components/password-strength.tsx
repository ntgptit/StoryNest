"use client";

import { PASSWORD_MIN_LENGTH } from "@storynest/validation";
import { PasswordStrengthMeter } from "@storynest/ui/widgets/password-strength-meter";
import { passwordStrength, type StrengthCheck } from "../model/password-strength.ts";
import { authText } from "../strings.ts";

const LEVEL_KEY = ["none", "weak", "fair", "good", "strong"] as const;
const CHECKS: readonly StrengthCheck[] = ["length", "mixedCase", "number", "symbol"];

/**
 * Advisory strength meter under a new password (sign-up, reset; Lucian 036). Shown once something is typed; it never
 * blocks the form, whose only rule stays the schema's minimum length.
 */
export function PasswordStrength({ value }: { value: string }) {
  if (value === "") return null;
  const t = authText.strength;
  const strength = passwordStrength(value);
  return (
    <PasswordStrengthMeter
      score={strength.score}
      title={t.title}
      note={t.note}
      levelLabel={t.levels[LEVEL_KEY[strength.score]]}
      metLabel={t.met}
      checks={CHECKS.map((id) => ({
        id,
        label: id === "length" ? t.checks.length(PASSWORD_MIN_LENGTH) : t.checks[id],
        met: strength.checks[id],
      }))}
      hints={strength.hints.map((hint) => t.hints[hint])}
    />
  );
}
