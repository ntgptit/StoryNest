# Product Decisions

The decision gate between the Phase 2 proposals and implementation. It separates three things that must not be
confused:

1. **Approved** — decisions already approved in [`docs/WBS.md`](../../WBS.md) §4 (Q1–Q7). Only these are approved.
2. **Recommended / Pending Approval** — recommendations agreed *as proposals* on 2026-11-05. They are **not**
   approved; no FP or BRC changes status because of them.
3. **Open** — questions with no recommendation yet.

Entry point: [README](../README.md). Question texts: [decision register](decision-register.md). Readiness of each
proposal: [implementation-readiness.md](implementation-readiness.md). Approved features (index only):
[approved-feature-backlog.md](approved-feature-backlog.md).

## How a decision becomes approved

1. The Product Owner sets **Status** to `Approved`, `Rejected` or `Deferred` in §3, with date and approver.
2. The same change is recorded in `docs/WBS.md` (§4 for decisions; a work package for approved features). The WBS
   stays the only planning authority.
3. Affected `BRC-*` rows in the decision register are marked approved/rejected; the BR text in `domains/**` is
   changed only when the implementation ships.
4. Approved features are listed in [approved-feature-backlog.md](approved-feature-backlog.md) as a link to the WBS
   work package — never with their own scope text.

Until step 1 happens for an item, agents must treat it as **Proposed** and must not implement it.

> **Note (2026-11-05):** the development tasks are now planned in `docs/WBS.md` Phase 9. WPs that depend on a PD below are
> marked ⚠️ there and start only after the PD is approved here. Planning them did not approve any PD.

