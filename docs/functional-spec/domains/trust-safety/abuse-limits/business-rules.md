# OBJ-ABU — Abuse limits & spam filter — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-ABU |
| Name | Abuse limits (rate limits) and basic spam filter |
| Business purpose | Stop one account from flooding comments or reports and refuse obviously spammy comments, with thresholds an administrator can tune without a deploy |
| User goals | Readers: threads free of floods and link spam. Honest commenters: never notice the limits; if refused, understand why and keep their text |
| Actors / roles | Member (limited), Moderator (exempt), system/no-user writes (exempt), Administrator (edits thresholds via SQL) |
| Related entities | Table `abuse_limits(code, max_value, window_seconds, note)`; functions `enforce_rate_limit(action)`, `comment_looks_like_spam(text)`, trigger function `guard_comment_abuse`, trigger `comments_guard_abuse` on `comments`; `submit_report` (OBJ-MOD) |
| Dependencies | OBJ-CMT (comment write paths and composer), OBJ-MOD (reports), OBJ-AUTH (sign-up — delegated to Supabase Auth), `_shared/errors.ts`, `packages/validation/src/rpc.ts` |
| Code | `supabase/migrations/20261104002200_abuse_limits.sql`, `supabase/tests/280_abuse_limits.test.sql`, `packages/features/src/comments/model/comment.ts:128-150`, `packages/features/src/moderation/model/report.ts:164-183` |
| WBS status | WP 6.8 🟡 partial — done: comment and report rate limits, comment spam filter, configurable thresholds. Not done: sign-up limit, captcha, IP limits, banned-word list, cross-account duplicate detection, limits on other actions (`docs/WBS.md:226`) |

## 2. Rules

### BR-ABU-001 — Thresholds are data
| Field | Value |
| --- | --- |
| Description | Each limit is one row of `abuse_limits` |
| Preconditions | — |
| Conditions | Defaults: `comment_rate_burst` 10 per 600 s; `comment_rate_day` 200 per 86 400 s; `report_rate_day` 20 per 86 400 s; `comment_max_links` 2 (no window); `comment_max_char_run` 20 (no window). `max_value ≥ 0`, `window_seconds` NULL or > 0 |
| Expected behavior | A changed row applies to the very next write (no cache). `max_value = 0` blocks the action entirely for non-exempt users |
| Exceptions | RLS on, no policy, no grant: clients cannot read or change the table; there is no admin UI (Q-ABU-01). If a content row is deleted, `comment_looks_like_spam` falls back to 2 / 20; if a rate row is deleted that limit simply stops applying |
| Related screens | — |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:3-7,26-39,52-58,80-81`, `supabase/tests/280_abuse_limits.test.sql:36,107-111,124,168-172` |
| Status | Verified (SQL test) |

### BR-ABU-002 — Comment rate limits
| Field | Value |
| --- | --- |
| Description | An account may create at most 10 comments in any 10 minutes and 200 in any 24 h (rolling windows) |
| Preconditions | Signed-in, non-moderator author |
| Conditions | Counted on every `comments` INSERT by the BEFORE trigger, whatever path writes it (RPC `post_comment` or direct INSERT). Count = the author's own rows with `created_at` inside the window, **including replies and deleted comments** |
| Expected behavior | The 11th comment within 10 min → PT429, HINT `comment_rate_burst`; the 201st in 24 h → PT429, HINT `comment_rate_day`. Nothing is stored. Other accounts unaffected |
| Exceptions | Retrying an INSERT whose id already exists is not a new comment (idempotent client retries pass at the limit). Edits are not rate-limited |
| Related screens | Comment composer (OBJ-CMT) |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:8-10,41-71,92-117`, `supabase/tests/280_abuse_limits.test.sql:62-99` |
| Status | Verified (SQL test) |

### BR-ABU-003 — Comment spam filter
| Field | Value |
| --- | --- |
| Description | A comment is refused when it has too many links or a long run of one character |
| Preconditions | Signed-in, non-moderator author; INSERT, or UPDATE that changes `body` |
| Conditions | Links = case-insensitive matches of `(https?://|www\.)`; spam if count > `comment_max_links` (2). Run = any non-whitespace character repeated more than `comment_max_char_run` (20) times in a row (`(\S)\1{20,}`, i.e. 21+) |
| Expected behavior | 22023 with HINT `spam`; nothing stored / edit not applied. Two links pass, three fail; 20 identical characters pass, 21 fail; long runs of spaces are ignored |
| Exceptions | **A URL written as `https://www.…` counts twice** (the scheme and `www.` both match), so two such links count as 4 and are refused (F-ABU-01, verified by running the expression on PostgreSQL 16). An UPDATE that leaves the text unchanged is not judged |
| Related screens | Comment composer and edit (OBJ-CMT) |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:11-13,76-90,105-111`, `supabase/tests/280_abuse_limits.test.sql:134-172` |
| Status | Verified (SQL test + runtime regex check) |

### BR-ABU-004 — Report rate limit
| Field | Value |
| --- | --- |
| Description | An account may file at most 20 new reports in any 24 h |
| Preconditions | Signed-in, active, non-moderator reporter (BR-MOD-004) |
| Conditions | `submit_report` calls `enforce_rate_limit('report')` after the duplicate check; count = own `content_reports` rows created in the window (any status) |
| Expected behavior | 21st new report → PT429, HINT `report_rate_day` → "You've sent too many reports today. Please try again later." |
| Exceptions | Re-reporting an open target returns the existing report and consumes nothing (BR-MOD-007) |
| Related screens | SCR-MOD-02 |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:14,119-184`, `supabase/tests/280_abuse_limits.test.sql:186-196`, `moderation/strings.en.ts:34` |
| Status | Verified (SQL test) |

