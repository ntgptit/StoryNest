// "Did you mean gmail.com?" for the email fields of sign-up, sign-in and forgot password. Only a suggestion: the
// address is never changed unless the person accepts it, and it does not affect validation (BR-AUTH-001).

/** Popular mail domains a typo is compared against, most used first (a tie goes to the earlier one). */
export const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "yahoo.com.vn",
  "msn.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "yandex.com",
  "mail.com",
] as const;

/** Real domains that sit close to a popular one: never "correct" them. */
const KNOWN_DOMAINS = new Set<string>([...COMMON_EMAIL_DOMAINS, "me.com", "mac.com", "ymail.com", "fpt.vn", "gmx.de"]);

/** Edit distance counting a swap of two neighbours as one edit (gmial → gmail = 1). */
export function editDistance(a: string, b: string): number {
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i += 1) rows.push([i]);
  for (let j = 0; j <= b.length; j += 1) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const row = rows[i]!;
      const above = rows[i - 1]!;
      row[j] = Math.min(above[j]! + 1, row[j - 1]! + 1, above[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j]!, rows[i - 2]![j - 2]! + 1);
      }
    }
  }
  return rows[a.length]![b.length]!;
}

export interface EmailFix {
  /** The whole corrected address. */
  address: string;
  /** The corrected address split around the letters that changed, for marking them. */
  head: string;
  changed: string;
  tail: string;
}

/**
 * A likely correction of the domain of `value`, or null. Only for something shaped like an address with a top-level
 * domain (x@y.zz) whose domain is not a known one and is one edit away from a popular domain (two for long ones).
 */
export function suggestEmailFix(value: string): EmailFix | null {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!/^[^\s@]+\.[a-z]{2,}$/.test(domain) || KNOWN_DOMAINS.has(domain)) return null;

  const allowed = domain.length >= 9 ? 2 : 1;
  let best: { domain: string; distance: number } | null = null;
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const distance = editDistance(domain, candidate);
    if (distance <= allowed && (best === null || distance < best.distance)) best = { domain: candidate, distance };
  }
  if (best === null) return null;

  const fixed = best.domain;
  let start = 0;
  while (start < fixed.length && fixed[start] === domain[start]) start += 1;
  let end = 0;
  while (end < fixed.length - start && fixed[fixed.length - 1 - end] === domain[domain.length - 1 - end]) end += 1;
  const head = `${local}@${fixed.slice(0, start)}`;
  return {
    address: `${local}@${fixed}`,
    head,
    changed: fixed.slice(start, fixed.length - end),
    tail: fixed.slice(fixed.length - end),
  };
}