> **Note (PR #60):** Q-SHELL-01 (desktop/tablet navigation) was effectively answered by the shipped design (DEC-026) and
> FP-036's open question Q-SET-01 by the device-only theme. Neither was approved here; the Product Owner merged the code.
> PD-01 (shell-less reader) is **not** answered: the reader still lives in the main shell.

## 1. Previously approved decisions (WBS §4, 2026-11-03)

| ID | Decision | Status | Consequence for Phase 2 |
| --- | --- | --- | --- |
| DEC-001 / Q1 | Mobile = Vite + client router; shared screens never import `next/*` | Approved | New frames (FP-043, FP-058) and the workspace (FP-053) must stay router-agnostic in `packages/features` |
| DEC-002 / Q2 | Public URLs `/story/{id}/{slug}`, canonical redirect on slug change | Approved | FP-011 extends redirects to chapters; it must keep this URL form |
| DEC-003 / Q3 | Search with `unaccent` + trigram | Approved | FP-042 builds on it |
| DEC-004 / Q4 | i18n library independent of Next | Approved | FP-021 (server-side language) must not couple strings to Next |
| DEC-005 / Q5 | Two Supabase projects (dev + prod), migrations via CI | Approved (prod not created yet) | Runtime verification runs on `storynest-dev` only |
| DEC-006 / Q6 | Google OAuth in M1; paragraph comments in M2 | Approved; OAuth not delivered | FP-009 |
| DEC-007 / Q7 | Account deletion = anonymise, keep content | Approved; legal policy still open | FP-008 blocked on Q-X-01 |

## 2. Summary

| Status | Count |
| --- | --- |
| Approved (WBS §4) | 7 |
| Recommended / Pending Approval (§3) | 10 |
| Open — needed before the next increments (§4) | 14 |
| Open — later | the remaining questions in the [decision register](decision-register.md) |

## 3. Recommended decisions (Pending Approval)

Recommendations agreed with the Product Owner **as proposals** on 2026-11-05. Each row says what would be decided,
what it unlocks and what stays open. Status for every row: **Recommended / Pending Approval**.

| ID | Topic | Recommendation | Answers | Unlocks if approved | Still open after approval | Status | Approved by / date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PD-01 | Reader frame | Approve a dedicated reading frame without the app header and bottom nav (WBS §1.2 `(reader)`) | Q-READ-02(a)/(b), BRC-SHELL-01 (reader part) | FP-043 | Exact auto-hide behaviour on mobile (design review); the minimal overlap fix for F-READ-01 needs no decision | Recommended / Pending Approval | — |
| PD-02 | Paragraph-comment markers | Default: show a marker only on paragraphs that already have comments; readers can change it (all / with comments / off) in reading settings | Q-READ-02(c), BRC-READ-01 | FP-043 setting | Whether the choice syncs to the account (follows BR-READ-014…017 by default) | Recommended / Pending Approval | — |
| PD-03 | Writing frame | Approve a focused writing frame (no bottom nav, sticky action bar); full mobile-web authoring is **not** a launch requirement | Q-EDT-06, BRC-SHELL-01 (studio part) | FP-058 at **P2** | Mobile authoring scope for the Capacitor app (WBS 7.1) | Recommended / Pending Approval | — |
| PD-04 | Owner / co-author / editor rights | Enforce the documented role limits in the database (RPC + revoked column grants), not only by hiding buttons | Q-TEAM-02 | FP-001 | Q-TEAM-01 (may editors publish?) is still open — see §4 | Recommended / Pending Approval | — |
| PD-05 | Suspension — writes | A suspended account is refused every write on the server (stories, chapters, drafts, comments, follows), with a clear notice | Q-STM-01, Q-CMT-01, Q-LIB-01, Q-AUTH-03 (write part) | FP-002 part B, FP-006 banner | — | Recommended / Pending Approval | — |
| PD-06 | Suspension — published content | What a suspension hides is a **separate policy**. Until it is written, at minimum every discovery list (home, category, tag, search, rankings, recommendations, following feed, sitemap) must behave the same way | Q-MOD-01, Q-HOME-01, Q-STORY-01 (partially) | FP-002 part A (consistency), F-HOME-01, F-SEO-01 | Whether the story page stays readable by direct link; whether comments are hidden | Recommended / Pending Approval | — |
| PD-07 | Save vs Follow | Keep the current data model (`story_saves`, `story_follows`); improve labels, grouping and the library UI first; do not merge the concepts now | Q-LIB-03 (deferred), BRC-LIB-01 (deferred) | FP-048 **stage A only** | Stages B/C of FP-048 stay deferred | Recommended / Pending Approval | — |
| PD-08 | "Recently updated" | Means "a new chapter was published" (order by last chapter publication), not any metadata change | Q-HOME-02, BRC-HOME-01 | FP-040, FP-041 default sort | Q-HOME-03 (length buckets, reading speed) | Recommended / Pending Approval | — |
| PD-09 | Finished reading | Ongoing/hiatus story with every chapter read → "Caught up" + Follow; completed story → "Read again" | Q-STORY-02, BRC-STORY-01 | FP-044 CTA states | Whether finished stories leave the library "Reading" tab | Recommended / Pending Approval | — |
| PD-10 | Legal pages | Draft terms, privacy, community guidelines and copyright pages separately; **legal review is required before publishing them** | Q-X-02 (process, not content) | FP-065 step 1 (drafts), FP-039 footer slots | The legal content itself (Q-X-02), Q-MOD-08 (non-member copyright channel), Q-X-01 (deletion policy) | Recommended / Pending Approval | — |

Notes:
- PD-01 and PD-03 together approve the single "focused frame" pattern described in DEC-014.
- PD-05/PD-06 split FP-002 into a write-enforcement part (can go first) and a content-visibility part (consistency
  now, policy later).
- PD-10 approves a process; no legal text is written by engineering.

## 4. Open questions needed before the next increments

No recommendation exists yet. They block items in increments I-1…I-4 of the
[roadmap](implementation-roadmap.md#53-journey-based-increments).

| Question | Blocks | Why it is needed now |
| --- | --- | --- |
| Q-TEAM-01 May editors publish/schedule? | FP-016 (role copy), FP-001 scope | Invite text and RPC disagree today (F-TEAM-01) |
| Q-X-01 Deletion/retention policy | FP-008 | Legal |
| Q-X-02 Legal content | FP-065 publication, FP-039 links | Legal |
| Q-X-03 Supabase/Google owner actions | FP-009 | Leaked-password protection, redirect URLs, OAuth keys |
| Q-AUTH-02 Where Auth settings are recorded | FP-009 | Several auth rules depend on dashboard settings |
| Q-MOD-04 Lock an author-hidden comment | FP-006 | Moderator decisions can be undone today |
| Q-SEO-01 / Q-MAT-02 / Q-MAT-03 18+ previews, others' lists, sign-out reset | FP-005 | Privacy of minors and shared devices |
| Q-STM-03 Default visibility of a new story | FP-054 (optional default change only) | FP-054 itself is decision-free |
| Q-LIB-04 Meaning of "new" for a kept story | FP-047 | Badge semantics |
| Q-CMT-04 / Q-NOTI-06 Reply-to-reply and thread notifications | FP-049 | Model change (BRC-CMT-01, BRC-NOTI-01) |
| Q-MOD-06 / Q-MOD-07 Appeal process; scope of a block | FP-063, FP-064 | Policy |
| Q-HOME-03 Length buckets, reading speed | FP-040, FP-041 | Filter semantics |
| Q-SHELL-01 / Q-SHELL-02 Desktop/tablet navigation | FP-019 | BRC-SHELL-02 breakpoint |
| Q-JOB-01 / Q-EDT-02 Failed schedule: who is told; who is credited | FP-010 | Accountability |

## 5. Deferred and rejected

| Item | Status | Reason |
| --- | --- | --- |
| FP-048 stages B/C, BRC-LIB-01 | Deferred (recommended, PD-07) | Keep data model; revisit with usage data |
| Reading streaks, referral, @mentions, chapter templates, extra content ratings, web offline reading | Not proposed | See product discovery §6 |