### BR-ABU-005 — Exemptions
| Field | Value |
| --- | --- |
| Description | Moderators and writes without a signed-in user are never limited or filtered |
| Preconditions | — |
| Conditions | `auth.uid() IS NULL` (service role, outbox worker, seed) or `is_moderator()` |
| Expected behavior | Limits and spam filter skipped |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:16,49-51,96-98`, `supabase/tests/280_abuse_limits.test.sql:117-121,179,196` |
| Status | Verified (SQL test) |

### BR-ABU-006 — Error contract and client mapping
| Field | Value |
| --- | --- |
| Description | Limits and spam refusals reach the UI as typed errors with specific messages |
| Preconditions | — |
| Conditions | PT429 → `AppError.kind = "rateLimited"`; 22023 → `"invalid"`; the Postgres HINT arrives in `AppError.details` (`details ?? hint`) |
| Expected behavior | Comment composer (text kept, inline error): spam → "The comment was rejected because it looks like spam (too many links or repeated characters)."; any limit → "You're commenting too fast. Wait a moment and try again." Report dialog: "You've sent too many reports today. Please try again later." |
| Exceptions | The limit HINT (`comment_rate_burst` vs `comment_rate_day`) is not used: a user at the daily ceiling is told to "wait a moment" (U-ABU-01). The moderation console has no `rateLimited` text (moderators are exempt). `enforce_rate_limit` and `comment_looks_like_spam` are callable by any signed-in user (they act on the caller only) |
| Related screens | Comment composer (OBJ-CMT), SCR-MOD-02 |
| Evidence | `packages/validation/src/rpc.ts:2,27-39`, `packages/features/src/_shared/errors.ts:86-96`, `comments/model/comment.ts:128-150`, `comments/strings.en.ts:65-66`, `comments/components/comment-composer.tsx:52-61`, `comments/comments.test.tsx:322-335`, `moderation/model/report.ts:176-177`, `supabase/migrations/20261104002200_abuse_limits.sql:73-74,89-90` |
| Status | Verified |

### BR-ABU-007 — Edits are checked for spam only
| Field | Value |
| --- | --- |
| Description | Editing a comment re-runs the spam filter but never the rate limit |
| Preconditions | UPDATE of `comments.body` by a non-exempt user |
| Conditions | `TG_OP = 'UPDATE'` and body changed |
| Expected behavior | Editing links in beyond the limit → 22023 `spam`; the stored text is unchanged |
| Exceptions | Status-only updates (hide/delete) are not judged |
| Related screens | Comment edit (OBJ-CMT) |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:99-111`, `supabase/tests/280_abuse_limits.test.sql:154-162` |
| Status | Verified (SQL test) |

### BR-ABU-008 — Sign-up limit and captcha are not implemented
| Field | Value |
| --- | --- |
| Description | WBS 6.8 asks for a sign-up rate limit and a captcha on sign-up; neither exists in the repository |
| Preconditions | — |
| Conditions | Sign-up is Supabase Auth; its own rate limits and captcha (hCaptcha/Turnstile) must be enabled in the project's Auth settings with provider keys, and the app must pass a captcha token to `signUp` |
| Expected behavior | Today: only Supabase Auth's hosted default limits apply; no `supabase/config.toml` in the repo records them; no captcha widget or token. A Supabase Auth 429 (`over_request_rate_limit`, `over_email_send_rate_limit`, `over_sms_send_rate_limit`) is shown as "You're going too fast. Try again in a few minutes." (OBJ-AUTH) |
| Exceptions | — |
| Related screens | SCR-AUTH-* (register, owned by OBJ-AUTH) |
| Evidence | `supabase/migrations/20261104002200_abuse_limits.sql:20-22`, `docs/WBS.md:226` ("chưa làm giới hạn đăng ký và captcha"), `packages/features/src/auth/model/messages.ts:30-32,44-45`, `auth/strings.en.ts:74`; repo search for `captcha`/`turnstile` finds only the migration comment |
| Status | Documented (not done) / Verified absent |

### BR-ABU-009 — Actions without an abuse limit
| Field | Value |
| --- | --- |
| Description | Only comments and reports are throttled |
| Preconditions | — |
| Conditions | No rate limit on votes, comment likes, story/author follows, saves, story or chapter creation, reading-list writes, profile edits; no IP-level limits (the DB does not see client IPs), no banned-word list, no cross-account duplicate detection |
| Expected behavior | Structural caps owned elsewhere still apply (e.g. 100 reading lists per account, 500 items per list — OBJ-LIST) |
| Exceptions | — |
| Related screens | — |
| Evidence | `docs/WBS.md:226` ("Chưa làm … (2) giới hạn theo địa chỉ IP … (3) danh sách từ cấm … (4) giới hạn các thao tác khác"), `supabase/migrations/20261104000900_reading_lists.sql:25-49` |
| Status | Documented (not done) |

## 3. Open questions
- **Q-ABU-01** — Who may change `abuse_limits` in production and how is a change recorded (no UI, no audit row)?
  Evidence `20261104002200_abuse_limits.sql:3,38`.
- **Q-ABU-02** — Should the link rule count URLs (one per link) rather than prefixes? Is 2 links per comment the
  intended policy for a reading app where readers share references? Evidence BR-ABU-003, F-ABU-01.
- **Q-ABU-03** — Should limited users see when they can try again (the server knows the window but returns only the
  code)?
