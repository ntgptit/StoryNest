/** One person the @ list offers. */
export interface MentionSuggestion {
  username: string;
  name: string;
}

/** How many people the @ list shows at most. */
export const MENTION_SUGGESTIONS = 6;
/** Wait this long after the last key before asking the server for names. */
export const MENTION_DEBOUNCE_MS = 150;

/**
 * A LIKE pattern for "starts with `query`": the typed name may contain `_`, which LIKE reads as "any character", so it
 * is escaped. (The list only opens for names of A-Z a-z 0-9 _, so `%` and `\` never reach here, but they are escaped
 * too.)
 */
export function likePrefix(query: string): string {
  return `${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
