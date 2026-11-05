# D-TRUST — Trust & Safety (domain overview)

## Purpose
Keep the platform safe without blocking ordinary reading and writing:

- readers **report** stories, chapters, comments and accounts; **moderators** work a queue and act (hide/unhide a
  comment, remove/restore a story, suspend/reinstate an account), every action leaving an audit row (OBJ-MOD);
- **adult (18+) stories** are hidden by default everywhere and shown only after a self-declared age confirmation; a
  gate stands in front of an 18+ story opened by link (OBJ-MAT);
- **abuse limits** throttle comments and reports per account and refuse obvious spam comments (OBJ-ABU).

All authoritative rules live in the database (`SECURITY DEFINER` RPCs, guard triggers, RLS). The client only chooses
which buttons to show.

Documented scope: `docs/WBS.md:211` (WP 5.6), `docs/WBS.md:219` (WP 6.1), `docs/WBS.md:220` (WP 6.2, owned by
OBJ-CMT), `docs/WBS.md:221` (WP 6.3, account copy of the 18+ choice), `docs/WBS.md:226` (WP 6.8, partial).

## Actors

| Actor | How identified | Trust & Safety capabilities | Evidence |
| --- | --- | --- | --- |
| Guest | No session | Sees no 18+ story by default; can turn 18+ on for the device after confirming age; "Report" sends them to `/login?next=<path>`; `/moderation` redirects to login | `adult-content/model/store.ts:14,53-55`, `moderation/components/report-button.tsx:364-366`, `apps/web/src/lib/auth/route-guard.ts:44` |
| Member (reader / author) | Signed in, `app_users.account_status = 'active'` | Report anything they can see that is not their own (20 per 24 h); 18+ choice saved to the account; comments limited to 10 / 10 min and 200 / day, spam filter | `supabase/migrations/20261104002000_moderation.sql:130-175`, `20261104002200_abuse_limits.sql:32-37` |
| Story owner / co-author | `story_role` owner/co_author | Hides/unhides comments on their own story — **owned by OBJ-CMT** (`domains/community/comments/`, WP 6.2); cannot bring back a story a moderator removed | `20261104001800_comment_moderation_by_author.sql:1-22`, `20261104002000_moderation.sql:102-116` |
| Moderator | JWT `app_metadata.role = 'moderator'` (set only by service role) | `/moderation` console, all moderation RPCs, reads the audit table; exempt from comment/report rate limits and the spam filter | `20261103000100_auth_and_rls.sql:10,69-72`, `apps/web/src/lib/auth/require-user.ts:22`, `20261104002200_abuse_limits.sql:16,49,96` |
| Suspended member | `account_status = 'suspended'` (by `moderate('suspend_user')`) | Can still sign in; every write that requires `is_active_account()` is refused (42501): report, comment, follow, create story… No UI notice | `20261103000100_auth_and_rls.sql:74-80`, `supabase/tests/260_moderation.test.sql:241` |
| Administrator (no UI) | Service role / SQL | Grants the moderator role, edits `abuse_limits` thresholds, reads audit log via SQL | `20261104002200_abuse_limits.sql:3,38-39`, `docs/WBS.md:219` ("Chưa làm") |

## Business objects

| Object ID | Name | Folder | Screens | Rules | Workflows |
| --- | --- | --- | --- | --- | --- |
| OBJ-MOD | Reports & moderation console | [moderation](moderation/business-rules.md) | [SCR-MOD-01 Moderation console `/moderation`](moderation/screens/moderation-console.md), [SCR-MOD-02 Report dialog (embedded)](moderation/screens/flag-content-dialog.md) | BR-MOD-001…021 | [WF-MOD-01…06](moderation/workflows.md) |
| OBJ-MAT | Mature (adult, 18+) content | [mature-content](mature-content/business-rules.md) | [SCR-MAT-01 Adult content gate (embedded) + header toggle](mature-content/screens/adult-content-gate.md) | BR-MAT-001…011 | [WF-MAT-01…04](mature-content/workflows.md) |
| OBJ-ABU | Abuse limits & spam filter | [abuse-limits](abuse-limits/business-rules.md) | none (rules + workflows only) | BR-ABU-001…009 | [WF-ABU-01…03](abuse-limits/workflows.md) |

