# OBJ-ABU — Abuse limits & spam filter — Workflows

### WF-ABU-01 — A comment is refused by a rate limit
| Field | Value |
| --- | --- |
| User goal | (Member) post a comment or reply |
| Trigger | "Send" in the comment composer (OBJ-CMT) |
| Preconditions | Member already wrote 10 comments in the last 10 min, or 200 in the last 24 h (replies and deleted comments count) |
| Main flow | 1. Composer calls `post_comment(id, …)`. 2. Trigger `comments_guard_abuse` → `enforce_rate_limit('comment')` finds the limit reached. 3. PT429 with HINT = limit code; nothing stored. 4. Client maps to `rateLimited`; composer shows "You're commenting too fast. Wait a moment and try again." and keeps the text and the same client id |
| Alternative flows | A1 Same id retried after the comment was actually stored (network retry): accepted, not counted again |
| Exception flows | — |
| Success criteria | No comment stored beyond the limit; author keeps their text |
| Postconditions | Posting works again once older comments leave the window |
| Affected objects | OBJ-ABU, OBJ-CMT |
| Related screens | Comment thread / composer (OBJ-CMT) |
| Status | Verified (`supabase/tests/280_abuse_limits.test.sql:62-99`, `comments/comments.test.tsx:331-344`) |

### WF-ABU-02 — A comment or an edit is refused as spam
| Field | Value |
| --- | --- |
| User goal | (Member) post or edit a comment |
| Trigger | Send / Save edit |
| Preconditions | Text has more than 2 link prefixes (`http://`, `https://`, `www.`) or 21+ identical non-space characters in a row |
| Main flow | 1. Write reaches the trigger. 2. `comment_looks_like_spam` returns true. 3. 22023 HINT `spam`; nothing stored / edit not applied. 4. Composer shows "The comment was rejected because it looks like spam (too many links or repeated characters)." with the text kept |
| Alternative flows | A1 Edit that leaves the text unchanged: not judged |
| Exception flows | E1 Two ordinary links written with `https://www.` are refused (F-ABU-01) |
| Success criteria | Spam not stored; author understands why |
| Postconditions | — |
| Affected objects | OBJ-ABU, OBJ-CMT |
| Related screens | Comment composer / edit (OBJ-CMT) |
| Status | Verified (`supabase/tests/280_abuse_limits.test.sql:134-162`) |

### WF-ABU-03 — Administrator tunes a threshold
| Field | Value |
| --- | --- |
| User goal | Tighten or relax a limit without a deploy |
| Trigger | Operational need (spam wave, false positives) |
| Preconditions | Service-role / SQL access to the project |
| Main flow | 1. `UPDATE public.abuse_limits SET max_value = …[, window_seconds = …] WHERE code = '…'`. 2. The next comment/report uses the new value |
| Alternative flows | A1 `max_value = 0` freezes the action for every non-exempt account |
| Exception flows | E1 Negative value or non-positive window rejected by CHECK |
| Success criteria | New value effective immediately |
| Postconditions | No audit trail of the change (Q-ABU-01) |
| Affected objects | OBJ-ABU |
| Related screens | None (no admin UI) |
| Status | Verified (SQL test `280_abuse_limits.test.sql:107-111,168-172,192`) |

Report refused by the daily ceiling: see WF-MOD-01 exception E3 (OBJ-MOD).
