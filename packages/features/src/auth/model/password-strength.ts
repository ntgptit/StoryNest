import { PASSWORD_MIN_LENGTH } from "@storynest/validation";

// Advisory password strength for the sign-up and reset forms. It is information only: it never blocks a submit and
// adds no rule. The only rule is the schema's (newPasswordSchema: at least PASSWORD_MIN_LENGTH characters, at most
// 72 bytes); Supabase may still refuse a weak or leaked password on its own (weak_password).

export type StrengthScore = 0 | 1 | 2 | 3 | 4;
export type StrengthCheck = "length" | "mixedCase" | "number" | "symbol";
export type StrengthHint = "common" | "sequence" | "repeat" | "longer";

/** Length from which a password counts as long (one more step on the meter). */
export const LONG_PASSWORD = 12;
const VERY_LONG_PASSWORD = 16;

/** A few of the most used passwords and words they are built on (lower-case, compared without digits/symbols too). */
const COMMON = [
  "password",
  "passw0rd",
  "qwerty",
  "qwertyuiop",
  "asdfgh",
  "iloveyou",
  "admin",
  "welcome",
  "letmein",
  "monkey",
  "dragon",
  "football",
  "matkhau",
  "anhyeuem",
  "emyeuanh",
  "storynest",
  "abc123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "111111",
  "000000",
  "123123",
];

export interface PasswordStrength {
  score: StrengthScore;
  checks: Record<StrengthCheck, boolean>;
  hints: StrengthHint[];
}

/** True when `value` holds a run of `length` characters going up or down by one (abcd, 4321). */
function hasSequence(value: string, length = 4): boolean {
  const codes = Array.from(value.toLowerCase(), (char) => char.codePointAt(0) ?? 0);
  let up = 1;
  let down = 1;
  for (let i = 1; i < codes.length; i += 1) {
    const step = (codes[i] ?? 0) - (codes[i - 1] ?? 0);
    up = step === 1 ? up + 1 : 1;
    down = step === -1 ? down + 1 : 1;
    if (up >= length || down >= length) return true;
  }
  return false;
}

function isCommon(value: string): boolean {
  const lower = value.toLowerCase();
  const letters = lower.replace(/[^\p{L}]/gu, "");
  return COMMON.some((word) => lower === word || letters === word || (word.length >= 6 && lower.includes(word)));
}

/** Rates `value` from 0 (empty) to 4 (strong) and says which points it meets and what would make it better. */
export function passwordStrength(value: string): PasswordStrength {
  const length = Array.from(value).length;
  const checks: Record<StrengthCheck, boolean> = {
    length: length >= PASSWORD_MIN_LENGTH,
    mixedCase: /\p{Ll}/u.test(value) && /\p{Lu}/u.test(value),
    number: /\p{Nd}/u.test(value),
    symbol: /[^\p{L}\p{Nd}]/u.test(value),
  };
  if (length === 0) return { score: 0, checks, hints: [] };

  const hints: StrengthHint[] = [];
  const common = isCommon(value);
  const sequence = hasSequence(value);
  const repeat = /(.)\1{3,}/u.test(value);
  if (common) hints.push("common");
  if (sequence) hints.push("sequence");
  if (repeat) hints.push("repeat");
  if (checks.length && length < LONG_PASSWORD) hints.push("longer");

  const variety = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((re) => re.test(value)).length;
  let score: StrengthScore = 1;
  if (checks.length) {
    if (length >= VERY_LONG_PASSWORD || (length >= LONG_PASSWORD && variety >= 3)) score = 4;
    else if (variety >= 3 || (length >= LONG_PASSWORD && variety >= 2)) score = 3;
    else if (variety >= 2 || length >= LONG_PASSWORD) score = 2;
  }
  if (common) score = 1;
  else if ((sequence || repeat) && score > 1) score = (score - 1) as StrengthScore;
  return { score, checks, hints };
}