**Not in this domain:** author-side comment moderation (story owner / co-author hides and unhides comments on their
own story, `set_comment_hidden`, `comment_hides`, "hidden by author" notices) is owned by **OBJ-CMT** in
`domains/community/comments/`. OBJ-MOD only references it where a moderator's action meets the author's (BR-MOD-011).

## Cross-domain dependencies

| This domain needs / affects | Object | How | Evidence |
| --- | --- | --- | --- |
| Story readability (`can_read_story`, visibility, soft delete) | OBJ-STORY, OBJ-STM | A report target must be readable; "remove story" reuses `stories.deleted_at`, so a removed story behaves like a deleted one (404 to readers, listed in the author's Studio "Deleted stories") | `20261104002000_moderation.sql:139-148,389`, `packages/features/src/studio/screens/studio-screen.tsx:154-200` |
| Comment status and hide source | OBJ-CMT | Moderator hide/unhide goes through `moderate()`; the `comment_hides` trigger records `source = 'moderator'`; direct status UPDATE to/from `hidden` is refused | `20261104002000_moderation.sql:75-89,362-377`, `supabase/tests/260_moderation.test.sql:175` |
| Account status | OBJ-AUTH, OBJ-PRF | Suspension flips `app_users.account_status`; profile (`app_users_read`) and author page hide the account | `20261103000100_auth_and_rls.sql:182-184`, `20261104001600_author_follows.sql:50` |
| Discovery lists | OBJ-HOME, OBJ-SRCH, OBJ-RANK, OBJ-REC, OBJ-AUTHOR | Every list passes `useShowMature()` (BR-MAT-005); most RPCs also drop suspended owners (see discovery overview matrix, F-HOME-01) | `domains/discovery/overview.md` |
| Library, reading lists | OBJ-LIB, OBJ-LIST | 18+ stories the user saved stay visible by decision (BR-MAT-007); others' public lists are not filtered (F-MAT-02) | `docs/WBS.md:211` |
| Settings page | OBJ-SET | `/settings` hosts an "Adult content (18+)" switch that uses the same store (BR-MAT-003) | `packages/features/src/settings/screens/settings-screen.tsx:152-171` |
| Header & menu | OBJ-SHELL | Header hosts the 18+ toggle; user menu shows "Moderation" to moderators only | `shell/components/site-header.tsx:18`, `shell/components/user-menu.tsx:69-73` |
| SEO | OBJ-SEO | 18+ stories are `noindex`, no JSON-LD, not in sitemap; but metadata/OG still carry the title (F-MAT-01) | `story/model/story-detail.ts:24-26`, `apps/web/src/lib/seo/sitemap-data.ts:29,55` |
| Error contract | OBJ-SHELL (`_shared/errors.ts`) | 42501/PT404/PT409/22023/PT429 → `forbidden/notFound/conflict/invalid/rateLimited`; spam HINT passes through `details` | `packages/validation/src/rpc.ts:27-39`, `packages/features/src/_shared/errors.ts:86-96` |
| Sign-up limits / captcha | OBJ-AUTH | Not implemented; delegated to Supabase Auth project settings (BR-ABU-008) | `20261104002200_abuse_limits.sql:20-22` |
| Notifications | OBJ-NOTI | No moderation notification type exists (reported party / reporter are never told) | `docs/WBS.md:219` ("Chưa làm") |

## Domain-level open questions
- **Q-MOD-01** — What exactly should suspension hide (stories in every list, comments, sitemap, sign-in itself)? See
  [moderation/business-rules.md](moderation/business-rules.md#br-mod-016--effects-of-a-suspension).
- **Q-MOD-02** — Moderator role revocation only takes effect when the user's JWT is refreshed. Acceptable?
- **Q-MAT-01** — Should the age confirmation be asked again after the reader hides 18+ content?
- **Q-ABU-01** — Who changes `abuse_limits` thresholds in production, and how (there is no UI)?

Full list: the "Open questions" sections of each object file.
