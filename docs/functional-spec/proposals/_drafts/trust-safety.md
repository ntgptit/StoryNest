# Draft trust-safety

Agent key `trust-safety` · Phase 2 (Product Discovery & Screen Enhancement) · 2026-11-05 · reserved FP range
FP-063…FP-066 (all four used). Baseline: Phase 1 spec (`docs/functional-spec/`, commit `204a1ea`) + code at HEAD
`704d4ea` (no code change in `moderation`, `adult-content` or `supabase/migrations` since the baseline).

Scope: OBJ-MOD, OBJ-MAT, OBJ-ABU; screens SCR-MOD-01, SCR-MOD-02, SCR-MAT-01; journeys JRN-MOD-01…08.

**Runtime limits.** Runtime evidence is guest-only (screenshots `rt2/shots/{m,t,d}-{story,reader,mature-gate}.png`,
`metrics.json`, Phase 1 RT-06/RT-10). The moderation console, the report dialog, the 18+ header dialog and all
signed-in flows were **not** run in a browser. Statements about them are Verified (Code), Documented or Inferred.
Line numbers in this draft were re-read at HEAD. Some Phase 1 citations for `report-button.tsx` (`:309-421`) do not
match the 143-line file. The current lines are cited here.

---

## 1. Journeys

### JRN-MOD-01 — Reviewing reported content (moderator triage)

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-01 |
| User goal | Moderator: clear the queue, handling the most harmful items first, without two moderators doing the same work |
| Current workflow | WF-MOD-02. Avatar menu "Moderation" → `/moderation` → "Pending" tab (pending + reviewing, oldest first, 20 per page). There is **one card per report** with kind, status and reason badges, title or excerpt, state, details, "Reported by …" and "N pending reports about this item". Buttons per card open a reason dialog. Confirm runs the RPC, shows the toast "Done." and refetches every moderation query. |
| Friction points | **Confirmed (Code):** (1) N reports about one target produce N cards. The first action closes all of them (BR-MOD-017), but the others stay on screen until the refetch, which invites a second action and a PT409 (`moderation-screen.tsx:46-47,74-83` → `InfiniteList` of reports, `report-card.tsx:50-63`). (2) Only one order exists: oldest first. A hate or violence report waits behind older spam (`list_reports` only takes `p_newest_first`, `20261104002000_moderation.sql:280-285`). (3) The filed date is loaded but never shown (`report.ts:62` `createdAt` is used only as the cursor, U-MOD-01). (4) Nothing shows that another moderator is reviewing: `reviewed_by` is returned by the SQL type (`moderation.sql:207-208`) but dropped by `ReportRow` (`report.ts:37-54`). (5) There are only two tabs and no filter, and the tab is not in the URL (U-MOD-02). **Hypothesised:** at 390 px, a card with 3–4 small buttons wraps into several rows that mix destructive and neutral actions (`report-card.tsx:100-156`, `size="sm"`), which raises misclick risk. Not observed: the console was not run. |
| Missing capabilities | Case view grouped by target; severity priority; "under review by" visibility; filters and deep links; a responsive list/detail layout |
| Proposed improvement | Case-based queue, priority order, claim visibility, URL filters, list/detail layout: **FP-024 amendment** (§5) + **SE-MOD-01** |
| Expected value | One decision per target instead of N; the most harmful items are handled first; fewer conflicts between moderators |
| Affected screens | SCR-MOD-01 |
| Dependencies | FP-065 (guidelines define the severity tiers), Q-MOD-05 |
| Evidence | Verified (Code) as cited; Documented `docs/WBS.md:219` (scope of WP 6.1) |

### JRN-MOD-02 — Investigating a violation (context, history, audit log)

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-02 |
| User goal | Moderator: before acting, understand what was reported and why, what happened to this target before, and the record of the account behind it |
| Current workflow | The card shows title or comment excerpt (≤ 300 chars), state, reporter name and the reporter's details. "Open content" leaves the console in the same tab. The audit log can be read by SQL only. |
| Friction points | **Confirmed (Code):** (1) There is no history UI (BR-MOD-018; `docs/WBS.md:219` "Chưa làm: xem lịch sử audit trên giao diện"). The data is already readable by moderators: `GRANT SELECT` + policy `moderation_actions_read` (`moderation.sql:50-51`), with index `idx_moderation_actions_target`, so this is a UI-only gap. (2) "Open content" for a **removed** story or chapter lands on the not-found state. The public queries filter `.is("deleted_at", null)` (`story/api/story.api.ts:33,50`, `reader/api/reader.api.ts:31`) although `can_read_story`/`can_read_chapter` already allow moderators (`20261103000100_auth_and_rls.sql:93-111`). So a moderator cannot re-read what was removed when they consider a reversal or an appeal. (3) A chapter report does not say which passage is meant, so the moderator has to read the whole chapter. (4) A user report shows nothing about the account's other reports or past actions, and a comment report does not show the comment's author (U-MOD-01). (5) Leaving the console to look at content loses the queue position: there is no "back to queue" and the tab is not in the URL (SCR-MOD-01-A04). |
| Missing capabilities | Per-target and per-account history; read-only preview of removed content for moderators; a passage anchor on chapter reports; investigation inside the console |
| Proposed improvement | Case detail with Subject preview (including removed content), History (target + owner account) and Other cases of the owner: **FP-024 amendment**, **SE-MOD-01-AC05/06/12**. Paragraph anchor: **SE-MOD-02-AC10**. Version history for moderators stays under Q-HIST-02. |
| Expected value | Decisions that are consistent and can be defended; reversals and appeals (FP-063) judged on the actual content |
| Affected screens | SCR-MOD-01; SCR-MOD-02 (anchor); SCR-READ-01 (paragraph sheet entry, owned by the reading agent) |
| Dependencies | FP-024; Q-HIST-02 |
| Evidence | Verified (Code) as cited |

### JRN-MOD-03 — Applying and reversing moderation actions

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-03 |
| User goal | Moderator: apply the *smallest sufficient* action, record why in terms of policy, undo a mistake |
| Current workflow | WF-MOD-03 / WF-MOD-04: hide or unhide a comment, remove or restore the whole story, suspend or reinstate an account. Each needs a free-text reason of 3–1000 chars and writes an audit row. Content actions close every open report on the target. |
| Friction points | **Confirmed (Code):** (1) Actions are coarse. A chapter report can only remove the whole story (BR-MOD-013, Q-MOD-03). A "Sexual content" report on a story that should simply be rated 18+ can only be met by removal, because moderators cannot set `is_mature` (BR-MAT-011, Q-MAT-04). Suspension has no duration, and there is no warning step. (2) The dialog does not state the consequence (U-MOD-01, SCR-MOD-01-AC14). (3) "Restore story" is offered for stories the author deleted and always fails (F-MOD-03). (4) A moderator cannot lock a comment the author hid (F-MOD-04). (5) The reason is internal free text with no link to a policy section; the placeholder cites "the harassment policy", which does not exist (`moderation/strings.en.ts:87`; no policy page in `apps/web/src/app`, see FP-065). (6) A reversal tells nobody, and the closed reports stay closed (BR-MOD-017). **Hypothesised:** with inconsistent free-text reasons, the user-facing notices of FP-006 will be either empty or unsafe to show. |
| Missing capabilities | Graduated actions (mark 18+, chapter-level removal, timed suspension); consequence text; reason = guideline section + internal note + optional message to the user; notices on reversal |
| Proposed improvement | **FP-024 amendment** (graduated actions, consequence text, structured reason), **FP-006 amendment** (notice standard), BRC-MAT-02 (moderator sets 18+) |
| Expected value | Proportionate enforcement: fewer whole-story removals and authors kept on the platform; audit reasons that can be shown to users |
| Affected screens | SCR-MOD-01; SCR-STM-01 (removed state, FP-006); SCR-CMT-01 (comment note) |
| Dependencies | FP-006, FP-065, Q-MOD-03, Q-MAT-04 |
| Evidence | Verified (Code) as cited |

### JRN-MOD-04 — Managing sensitive (18+) content

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-04 |
| User goal | Reader: never see adult content without opting in. Adult reader: opt in once. Moderator: correct a story with the wrong rating. Author: know when to mark a story 18+ |
| Current workflow | The author ticks "Mature content (18+)" in the story form. Lists exclude 18+ unless the device or account choice is "shown" (BR-MAT-006). A gate stands in front of 18+ story and chapter pages. The header shield button and `/settings` switch the choice. |
| Friction points | **Confirmed (Runtime):** the gate is shown to guests at 390/768/1280 px (`*-mature-gate.png`), while the tab title still leaks the story title (RT-06, F-MAT-01). The header control is a bare shield icon between Search and "VI", with no text and no visible state (`m-mature-gate.png`, `d-mature-gate.png`). On the 390 px gate page, 7 of 11 controls are < 44 px (`metrics.json`). **Confirmed (Code):** "Continue" at the gate switches 18+ **on for every list on the device/account** (`use-adult-content.ts:15`), but the gate copy only says "Confirm that you are 18 or older to view it" (`adult-content/strings.en.ts` `gate.description`). There is no toast and no undo (SCR-MAT-01 §D "Success: no toast"). "Go back" does nothing without history (U-MAT-01). Turning 18+ back on re-asks the age statement although WBS 5.6 says it should not (Q-MAT-01). Moderators cannot re-rate a story (BR-MAT-011). The Studio hint is inaccurate: "18+ stories are hidden from the home page by default." (`studio/strings.en.ts:187`) when they are hidden from **every** list and gated (BR-MAT-006/009). Age is only self-declared and no age is collected at sign-up (BR-MAT-002). **Hypothesised:** a reader who confirms in order to read one shared story does not expect their home and search lists to fill with 18+ stories. |
| Missing capabilities | Gate copy that states the effect, plus an undo; a header control that shows its state; a moderator re-rating action; author guidance on what counts as 18+; (decision) age at sign-up for minors |
| Proposed improvement | **SE-MAT-01**; **FP-005 amendment** (gate copy/undo, Studio hint, header state); **FP-024 amendment** + BRC-MAT-02 (moderator "Mark 18+"); **FP-065** (guidelines section "Mature content"); Q-MAT-05 (age at sign-up), Q-MAT-06 (scope of the gate confirmation) |
| Expected value | Fewer surprise exposures; mis-rated stories fixed without removal; authors rate correctly first time |
| Affected screens | SCR-MAT-01, SCR-SHELL-01, SCR-SET-01, SCR-STM-02/03 (hint), SCR-MOD-01 |
| Dependencies | FP-005, FP-022 (U-MAT-02), FP-065 |
| Evidence | Runtime screenshots + Verified (Code) as cited; Documented `docs/WBS.md:211` |

### JRN-MOD-05 — Exceptional cases: appeals, legal/copyright takedowns, account lifecycle requests

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-05 |
| User goal | Affected member: contest a decision. Rights holder: get infringing content taken down (WBS 6.9 "DMCA/khiếu nại bản quyền"). Any person: exercise account or data rights. Operator: handle each through a recorded process |
| Current workflow | Appeals: none (WF-MOD-06 success criteria "Not met: … no appeal path"). Copyright: a **member** can report with reason "Copyright infringement" and free-text details. Guests are sent to sign in (BR-MOD-004) and `anon` cannot call `submit_report`. Legal pages: none (WBS 6.9 ⬜). Account lifecycle: none (WBS 6.4 ⬜, FP-008 blocked on Q-X-01). |
| Friction points | **Confirmed (Code):** no appeal entity, RPC or UI. No route or text for terms, privacy, community guidelines or copyright anywhere in `apps/web/src/app` or `packages/features/src` (repo search), and the shell has no footer to link them from (`shell/components/` has only header, menu and language switcher). Copyright reports carry no structured claim (original work, claimant relationship) (`report-button.tsx:102-123`). A suspended account cannot write anything gated by `is_active_account()` (BR-MOD-016), so it cannot even send a support request in-app. **Documented:** legal policy open (`docs/WBS.md` §4 "Còn mở"). **Inferred:** a mobile store release (Phase 7) requires a public privacy policy URL. |
| Missing capabilities | Appeal per action; community guidelines + terms + privacy + copyright pages; structured copyright claims and a contact path for rights holders without an account; operator handling of lifecycle requests |
| Proposed improvement | **FP-063** Appeals; **FP-065** Guidelines, legal pages and copyright requests; lifecycle → FP-008 (referenced, owned by the account agent) |
| Expected value | Due process for authors; a legal baseline before launch; takedowns that can be audited |
| Affected screens | SCR-MOD-01, SCR-MOD-02, SCR-STM-01, SCR-SHELL-01, SCR-AUTH-02 (consent line), new policy pages |
| Dependencies | FP-006 (notices are where the appeal starts), FP-008, Q-X-01, Q-X-02 |
| Evidence | Verified (Code) as cited; Documented `docs/WBS.md:222,227`, §4 |

### JRN-MOD-06 — Platform operator tasks (roles, abuse thresholds, job health)

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-06 |
| User goal | Operator/admin: add or remove moderators, tune abuse limits during a spam wave, see that background jobs are healthy, and have every such change audited |
| Current workflow | Moderator role: service role writes `auth.users.raw_app_meta_data.role` (BR-MOD-001). Thresholds: `UPDATE public.abuse_limits …` by SQL (WF-ABU-03). Jobs: no health surface (F-JOB-02). |
| Friction points | **Confirmed (Code/Documented):** no UI for roles (`docs/WBS.md:219` "Chưa làm: cấp/thu vai moderator qua giao diện"). A revoked moderator keeps access until the JWT refreshes (Q-MOD-02). Threshold changes leave no audit row (Q-ABU-01). Dead letters and cron failures produce no signal (F-JOB-02, FP-010). There is no global browse of the audit log. **Hypothesised:** during an incident, depending on a person with SQL access delays the response. |
| Missing capabilities | Staff role management with audit; threshold editor with audit; job health panel; global audit log |
| Proposed improvement | **FP-066** Operations area in the console (+ BRC-MOD-01). Job health data comes from **FP-010** (`job_health()`), linked rather than duplicated. |
| Expected value | Faster incident response; accountability for every privileged change |
| Affected screens | SCR-MOD-01 (new Operations tab) |
| Dependencies | FP-010, FP-007, Q-MOD-02, Q-ABU-01, Q-MOD-09 |
| Evidence | Verified (Code) `20261104002200_abuse_limits.sql:3-7,38-39`; Documented `docs/WBS.md:219,226,251` |

### JRN-MOD-07 — Reporter's side of a case

> Role is reader/member. Numbered under MOD to avoid colliding with other agents' RDR numbering; see §7.

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-07 |
| User goal | Reader: flag harmful content in a few taps, know it was received and handled, and protect themselves from the person meanwhile |
| Current workflow | WF-MOD-01. The ghost "Report" button sits on the story page (own row under the actions), at the end of a chapter, on others' comments and on author pages. A guest goes to `/login?next=<pathname>`. A member gets the dialog: reason Select (7 values), optional details ≤ 2000, toast "Report sent. Thank you." After that, nothing. |
| Friction points | **Confirmed (Runtime):** Report is visible to guests on the story page and the reader (RT-10). On the story page it occupies its own row below the actions at 390 and 1280 px (`m-story.png`, `d-story.png`). **Confirmed (Code):** (1) After sign-in the guest returns to the pathname only. The query, the hash and the dialog intent are lost, so the guest must find the button again, which matters for a comment deep in `#comments` (`report-button.tsx:86-88`, BR-MOD-004). (2) The owner sees Report on their own story or chapter (F-MOD-01 / F-STORY-01; `story-screen.tsx:113`, `reader-screen.tsx:115` pass no `ownerId`). (3) Reasons have no descriptions and there is no guideline link. (4) The button has no "Reported" state (U-MOD-03); re-reporting shows success again. (5) Reporters cannot see the status or the outcome (FP-031; BR-MOD-021). (6) There is no self-protection: a harasser's replies keep notifying the reporter, and no block exists (repo search: no block/mute table or RPC). |
| Missing capabilities | Intent kept across sign-in; reason help; success view with next steps; "Reported" state; "My reports" with outcome; block |
| Proposed improvement | **SE-MOD-02**; **FP-031 amendment**; **FP-064** Block; reporter notice in **FP-006 amendment** |
| Expected value | More, better-quality reports; trust that reporting works; immediate relief for harassment targets |
| Affected screens | SCR-MOD-02 and hosts SCR-STORY-01, SCR-READ-01, SCR-CMT-01, SCR-AUTHOR-01; SCR-SET-01 (blocked list) |
| Dependencies | FP-031, FP-064, FP-006, FP-065 |
| Evidence | Runtime screenshots; Verified (Code) as cited |

### JRN-MOD-08 — Affected author or member's side of a case

> Role is author/member. Numbered under MOD; see §7.

| Field | Value |
| --- | --- |
| Journey ID | JRN-MOD-08 |
| User goal | Author/commenter/suspended member: learn what was actioned, why (which rule), what they can still do, and how to contest it |
| Current workflow | WF-MOD-06. Removed story: readers get 404; Studio lists it under "Deleted stories" with a Restore button that fails. Hidden comment: inline "A moderator hid this comment. Only you can see it." Suspended: every write fails with each feature's generic "forbidden" text. |
| Friction points | **Confirmed (Code):** F-MOD-02 (a removal looks like the author's own deletion, and Restore fails), F-MOD-06 (no notice, no reason, no banner), no appeal (WF-MOD-06 "Not met"). Suspension effects are inconsistent (F-MOD-05, FP-002). |
| Missing capabilities | Notice with rule and date; a removed state distinct from a deletion; suspension banner; appeal |
| Proposed improvement | **FP-006 amendment** (notice standard and entry points), **FP-002 amendment** (banner content), **FP-063** (appeal) |
| Expected value | Less confusion and fewer support requests; due process; authors retained |
| Affected screens | SCR-STM-01, SCR-CMT-01, SCR-SHELL-01, SCR-NOTI-01 |
| Dependencies | FP-002, FP-006, FP-063 |
| Evidence | Verified (Code) `studio-screen.tsx:150-200`, `comments/components/comment-item.tsx:89-93` (per Phase 1), BR-MOD-016/021 |

---

## 2. Capability rows

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-TNS-01 | Report story, chapter, comment, account | Implemented | BR-MOD-002…008; Runtime RT-10 | Readers can flag harm | none (polish in SE-MOD-02) |
| CAP-TNS-02 | Report reason guidance and a public content policy (community guidelines) | Missing | No policy route or text (repo search); moderator placeholder cites a non-existent policy (`moderation/strings.en.ts:87`) | Readers report accurately; authors know the rules; moderators cite rules | FP-065 |
| CAP-TNS-03 | Reporter feedback ("Reported" state, my reports, outcome) | Missing | U-MOD-03; BR-MOD-021 (RLS allows own rows, no UI) | Trust that reporting works | FP-031 (amended) |
| CAP-TNS-04 | Moderation queue triage | Partial (per-report list, 2 tabs) | BR-MOD-019, U-MOD-01/02 | Moderator throughput | FP-024 (amended) |
| CAP-TNS-05 | Case grouping and severity priority | Missing | `moderation-screen.tsx:74-83`; `list_reports` order only by date | Worst harm handled first; no duplicate work | FP-024 (amended) |
| CAP-TNS-06 | Investigation context (target/account history, preview of removed content) | Partial (data readable, no UI; removed content opens as not-found) | `moderation.sql:50-51`; `story.api.ts:33`, `reader.api.ts:31` | Correct, consistent decisions | FP-024 (amended) |
| CAP-TNS-07 | Graduated actions (mark 18+, chapter removal, timed suspension, lock author-hidden comment) | Partial (3 binary actions) | BR-MOD-011…014, BR-MAT-011, Q-MOD-03/04, Q-MAT-04 | Proportionate enforcement | FP-024 (amended), FP-006 |
| CAP-TNS-08 | Moderation transparency to affected parties (notice, rule, date) | Missing | F-MOD-02, F-MOD-06, BR-MOD-021 | Understanding, fewer support requests | FP-006 (amended) |
| CAP-TNS-09 | Appeals | Missing | WF-MOD-06 "Not met" | Due process; correction of errors | FP-063 |
| CAP-TNS-10 | Suspension enforced consistently | Partial | F-MOD-05, F-HOME-01, BR-MOD-016 | Moderation that actually works | FP-002 (amended) |
| CAP-TNS-11 | Block another user (self-service safety) | Missing | No block/mute table, RPC or UI (repo search over `supabase/migrations`, `packages/features`) | Immediate protection from harassment without waiting for a moderator | FP-064 |
| CAP-TNS-12 | Author-side comment moderation on own story | Implemented (OBJ-CMT) | `20261104001800_comment_moderation_by_author.sql`, WBS 6.2 | Authors keep their threads civil | none |
| CAP-TNS-13 | 18+ filter, gate, cross-device choice | Implemented (client-side gate; server leaks) | BR-MAT-001…010; Runtime RT-06 | Readers are not surprised by adult content | FP-005 (amended) |
| CAP-TNS-14 | Age-appropriate experience for minors (age at sign-up, 18+ locked for minors) | Missing (self-declaration only) | BR-MAT-002; WBS 5.6 "chưa có bước kiểm tra tuổi thật" | Protects minors on shared/personal devices | none until Q-MAT-05 is decided |
| CAP-TNS-15 | Content warnings / ratings beyond one 18+ flag | Missing | Only `stories.is_mature` | Finer reader choice | none: not justified now. Free tags already carry themes (OBJ-TAX), and a second rating axis would multiply the filter matrix of BR-MAT-006. Revisit after launch data. |
| CAP-TNS-16 | Rate limits and comment spam filter | Partial | BR-ABU-001…009, F-ABU-01/03 | Threads free of floods | FP-007 (amended) |
| CAP-TNS-17 | Sign-up abuse protection (captcha, sign-up limit) | Missing | BR-ABU-008, F-ABU-02 | Fewer throwaway abuse accounts | FP-009 (reference only) |
| CAP-TNS-18 | Terms of service and privacy policy | Missing | WBS 6.9 ⬜; no routes | Legal baseline; app-store requirement (Inferred) | FP-065 |
| CAP-TNS-19 | Copyright / legal takedown requests | Partial (member report with reason "copyright", free text only) | BR-MOD-003/004; WBS 6.9 | Rights holders served; audited takedowns | FP-065 |
| CAP-TNS-20 | Account lifecycle (deactivate, delete/anonymise, export) | Missing | WBS 6.4 ⬜, F-AUTH-07 | Privacy rights | FP-008 (reference only, account agent) |
| CAP-TNS-21 | Moderator role management | Missing (service-role SQL) | BR-MOD-001; `docs/WBS.md:219` | Team changes without engineers; quick revocation | FP-066 |
| CAP-TNS-22 | Abuse threshold administration with audit | Missing (SQL, no audit) | WF-ABU-03, Q-ABU-01 | Accountable tuning during incidents | FP-066 |
| CAP-TNS-23 | Audit log browsing | Missing UI (table readable by moderators) | BR-MOD-018 | Accountability, investigations | FP-024 (per target), FP-066 (global) |
| CAP-TNS-24 | Job health visible to operators | Missing | F-JOB-02 | Stoppages noticed | FP-010 (reference), surfaced in FP-066 |
| CAP-TNS-25 | Reporter identity kept private from the reported party | Implemented | Queue is moderator-only (`list_reports` 42501, `moderation.sql:292-294`); notifications have no moderation types | Safe to report | none (keep as a rule in FP-006/FP-031 notices) |
| CAP-TNS-26 | Moderation reaches every copy (notification excerpts) | Missing | F-NOTI-02 | Hidden abuse not readable elsewhere | FP-013 (reference only) |

---

## 3. Screen enhancements

### SE-MOD-01 — Moderation console (SCR-MOD-01)

**Current experience**
- *Purpose:* report queue for moderators (BR-MOD-019/020). The route is `(main)/moderation`, inside the main shell
  with header and mobile bottom nav. WBS §1.2 planned an `(admin)/moderation` group (`docs/WBS.md` §1.2 tree line
  "(admin)/moderation/"). Verified (Code).
- *Structure:* PageHeader "Moderation" + description; Tabs "Pending" / "Resolved"; `InfiniteList` of `ReportCard`
  (badges → title → "Status · Open content" → details → "Reported by" → button row); a reason dialog per card
  (`moderation-screen.tsx:49-86`, `report-card.tsx:67-190`). Max width `max-w-3xl` (`moderation-screen.tsx:50`).
- *Actions:* content actions (hide/unhide, remove/restore, suspend/reinstate) and report actions (under review,
  resolve, dismiss). Each needs a 3–1000 char reason.
- *Known limitations:* U-MOD-01 (no date, comment author, closed-by, consequence), U-MOD-02 (no filters or URL),
  F-MOD-03 (Restore offered for author-deleted), F-MOD-04 (cannot lock author-hidden), F-MOD-07 (no history),
  Q-MOD-03, Q-HIST-02. **Not run at runtime** (signed-in only).

**Identified opportunities**
- *Missing functionality:* case grouping by target. Verified (Code): one card per report. Severity ordering. Verified
  (Code): date order only. History panel. Verified (Code): data readable via RLS, no UI. Preview of removed content.
  Verified (Code): `story.api.ts:33`, `reader.api.ts:31`. Graduated actions. Verified (Code): BR-MOD-011…014.
- *UX/UI:* destructive and neutral buttons share one wrapping row of `size="sm"` buttons. Verified (Code)
  `report-card.tsx:100-156`; the effect at 390 px is Inferred. There is no consequence text (Verified (Code)). The toast
  "Done." does not name the action (Verified (Code) `strings.en.ts:94`).
- *Workflow:* the "Under review" status is not shown to other moderators. Verified (Code): `reviewed_by` is dropped
  in `report.ts:37-54`. "Open content" leaves the console with no way back to the same position. Verified (Code).
- *Information architecture:* "Resolved" tab mixes resolved and dismissed (FP-024 already proposes "Closed"). There is
  no place for appeals (FP-063), legal requests (FP-065) or operations (FP-066). Inferred.

**Proposed experience**
- *Sections (reuse `PageHeader`, `Tabs`, `InfiniteList`, `Badge`, `Dialog`, `EmptyState`, `ErrorState`, `Skeleton`,
  `ConfirmDialog`, `DropdownMenu`):*
  1. **Queue bar:** tabs `Open` · `Closed` · `Appeals` (FP-063) · `Legal` (FP-065), shown to moderators. `Operations`
     (FP-066) is shown to admins only (Q-MOD-09). Filters (kind, reason, status) in a `DropdownMenu`. Sort "Priority"
     (default for Open) or "Oldest". Every value is held in the URL (`?tab=open&kind=comment&reason=harassment`).
  2. **Case list:** one row per **target**: kind icon + badge, title or excerpt (2 lines), state badge, "N reports",
     distinct reasons, oldest report age ("waiting 2 d"), priority marker (tier from FP-065 guidelines, Q-MOD-05),
     and "Under review by <name>" when claimed.
  3. **Case detail** (`/moderation/<kind>/<targetId>`):
     - *Subject*: read-only preview (story synopsis + chapter list; chapter text scrolled to the anchored paragraph;
       comment with its parent; account profile summary). This includes removed content, with a "Removed by a
       moderator · date" banner.
     - *Reports*: each report with reporter, reason, details and date.
     - *History*: audit rows for this target, then the owner account's last 10 actions and its other open cases.
     - *Decision panel*.
  4. **Decision panel:** a primary group "Take action" lists only the actions valid for the state: Hide comment ·
     Hide as moderator (author-hidden, FP-006) · Mark 18+ (BRC-MAT-02) · Remove chapter (if Q-MOD-03 = yes) · Remove
     story · Suspend (duration select if timed suspension is approved). A separate secondary button "No violation —
     dismiss reports". "Mark under review" sits as a ghost button in the header.
  5. **Action dialog:** title = action; **consequence text** (fixed per action, e.g. "Readers will get 'not found'.
     The author keeps the story in Studio as 'Removed by a moderator' and can appeal."); "Rule" Select (guideline
     sections, FP-065); "Internal note" (3–1000, logged, required); optional "Message to the user" (≤ 500, shown in the
     FP-006 notice); "Notify: author / reporters" read-only line; Confirm in the destructive variant for take-downs.
- *Primary vs secondary:* the take-down action that fits the most common reason is the primary. Dismiss is secondary;
  Under review is tertiary.
- *Interaction:* after Confirm, the case leaves Open optimistically (rolled back on error). The toast names the action
  and links to the case. A PT409 shows "Another moderator changed this case" with a "Reload case" button.
- *UI states:* skeleton rows; empty Open "Nothing waiting — oldest closed case 3 h ago"; load-more errors kept inline
  under the list instead of replacing it (fixes Inferred SCR-MOD-01-A03 behaviour).
- *Navigation:* back from detail restores the list, its filter and its scroll position. "Open public page" opens a new
  tab.
- *Responsive:*
  - **390 px:** list only; detail is a full page; the decision panel is a sticky bottom bar (primary + "More actions"
    sheet); controls ≥ 44 px; no bottom nav (admin layout).
  - **768 px:** list → detail as full page; decision panel inline at the top of the detail.
  - **1280 px:** two panes (list 380 px fixed, detail fluid, max 1200 px total); keyboard `j/k` to move, `Enter` to open
    (optional).
- *Density:* list rows 72–88 px; detail sections collapsible; history limited to 10 rows with "Show all".

**Acceptance criteria**
- **SE-MOD-01-AC01** [Proposed] Given two or more open reports on the same target, When the moderator opens the Open tab, Then exactly one case row is shown for that target with the report count, the distinct reasons and the age of the oldest report.
- **SE-MOD-01-AC02** [Proposed] Given open cases whose reasons belong to different severity tiers, When the Open tab loads with the default sort, Then cases are ordered by tier (highest first) and then by oldest report.
- **SE-MOD-01-AC03** [Proposed] Given the moderator sets tab, kind, reason and sort, When the page is reloaded or the URL is opened by another moderator, Then the same filtered list is shown.
- **SE-MOD-01-AC04** [Proposed] Given a case row, When it is activated, Then the detail opens at `/moderation/<kind>/<targetId>`: in a right pane at ≥ 1024 px, as a full page below 1024 px. Back returns to the list with filter and scroll position kept.
- **SE-MOD-01-AC05** [Proposed] Given a case whose story or chapter was removed by a moderator, When the detail opens, Then a read-only preview of the content is shown with a "Removed by a moderator" banner and no not-found state.
- **SE-MOD-01-AC06** [Proposed] Given a target with earlier moderation actions, When the detail opens, Then History lists each action with date, moderator display name, action and reason (newest first), followed by the owner account's last 10 actions and links to its other open cases.
- **SE-MOD-01-AC07** [Proposed] Given another moderator marked the case "Under review", When a second moderator views the row or the detail, Then "Under review by <name> · <relative time>" is shown. Starting an action shows a non-blocking warning naming that moderator.
- **SE-MOD-01-AC08** [Proposed] Given a take-down action is chosen, When the dialog opens, Then it shows the fixed consequence text and who will be notified, requires a guideline rule and an internal note of 3–1000 characters, and offers an optional message to the user (≤ 500).
- **SE-MOD-01-AC09** [Proposed] Given an action succeeds, Then every open report of the case closes, the case leaves the Open list at once, and the toast names the action (for example "Story removed") with a link to the case.
- **SE-MOD-01-AC10** [Proposed] Given a story or chapter case whose target was deleted by its author, Then neither "Remove story" nor "Restore story" is offered and the state reads "Deleted by author" (F-MOD-03).
- **SE-MOD-01-AC11** [Proposed] Given a 390 px viewport, When a case detail is open, Then the decision bar stays visible at the bottom, every control is ≥ 44 px high, take-down actions are visually separated from "No violation — dismiss reports", and no bottom navigation overlays it.
- **SE-MOD-01-AC12** [Proposed] Given a chapter report that carries a paragraph anchor (SE-MOD-02-AC10), When the detail opens, Then the preview scrolls to and highlights that paragraph.
- **SE-MOD-01-AC13** [Proposed] Given loading the next page fails, Then the already loaded cases stay visible and an inline "Couldn't load more · Try again" appears under the list.

**Impact**
- *Frontend:* `moderation-screen.tsx` → list/detail; new `case-detail`, `decision-panel`, `history-list`; URL-synced
  filters via `useNavigation` search params; new route `apps/web/src/app/(admin)/moderation/[kind]/[targetId]/page.tsx`
  (or under `(main)` if the shell agent keeps one shell).
- *Backend/API:* new `list_cases(tab, kind, reason, sort, cursor, limit)` that groups `content_reports` by target,
  with priority from a reason→tier map. New `moderation_target_history(kind, id)` that joins `moderation_actions` and
  actor display names (the direct table read works but lacks names). New `moderation_preview(kind, id)` that returns
  story/chapter/comment content regardless of `deleted_at` for `is_moderator()` (reuses `can_read_*`, which already
  admits moderators). `moderate` gains `set_mature`, optional `remove_chapter`, optional suspension `until`, and the
  `rule` / `user_message` arguments.
- *Database:* `moderation_actions` + `rule text`, `user_message text`; `content_reports` + `paragraph_id` (nullable);
  possibly `app_users.suspended_until`. Indexes on `content_reports(status, coalesce(target))`.
- *Shared components:* none new. `DropdownMenu`, `Sheet`, `Tabs` and `Badge` already exist in `packages/ui`.
- *Business rules:* BRC-MAT-02 (moderator sets 18+); new rules for cases, rule citation and timed suspension
  (pending Q-MOD-03/05).
- *Other screens:* SCR-STM-01 (removed state, FP-006), SCR-SHELL-01 (admin layout), SCR-SET/notifications (notices).

**Related** FP-024 (amended), FP-006, FP-063, FP-065, FP-066; F-MOD-03/04/07, U-MOD-01/02; Q-MOD-03/05, Q-MAT-04,
Q-HIST-02.

**Priority** **P2.** History, removed-content preview, consequence text, the F-MOD-03 fix and the case grouping are
needed for correct decisions and for appeals before launch. Priority sort, timed suspension and keyboard shortcuts
are P3.

### SE-MOD-02 — Report button and dialog (SCR-MOD-02)

Spec file `flag-content-dialog.md`.

**Current experience**
- *Purpose:* let a member flag a story, chapter, comment or account (WF-MOD-01).
- *Structure:* ghost `size="sm"` button with Flag icon and visible "Report" ("Báo cáo"). The Dialog has the title
  "Report content: <kind>", a description, a reason `Select` (7 values), a details `Textarea` (`maxLength` 2000, no
  counter), an alert line, and "Cancel" / "Submit report" (`report-button.tsx:79-140`).
- *Placement (Runtime):* story page: own row under Follow / Save / Add to list at 390 and 1280 px
  (`m-story.png`, `d-story.png`). Reader: centred after the vote button at the end of the chapter (`m-reader.png`).
  Visible to guests (RT-10).
- *Known limitations:* F-MOD-01/F-STORY-01 (owner sees it), U-MOD-03 (no "Reported" state), F-MOD-08 (unused Zod
  schema), guest intent lost after sign-in (BR-MOD-004).

**Identified opportunities**
- *Missing functionality:*
  - No reason descriptions and no guideline link. Verified (Code) `report-button.tsx:102-113`.
  - No structured copyright claim. Verified (Code).
  - No "Reported" state or status. Verified (Code), U-MOD-03.
  - No next step after sending (block, my reports). Verified (Code): toast only, `report-button.tsx:71-74`.
  - No passage anchor for chapter reports. Verified (Code): `submit_report(kind, target, reason, description)`,
    `moderation.sql:119`.
- *UX/UI:*
  - Report on its own row adds a full row of height on the story page (≈ 52 px at 390 px) for a rare action.
    Verified (Runtime).
  - The `sm` button is below 44 px. Verified (Runtime): 13 of 22 controls < 44 px on `m-story`, 17 of 21 on
    `m-reader` (`metrics.json`). The Report control's own height is Inferred from the screenshot.
  - A long form in a centred Dialog at 390 px may sit under the keyboard. Inferred.
- *Workflow:* guest → login → back to the pathname only. The dialog does not reopen and `#comments` is lost.
  Verified (Code) `report-button.tsx:86-88`.
- *Information architecture:* Report is a destructive/rare action, yet on the story page it is placed at the same
  visual level as engagement actions. Inferred.

**Proposed experience**
- *Placement:*
  - Story page: move "Report story" into a "More actions" (`MoreHorizontal`) `DropdownMenu` at the end of the
    secondary action row (with future "Share"). The menu trigger is 44 × 44 px. Same at 768/1280 px.
  - Reader: keep it at the end of the chapter as a quiet text button with a 44 px hit area.
  - Comment: inside the comment "⋯" menu (owned by the community agent).
  - Author page: inside a "⋯" menu next to Follow, together with "Block" (FP-064).
  - Hidden for owners on every host (F-STORY-01 quick fix).
- *Dialog content:*
  1. Reason Select. Under it, a one-line description of the selected reason (e.g. Harassment: "Targets a person with
     insults, threats or unwanted contact") and the link "Community guidelines ↗" to the matching section (FP-065).
  2. **Copyright branch** (FP-065): "Link to the original work" (URL, required), "I own this work or am authorised by
     the owner" (checkbox, required), and a note that the author will be told and can respond.
  3. Details with a counter shown from 1800 characters.
  4. **Paragraph anchor:** when opened from the reader's paragraph sheet ("Report this paragraph"), a read-only quote
     of the paragraph (first 140 chars) is shown and its anchor is sent.
- *Success view (replaces toast-only):* "Thanks — a moderator will review this." Then "See my reports" (FP-031),
  "Block <name>" for comment/user reports (FP-064), and the primary "Done".
- *Already reported:* the button reads "Reported" (check icon). Opening it shows "You reported this on <date> ·
  Status: Pending / Under review" and "Withdraw report" (FP-031 amendment).
- *Guest:* `next` keeps path + query + hash plus `report=<kind>:<id>`. After sign-in the host reopens the dialog for
  that target, unless the member owns it or already reported it.
- *Responsive:* 390 px → bottom `Sheet` (same pattern as the reader's paragraph comments, `m-reader-paragraph-sheet.png`)
  with a sticky footer above the keyboard. 768/1280 px → `Dialog` max-w-md.

**Acceptance criteria**
- **SE-MOD-02-AC01** [Proposed] Given the story owner on their own story page or chapter, Then no Report control is rendered on either (F-STORY-01).
- **SE-MOD-02-AC02** [Proposed] Given a story page at any width, Then "Report story" is an item of a "More actions" menu at the end of the secondary action row, the menu trigger is at least 44 × 44 px, and no row is used for Report alone.
- **SE-MOD-02-AC03** [Proposed] Given a guest who clicks Report on a comment while the URL has a query and `#comments`, When they sign in, Then they return to the same URL including query and hash and the report dialog opens for the same comment.
- **SE-MOD-02-AC04** [Proposed] Given the dialog, When a reason is selected, Then a one-line description of that reason appears under the select together with a link to the matching guideline section that opens in a new tab.
- **SE-MOD-02-AC05** [Proposed] Given reason "Copyright infringement", Then the fields "Link to the original work" (valid http(s) URL) and the authorisation checkbox appear, and "Submit report" stays disabled until both are valid.
- **SE-MOD-02-AC06** [Proposed] Given details of 1800 characters or more, Then a live counter "n/2000" is shown and announced politely to screen readers.
- **SE-MOD-02-AC07** [Proposed] Given a successful report on a comment or account, Then the dialog switches to a success view with "See my reports", "Block <name>" and "Done". For a story or chapter only "See my reports" and "Done" are shown.
- **SE-MOD-02-AC08** [Proposed] Given the member has an open report on this target, Then the control reads "Reported", and opening it shows the report date and status instead of the form.
- **SE-MOD-02-AC09** [Proposed] Given a 390 px viewport, When the dialog opens, Then it renders as a bottom sheet whose footer buttons are ≥ 44 px and remain visible while the on-screen keyboard is open.
- **SE-MOD-02-AC10** [Proposed] Given the reader's paragraph sheet, When "Report this paragraph" is used, Then the report is stored with the paragraph anchor and the dialog shows the quoted paragraph start.

**Impact**
- *Frontend:* `report-button.tsx` (success view, reported state, copyright branch, sheet on mobile, intent restore);
  hosts `story-screen.tsx:111-114`, `reader-screen.tsx:114-116`, `author-screen.tsx:89`, `comment-item.tsx:183`; the
  sign-in `next` handling (`withNext`).
- *Backend/API:* `submit_report` + optional `p_evidence jsonb` and `p_paragraph_id`; `my_reports()` / RLS read
  (FP-031); `withdraw_report(id)`.
- *Database:* `content_reports.evidence jsonb`, `content_reports.paragraph_id uuid` (nullable, no FK because blocks
  change between versions; validated against the published version at submit).
- *Shared components:* none new (`DropdownMenu`, `Sheet`, `Select`, `Checkbox` exist).
- *Business rules:* BRC-MOD-03 (intent kept after sign-in changes BR-MOD-004's "query/hash not kept"); new evidence
  rules (FP-065).
- *Other screens:* SCR-STORY-01, SCR-READ-01, SCR-CMT-01, SCR-AUTHOR-01, SCR-AUTH-01 (`next`).

**Related** FP-031 (amended), FP-064, FP-065, FP-006; F-MOD-01/F-STORY-01, F-MOD-08, U-MOD-03; RT-10.

**Priority** **P2** overall. AC01 is a P1 quick fix: it is already listed under "Quick fixes" and is a confusing dead
end for authors. AC10 (paragraph anchor) is P3.

### SE-MAT-01 — Adult-content gate and header 18+ control (SCR-MAT-01)

**Current experience**
- *Purpose:* stop an 18+ story opened by link from showing before age confirmation; let anyone switch 18+ in lists.
- *Structure (Runtime, `m/t/d-mature-gate.png`):*
  - Inside the full shell: header + bottom nav at 390 px.
  - A centred panel in the upper half of the page: shield icon in a circle, title "Truyện dành cho người lớn",
    description "Tác giả đã đánh dấu truyện này là 18+. Hãy xác nhận bạn từ 18 tuổi trở lên để xem.", then the
    buttons "Quay lại" (outline) and "Tôi từ 18 tuổi trở lên, tiếp tục" (primary) side by side.
  - The lower half of the viewport is empty at every width.
  - Header: a bare shield icon (ShieldAlert) between Search and "VI", with no text.
- *Actions:* confirm (sets `{ageConfirmed:true, show:true}` for the device/account), go back (history back),
  header dialog (show / keep hidden / hide again).
- *Known limitations:* F-MAT-01 (title leaks into the tab — Runtime RT-06), F-MAT-02, F-MAT-03, U-MAT-01 (Go back
  without history), U-MAT-02 (icon-only toggle semantics), Q-MAT-01 (re-asks after hiding).

**Identified opportunities**
- *Missing functionality:*
  - No statement that confirming changes all lists. Verified (Code): `use-adult-content.ts:15`, `strings.en.ts` gate
    copy.
  - No undo after confirming. Verified (Code).
  - No explanation of what 18+ covers and no link to a policy. Verified (Code): none exists.
- *UX/UI:*
  - Buttons are ~36 px high: 7 of 11 controls < 44 px at 390 px. Verified (Runtime) `metrics.json`.
  - The header icon gives no state and has no visible label. Verified (Runtime) screenshots.
  - The shield metaphor is ambiguous next to the search and language controls. Inferred.
- *Workflow:* the decline path ends in "Go back", which fails for shared links (U-MAT-01). There is no route onward
  ("Browse other stories"). Verified (Code) `adult-gate.tsx:25-27`.
- *Information architecture:* the 18+ setting has three entry points (header, gate, Settings) with three different
  wordings. Verified (Code) BR-MAT-003. The Studio hint misstates the effect (`studio/strings.en.ts:187`).

**Proposed experience**
- *Gate panel (keep `EmptyState`; content stays generic per FP-005, no title or cover):*
  - Title "Truyện 18+" / "18+ story".
  - Description: "The author marked this story as 18+. Continue only if you are 18 or older."
  - Second line, muted: "Continuing shows 18+ stories in lists on this device (and your account when signed in). You
    can turn this off any time from the 18+ button or Settings."
  - Link "What counts as 18+?" → guidelines § Mature content (FP-065).
  - Buttons: primary "I'm 18 or older, continue". Secondary: "Go back" when in-app history exists, otherwise "Back to
    home" (`/`).
- *After confirm:* content renders in place (unchanged), plus a toast "18+ stories are now shown" with the action
  "Undo" (≥ 6 s). Undo calls `disable()` and the gate returns.
- *Header control:*
  - Icon + short visible label "18+" at ≥ 768 px; icon-only at 390 px with a 44 × 44 hit area.
  - Accessible name carries the state ("Mature content (18+): hidden").
  - No `aria-pressed`, because it opens a dialog (U-MAT-02).
  - In the dialog, when `ageConfirmed` is already true, show only "Show 18+ stories" without restating age
    (BRC-MAT-01 / Q-MAT-01).
- *Responsive:*
  - 390 px: panel top-aligned with 48 px top padding; buttons stacked full-width, primary first, ≥ 44 px.
  - 768/1280 px: buttons inline, panel centred in the content column at max-w-md.
  - The empty lower area is acceptable, so no filler content is added (no story identity may be shown per FP-005).
- *Density:* unchanged; only the copy grows by one muted line.

**Acceptance criteria**
- **SE-MAT-01-AC01** [Proposed] Given an 18+ story and the choice "hidden", When the gate is shown, Then its text states that continuing shows 18+ stories in lists on this device (and account when signed in) and that this can be changed later.
- **SE-MAT-01-AC02** [Proposed] Given the gate, When the reader clicks "I'm 18 or older, continue", Then the story renders in place and a toast "18+ stories are now shown" with "Undo" is displayed for at least 6 seconds.
- **SE-MAT-01-AC03** [Proposed] Given the toast from AC02, When "Undo" is clicked, Then the choice returns to hidden, the gate is shown again and lists exclude 18+ stories.
- **SE-MAT-01-AC04** [Proposed] Given the gate opened in a tab without in-app history, Then the secondary button reads "Back to home" and navigates to `/` (U-MAT-01).
- **SE-MAT-01-AC05** [Proposed] Given the gate, Then a link "What counts as 18+?" opens the Mature content section of the community guidelines (FP-065).
- **SE-MAT-01-AC06** [Proposed] Given a 390 px viewport, Then both gate buttons are at least 44 px high and stacked full-width, with the primary action first.
- **SE-MAT-01-AC07** [Proposed] Given the header control, Then its accessible name includes the current state, it exposes no `aria-pressed`, and at ≥ 768 px a visible "18+" label accompanies the icon.
- **SE-MAT-01-AC08** [Proposed] Given `ageConfirmed = true` and 18+ hidden, When the reader opens the header dialog or the Settings switch, Then turning 18+ on needs one click on "Show 18+ stories" and repeats no age statement (BRC-MAT-01; blocked by Q-MAT-01).

**Impact**
- *Frontend:* `adult-gate.tsx` (copy, history-aware back, link, toast with undo), `adult-content-button.tsx` (label,
  ARIA, re-ask logic), `adult-content/strings*.ts`, `studio/strings*.ts` (hint, via FP-005 amendment).
- *Backend/API:* none.
- *Database:* none.
- *Shared components:* `useAppToast` already exists; needs an action button. If missing, use sonner's `action` (sonner
  is in `packages/ui/src/components/sonner.tsx`).
- *Business rules:* BRC-MAT-01 (no re-ask once confirmed). Q-MAT-06 (should the gate confirm reveal one story only?).
- *Other screens:* SCR-SHELL-01 (header), SCR-SET-01 (switch wording), SCR-STM-02/03 (hint).

**Related** FP-005 (amended), FP-022 (U-MAT-02), FP-065; F-MAT-01/03, U-MAT-01/02; RT-06; Q-MAT-01/06.

**Priority** **P2.** The server-side leak (FP-005) is the larger risk and stays P2/MVP. This copy, undo and target-size
work is S and should ship with it.

---

## 4. New feature proposals

### FP-063 — Appeal a moderation decision

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-TRUST · OBJ-MOD (+OBJ-NOTI, OBJ-STM, OBJ-CMT) · SCR-MOD-01 (Appeals tab), SCR-STM-01 (removed story), SCR-CMT-01 (hidden-comment note), SCR-SHELL-01 (suspension banner), SCR-NOTI-01; new embedded **Appeal dialog** (proposed ID SCR-MOD-03, to be assigned at consolidation) |
| User problem | An author whose story was removed, a commenter whose comment was hidden, or a member who was suspended cannot contest the decision. A wrong decision stands unless a moderator happens to notice it. |
| Evidence / hypothesis | Verified (Code): no appeal table, RPC or UI. WF-MOD-06 success criteria "Not met: no notification, no reason shown, no appeal path". FP-006 lists "an appeal path" only as a benefit. Inferred: removals and suspensions are the decisions with most user impact; an internal second look reduces errors. Benchmark: appeal flows are standard on UGC platforms (Inferred; no specific source checked). |
| Current limitation | Reversal exists (WF-MOD-04) but only on a moderator's own initiative, with no input from the affected person. A suspended account cannot write anything (BR-MOD-016). |
| Proposed solution | **Data:** `moderation_appeals(id, action_id → moderation_actions.id, appellant_id, statement text 10–2000, status pending/upheld/reversed, decided_by, decided_at, decision_reason, created_at)`. Unique open appeal per action. RLS: the appellant reads own rows; moderators read all; no client writes. **RPCs:** `submit_appeal(action_id, statement)` (SECURITY DEFINER). It is allowed only for the affected party of a take-down action (story owner for `remove_story`, comment author for `hide_comment`, the account for `suspend_user`), within the appeal window (Q-MOD-06), and only while the action is still the latest on the target. It is **allowed for suspended accounts** (BRC-MOD-02). `decide_appeal(appeal_id, outcome, reason)` is moderator-only. `reversed` runs the matching reverse action through the same code path as `moderate()` in one transaction (audit row with `report_id` NULL and a new `appeal_id` column). Both write audit rows (`action` gains `submit_appeal`? no — appellants are not actors; `decide_appeal` only). **Outbox events:** `appeal.decided` → notification to the appellant (mandatory, not switchable). |
| Expected benefit | Due process; mistakes corrected; trust from authors; a safety valve for coarse actions until FP-024's graduated actions exist |
| Scenarios & main flow | 1. Author opens Studio and sees "Removed by a moderator · Rule: Harassment · 3 Nov" (FP-006) with "Appeal". 2. Appeal dialog: what was actioned, the rule, the moderator's message (if any), a statement textarea (10–2000, counter), "Send appeal". 3. `submit_appeal` creates a pending appeal; the label becomes "Appeal pending". 4. A moderator opens Console → Appeals (oldest first), sees the original action, the original reports, the content preview (SE-MOD-01-AC05) and the statement. 5. "Reverse decision" or "Uphold decision" with a reason (3–1000). 6. Reverse: the story is restored, the audit is written, the author is notified "Your appeal was accepted, the story is visible again". Uphold: the author is notified "Your appeal was reviewed; the decision stands" with the rule. |
| Alternative / error flows | A1 Suspended member: the banner (FP-002) carries "Appeal". The dialog works although other writes are refused. A2 The action was already reversed before the decision: `decide_appeal` returns PT409 "Already reversed", and the appeal auto-closes as reversed. A3 Second appeal on the same action → PT409 "You already appealed this decision". A4 Outside the window → button hidden; RPC 22023. A5 Appeal rate: `appeal_rate_day` row in `abuse_limits` (FP-007 amendment) → PT429. A6 Decided by the same moderator who acted: allowed or refused per Q-MOD-06 (the proposal defaults to a warning in the UI, not a block, because teams are small). |
| Business rules to add/modify | New (proposed) **BR-MOD-022** — Appeal eligibility (affected party, window, one per action, latest action). New **BR-MOD-023** — Appeal decision reverses through the audited path; upheld appeals change nothing. **BRC-MOD-02** — exception to BR-MOD-016: a suspended account may submit an appeal (requires approval). |
| UI behaviour & validation | Statement 10–2000 chars, counter from 1800; Send disabled while invalid or sending; errors inline (`role="alert"`); success replaces the dialog body with "Appeal sent. We'll notify you of the decision." Entry button states: "Appeal" / "Appeal pending" / "Appeal decided — see notification". The console Appeals tab uses the case-detail layout (SE-MOD-01) with the decision panel showing only "Reverse decision" / "Uphold decision". |
| Technical impact | Frontend: `moderation` feature (appeal dialog, appeals tab), Studio deleted list, comment note, shell banner, notification renderer. Shared components: none new. API/RPC: `submit_appeal`, `decide_appeal`, `list_appeals`. Database: table + `moderation_actions.appeal_id`, enum values. RLS: as above. Jobs: outbox handler `appeal.decided` → notification (existing outbox + handler pattern). |
| Dependencies · Risks | Depends on FP-006 (removed state and notices are the entry points) and FP-002 (banner). Risk: appeal floods. Mitigated by one appeal per action + rate row. Risk: tone and legal wording. Needs review (Q-X-02 owner). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-MOD-06 (window, who decides), BRC-MOD-02 (blocked until approved) |

Acceptance criteria [Proposed]:
- Given a story removed by a moderator 2 days ago and an appeal window of 30 days, When its owner sends an appeal with a 50-character statement, Then a pending appeal exists, the Studio row reads "Appeal pending", and a second appeal on the same action is refused with "You already appealed this decision".
- Given a suspended account, When it submits an appeal against its suspension, Then the appeal is stored although all other writes are still refused with 42501.
- Given a pending appeal, When a moderator chooses "Reverse decision" with a reason, Then the target is restored in the same transaction, one audit row references the appeal, the appeal status is `reversed`, and the appellant receives exactly one notification (no duplicate on outbox replay).
- Given a pending appeal, When a moderator chooses "Uphold decision", Then the target is unchanged and the appellant is notified with the rule cited in the original action.
- Given a member who is not the affected party, When they call `submit_appeal` for that action, Then the call fails with 42501.

### FP-064 — Block another user

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-TRUST · proposed new object **OBJ-BLK "User blocks"** (registry addition needed, CONVENTIONS §3; alternatively placed under OBJ-MOD) · SCR-AUTHOR-01 ("⋯" menu), SCR-CMT-01 (comment "⋯" menu, placeholder), SCR-MOD-02 (success view), SCR-SET-01 (Blocked accounts section), SCR-NOTI-01 |
| User problem | A reader or author targeted by one person in comments and replies can only report each comment and wait for a moderator. Meanwhile every reply notifies them and the person can keep commenting on their stories. |
| Evidence / hypothesis | Verified (Code): no block or mute table, RPC or UI (search over `supabase/migrations`, `packages/features/src`). Reply notifications are emitted for any reply (`20261104001100_comment_reply_notifications.sql:24-68`). The only filter on notification insert is the settings trigger `notifications_respect_settings` (`20261104001900_user_settings.sql:73`). Author tools hide one comment at a time (OBJ-CMT, WBS 6.2). Inferred: harassment is concentrated in a few accounts per victim, so per-pair blocking resolves most cases without moderator time. Benchmark: block/mute is standard on reading/writing UGC platforms (Inferred). |
| Current limitation | Protection depends entirely on moderator latency. Rate limits (BR-ABU-002) only cap volume. |
| Proposed solution | **Data:** `user_blocks(blocker_id, blocked_id, created_at, PK(blocker_id, blocked_id), CHECK blocker ≠ blocked)`. RLS: own rows only (read/delete). Max 1000 per account. **RPC:** `set_user_block(user_id, blocked boolean)` (idempotent; moderators may be blocked, which never affects moderation functions). **Effects (single places):** (1) *Viewer side:* `comment_to_card` returns `blocked_author = true` when the viewer blocked the author. The thread renders a collapsed placeholder "Comment from someone you blocked · Show" (body not sent until "Show", via `list_comments` omitting the body). (2) *Notifications:* the existing BEFORE INSERT trigger `notifications_respect_settings` also drops a notification whose `actor_id` is blocked by the recipient (one place covers replies, follows and future types). (3) *Interaction:* `post_comment` refuses a reply whose parent author has blocked the replier, and (if Q-MOD-07 = yes) any comment on a story owned by a blocker. The refusal is a generic 42501 "You can't reply here" that does not reveal the block. (4) Following: blocking removes the blocked user's follow of the blocker and prevents a new one (Q-MOD-07). **UI:** "Block <name>" in the author page and comment "⋯" menus and in the report success view. A confirm dialog lists the effects. "Blocked accounts" in Settings has Unblock. |
| Expected benefit | Immediate self-service protection; fewer reports filed only to stop contact; less moderator load |
| Scenarios & main flow | 1. Member opens a harasser's comment "⋯" → "Block Minh". 2. Confirm dialog: "Minh's comments will be collapsed for you, you won't get notifications from Minh, and Minh can't reply to your comments. Minh won't be told." → "Block". 3. `set_user_block(minh, true)`. Toast "Minh blocked · Undo". 4. Thread refetches; Minh's comments are collapsed. 5. Minh replies to the member's comment → refused with a generic message. 6. Settings → Blocked accounts → Unblock. |
| Alternative / error flows | A1 Block yourself → button hidden; RPC 22023. A2 Limit 1000 reached → PT409 "You've reached the block limit". A3 Blocked user's existing comments stay public for everyone else (blocking is personal; reporting remains the path for public harm). A4 Guest → "Block" sends to sign-in like Report. A5 Suspended blocker: block allowed? Follows Q-MOD-01/FP-002 (proposal: allowed, as it only protects the user). |
| Business rules to add/modify | New (proposed) **BR-BLK-001** Who may block; **BR-BLK-002** Viewer-side collapse; **BR-BLK-003** Notifications from blocked actors are not stored; **BR-BLK-004** Blocked users cannot reply to (and optionally comment on stories of) the blocker; **BR-BLK-005** The block is never disclosed to the blocked user. No change to existing BRs. |
| UI behaviour & validation | Placeholder is keyboard-reachable with "Show" as a button and an accessible name ("Show comment from a blocked account"). Block/unblock via `ConfirmDialog`; undo toast 6 s. The Settings list is paginated at 50 with relative dates. |
| Technical impact | Frontend: `comments` (placeholder, menu item), `author` (menu), `settings` (section), `moderation` (success view). Shared components: `ConfirmDialog`, `DropdownMenu` (existing). API/RPC: `set_user_block`, `list_my_blocks`. Database: table + indexes `(blocked_id)`; changes to `comment_to_card`, `post_comment`, notifications trigger, `set_user_follow`. RLS: own rows. Jobs: none. |
| Dependencies · Risks | Risk: performance of `comment_to_card` per row. Mitigate with `EXISTS` on the PK (viewer, author) — one index lookup. Risk: users mistake block for report. Mitigate: the confirm dialog says "This doesn't remove the comment for others — report it if it breaks the rules". Coordinates with the community agent (comment menu) and the account agent (Settings). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-MOD-07 (does a block also stop comments on the blocker's stories and remove follows?) |

Acceptance criteria [Proposed]:
- Given member A blocked member B, When A opens a chapter where B commented, Then B's comments are collapsed for A with a "Show" control, and remain fully visible to every other reader.
- Given A blocked B, When B replies to A's comment, Then the reply is refused with a message that does not mention blocking, and A receives no notification.
- Given A blocked B, When any event with actor B would notify A (reply, follow), Then no notification row is stored for A.
- Given A unblocks B in Settings, When A reloads the chapter, Then B's comments are shown normally and new replies from B notify A again.
- Given A attempts to block themselves through the API, Then the call fails with 22023.

### FP-065 — Community guidelines, legal pages and copyright requests

| Field | Value |
| --- | --- |
| Type | Remediation (documented, not done: WBS 6.9) + Enhancement |
| Domain · object · screens | D-TRUST · OBJ-MOD (+OBJ-SHELL, OBJ-SEO, OBJ-AUTH) · new static routes `/guidelines`, `/terms`, `/privacy`, `/copyright` (proposed screen ID SCR-MOD-04 "Policy pages", one template), SCR-SHELL-01 (footer / menu links), SCR-AUTH-02 (consent line), SCR-MOD-02 (reason links, copyright branch), SCR-MOD-01 (Legal tab), SCR-MAT-01 ("What counts as 18+?") |
| User problem | Readers and authors have no written rules, so they cannot know what is allowed, what a report reason means, or what 18+ covers. Moderators decide against a "policy" that does not exist. Rights holders without an account cannot ask for a takedown, and members' copyright reports lack the facts needed to act. There is no privacy policy or terms. |
| Evidence / hypothesis | Documented: WBS 6.9 ⬜ "Trang tĩnh pháp lý: điều khoản, quyền riêng tư, DMCA/khiếu nại bản quyền" (`docs/WBS.md:227`); §4 "Còn mở: chính sách pháp lý". Verified (Code): no such routes (`apps/web/src/app`), no strings in `packages/features/src`, no footer component (`packages/features/src/shell/components/`). The moderator placeholder cites a policy (`moderation/strings.en.ts:87`). The report reason `copyright` has only free text (`report-button.tsx:102-123`). `anon` cannot call `submit_report` (BR-MOD-004). Inferred: app-store submission for the Capacitor apps (Phase 7) requires a privacy-policy URL. |
| Current limitation | Nothing public describes the rules; copyright takedowns are indistinguishable from other reports. |
| Proposed solution | (1) **Policy pages:** four static, indexable routes rendered from versioned Markdown per locale (`apps/web/content/policies/{vi,en}/*.md`, no CMS). Each has a "Last updated" date and stable section anchors. Guidelines sections map 1:1 to report reasons (`#spam`, `#harassment`, `#hate`, `#sexual`, `#violence`, `#copyright`) plus `#mature-content` (what requires the 18+ mark) and `#enforcement` (actions, appeals). (2) **Links:** a slim footer on desktop pages (≥ 768 px) and a "Help & policies" item in the user menu (mobile and guests); a sign-up consent line "By creating an account you agree to the Terms and Privacy Policy"; report dialog reason links; gate link; Studio 18+ hint link. (3) **Structured copyright claims (members):** `submit_report` accepts `p_evidence jsonb` for `copyright` (`original_url` required http(s), `is_rights_holder_or_agent` true required, `contact_email` optional). The console shows a "Legal" badge and lists these in the **Legal** tab. Removal for copyright uses rule `#copyright`, and the author notice (FP-006) states that they can respond through FP-063. (4) **Non-members:** `/copyright` publishes a contact address and the required information (no anonymous form until captcha exists — Q-MOD-08). Operators log such requests in the console with "Create legal case" (moderator creates a report on the target with `evidence.source = 'external'`, reporter = moderator). (5) **Moderator reasons cite rules:** the reason dialog's "Rule" select uses the same anchors (SE-MOD-01-AC08). |
| Expected benefit | Legal baseline for launch; consistent decisions; better reports; copyright takedowns that can be audited; authors know the 18+ rule |
| Scenarios & main flow | 1. Reader picks "Harassment" in the report dialog → description + link to `/guidelines#harassment`. 2. A rights holder member reports a chapter with reason "Copyright": enters the original URL and ticks the authorisation box → report stored with evidence. 3. Moderator Legal tab → case shows evidence with an "Open original" link → "Remove story" with rule `#copyright` → author notified with the rule and the "Respond / Appeal" path. 4. A non-member emails the published address; the moderator uses "Create legal case" on the story → same flow. |
| Alternative / error flows | A1 Invalid URL → inline "Enter a link starting with http:// or https://". A2 Checkbox not ticked → Submit disabled. A3 Evidence on a non-copyright reason → server ignores it (22023 if malformed JSON). A4 Policy page for a missing locale → falls back to vi with a notice. A5 Content not provided by the legal owner → routes are not released (they are not shipped with placeholder legal text). |
| Business rules to add/modify | New (proposed) **BR-MOD-024** Copyright reports require evidence (original URL + authorisation statement). New **BR-MOD-025** Every take-down cites a guideline rule (anchor). New **BR-MOD-026** Policy pages are public, indexable and versioned with a visible "Last updated" date. No change to existing BRs (evidence is additive). |
| UI behaviour & validation | Footer links 44 px tall on touch; pages use the reading typography and a table of contents on ≥ 1024 px; anchors scroll with header offset; `robots` allow; canonical per page; `lang` per locale. |
| Technical impact | Frontend: 4 route files + one `PolicyPage` component (web-only content, screens in `packages/features` stay router-agnostic), footer in `main-shell`, menu item, report dialog branch, console Legal tab. Shared components: optional `SiteFooter` widget in `packages/ui/widgets`. API/RPC: `submit_report(+p_evidence)`, `create_legal_case(kind, target, evidence, reason)` (moderator). Database: `content_reports.evidence jsonb` + CHECK on shape for copyright; `moderation_actions.rule text`. RLS: unchanged (functions). Jobs: none. SEO: add the pages to the sitemap. |
| Dependencies · Risks | Blocked on legal content (Q-X-02) for pages (1). (2)–(5) can ship with guidelines only. Risk: publishing rules commits the platform to enforce them consistently, which is why FP-024 cites rules. Overlaps the shell agent (footer) and the auth agent (consent line). |
| Priority · Complexity · Class | P1 (pages + links: launch blocker) · S for pages/links, M for copyright evidence + Legal tab · MVP |
| Decision required | Q-X-02 (legal content), Q-MOD-08 (non-member channel) |

Acceptance criteria [Proposed]:
- Given any visitor, When they open `/guidelines`, `/terms`, `/privacy` or `/copyright`, Then the page renders in the active language with a "Last updated" date, is indexable, and each guideline section has a stable anchor matching a report reason.
- Given a desktop page at 1280 px, Then a footer links to all four pages. Given a 390 px viewport, Then the user menu (guest and member) has "Help & policies" leading to them.
- Given the report dialog with reason "Copyright infringement", When the member submits without a valid original-work URL or without ticking the authorisation box, Then submission is impossible. With both, the stored report contains the evidence and appears in the console's Legal tab.
- Given a moderator removes a story for copyright, Then the audit row stores rule `copyright`, and the author's notice (FP-006) cites the rule and offers the appeal/response path (FP-063).
- Given the sign-up screen, Then a consent line links to the Terms and the Privacy Policy.

### FP-066 — Operations area: staff roles, abuse thresholds, audit log, job health

| Field | Value |
| --- | --- |
| Type | New Feature (WBS 6.1 "not done" items + Q-ABU-01) |
| Domain · object · screens | D-TRUST · OBJ-MOD, OBJ-ABU (+OBJ-JOB) · SCR-MOD-01 new "Operations" tab with sub-views Staff · Limits · Audit log · Health |
| User problem | Adding or removing a moderator, tightening a limit during a spam wave, or checking whether jobs run all require a person with service-role SQL access. Changes to limits leave no trace, and a revoked moderator keeps access until the token refreshes. |
| Evidence / hypothesis | Documented: `docs/WBS.md:219` "Chưa làm: … cấp/thu vai moderator qua giao diện". Verified (Code): role read from the JWT claim (`20261103000100_auth_and_rls.sql:69-72`, BR-MOD-001); `abuse_limits` closed to clients with no audit (`20261104002200_abuse_limits.sql:3-7,38-39`, Q-ABU-01); no job health surface (F-JOB-02); `supabase/functions/` is empty (no Edge Function exists yet). Hypothesised: incident response time is bounded by the availability of an engineer. |
| Current limitation | All operator tasks are SQL-only and unaudited, except moderation actions. |
| Proposed solution | (1) **Staff roles as data:** `staff_roles(user_id PK, role 'moderator'|'admin', granted_by, granted_at)`. A Supabase **Custom Access Token hook** (a Postgres function, no new service) copies the role into the JWT claim at issue time, so the existing `is_moderator()` and web checks keep working. Sensitive RPCs (`moderate`, `decide_appeal`, staff/limit changes) additionally check the table, which removes the revocation latency for them (answers Q-MOD-02). This changes BR-MOD-001's source of truth → **BRC-MOD-01**. (2) **Staff view (admin only):** list staff; grant by username; revoke, with a reason. Every change writes `moderation_actions` (`action` + `grant_role`/`revoke_role`, `target_kind` + `staff`). (3) **Limits view (admin only):** table of `abuse_limits` rows with description, value and window. Edit with a reason → `update_abuse_limit(code, max, window, reason)` writes an audit row with the old and new values. A "Freeze" shortcut (max 0) has a confirm. (4) **Audit log (moderators read, as RLS allows today):** global list filtered by actor, action, target kind and date; each row links to its case. (5) **Health (admin):** reads `job_health()` from **FP-010** (outbox backlog, dead letters, last cron run, ranking freshness) with green/amber/red states. No duplicate logic here. |
| Expected benefit | Faster incident response; accountability for every privileged change; immediate revocation for sensitive actions |
| Scenarios & main flow | 1. Admin opens Moderation → Operations → Staff → "Add moderator" → username → reason → Confirm → row added, audit written; the new moderator sees the console after their next token refresh (copy says so). 2. Spam wave: Limits → `comment_rate_burst` 10 → 5 with the reason "spam wave 5 Nov" → next comment uses 5. 3. Health shows "3 dead-letter events" in red → link to the runbook (WP 8.2). |
| Alternative / error flows | A1 Admin revokes themselves while the last admin → refused (PT409 "At least one admin is required"). A2 Moderator (non-admin) opens Staff/Limits → tab hidden; RPC 42501. A3 Invalid limit (negative, window ≤ 0) → existing CHECK → 22023 inline. A4 Hook misconfigured → fallback: `is_moderator()` also accepts `app_metadata.role` during migration (time-boxed). |
| Business rules to add/modify | **BRC-MOD-01** (role source of truth = `staff_roles`, claim projected by hook; sensitive RPCs check the table). New (proposed) **BR-MOD-027** Staff changes and limit changes are audited with a reason. New **BR-MOD-028** At least one admin must exist. New role `admin` (Q-MOD-09). |
| UI behaviour & validation | Same reason dialog as SE-MOD-01 (3–1000 chars). Limits edited in a dialog with numeric inputs and a preview "10 per 10 min → 5 per 10 min". Health auto-refreshes every 60 s while visible. Operations is hidden for non-admins. At 390 px: lists as stacked cards; at ≥ 1024 px: tables. |
| Technical impact | Frontend: `moderation` feature (operations views). Shared components: none new. API/RPC: `grant_staff_role`, `revoke_staff_role`, `list_staff`, `update_abuse_limit`, `list_audit(filters, cursor)`; reads `job_health()` (FP-010). Database: `staff_roles`; `moderation_actions` CHECK extended (`grant_role`, `revoke_role`, `update_limit`; `target_kind` + `staff`, `limit`); `old_value/new_value jsonb` columns; the hook function + Supabase Auth hook setting (owner action like Q-X-03). RLS: `staff_roles` readable by moderators, writable only via functions. Jobs: none new. |
| Dependencies · Risks | FP-010 (`job_health`); Supabase Auth hook configuration per environment (record it — Q-AUTH-02). Risk: privilege escalation bugs → SQL tests for every refusal. Risk: low value while the team is 1–2 people → P3. |
| Priority · Complexity · Class | P3 · M · Maturity |
| Decision required | BRC-MOD-01, Q-MOD-09 (separate admin role?), Q-ABU-01 |

Acceptance criteria [Proposed]:
- Given an admin grants the moderator role to user U with a reason, Then a `staff_roles` row and an audit row (actor, `grant_role`, U, reason) exist, and U can open `/moderation` after their next token refresh.
- Given an admin revokes U's moderator role, When U immediately calls `moderate` with a still-valid token, Then the call is refused with 42501.
- Given an admin changes `comment_rate_burst` from 10 to 5 with a reason, Then the next comment counts against 5, and the audit log shows the old and new values with the reason.
- Given a non-admin moderator, When they call `update_abuse_limit` or `grant_staff_role`, Then the call fails with 42501 and the Operations tab is not shown to them.
- Given `job_health()` reports dead-letter events, When an admin opens Health, Then the outbox status is shown as failing with the count.

---

## 5. Amendments to existing FPs

| FP | Add / change | Why |
| --- | --- | --- |
| **FP-002** One suspension policy | (e) The suspension banner content: what happened ("Your account is suspended"), the rule cited (FP-065 anchor), the date, what still works (read, sign in, change settings per Q-PRF-01) and an **"Appeal"** button (FP-063). (f) A suspended account may still submit an appeal and manage blocks (BRC-MOD-02; FP-064 A5). (g) The moderator "Suspend" dialog shows the consequence list derived from the Q-MOD-01 decision (SE-MOD-01-AC08). Add AC: "Given A is suspended, When A opens any page, Then the banner shows the rule and date and an Appeal button that opens the appeal dialog." | Banner without a reason or remedy leaves the user stuck (JRN-MOD-08); the consequence list must match the policy decided in Q-MOD-01. |
| **FP-005** Server-side 18+ protection | Add the gate experience of SE-MAT-01: copy stating the global effect, toast with **Undo**, "Back to home" fallback (already listed), link "What counts as 18+?" (FP-065), stacked ≥ 44 px buttons at 390 px. Header control: visible "18+" label at ≥ 768 px and state in the accessible name (shared with FP-022 / U-MAT-02). No re-ask once `ageConfirmed` (BRC-MAT-01, Q-MAT-01). Correct the Studio hint `studio/strings.en.ts:187` to "18+ stories are hidden from all lists unless a reader opts in, and open behind an age gate" + link to guidelines. Add ACs SE-MAT-01-AC01…AC08 by reference. | Runtime shows the gate and icon (JRN-MOD-04). The gate confirm silently changes every list (Code). The Studio hint is wrong (Code). All are S-size and belong with the server-side work. |
| **FP-006** Moderation outcomes visible | Define a **notice standard** for every affected-party surface: action, item, rule (FP-065 anchor), date, optional moderator message (SE-MOD-01-AC08), and next step (Appeal — FP-063). Surfaces: Studio "Removed by a moderator" row; hidden-comment note (link "Why?" → rule); suspension banner (FP-002); notification. Notification types: `moderation.story_removed`, `moderation.comment_hidden`, `moderation.account_suspended`, `moderation.decision_reversed` (affected party, **not switchable** — exempt from BR-SET-006), and `moderation.report_closed` (reporter; switchable), with outcome category only ("Action taken" / "No violation found"). The reporter is never told the sanction details, and the reported party is never told who reported (CAP-TNS-25). Use `dedupe_key = action_id` (+ reporter id). Reversal sends `decision_reversed`. | Gives JRN-MOD-07/08 a consistent, safe message format. Reversals currently notify nobody (BR-MOD-017). Prevents leaking reporter identity or sanction details. |
| **FP-007** Abuse limits | Add rows `appeal_rate_day` (default 3/24 h) and `block_rate_day` (default 50/24 h) used by FP-063/FP-064. Move "who tunes thresholds and how it is audited" (Q-ABU-01) to FP-066's Limits view, which writes audit rows. Add AC: "Given an admin edits a limit, Then an audit row with old/new values exists." | New write paths need the same protection. Auditing thresholds needs a UI, not only a policy. |
| **FP-024** Moderation console productivity | **Raise the core subset to P2** (card date, comment author, closed-by/at, consequence text, per-target history, F-MOD-03 state fix, removed-content preview, case grouping). The rest stays P3. **Add:** (a) the case model — one row per target, `list_cases` RPC, priority tiers from guideline sections (Q-MOD-05); (b) "Under review by <name>" (map `reviewed_by`, already returned by SQL); (c) list/detail layout with deep link `/moderation/<kind>/<targetId>`, filters in the URL, back preserving scroll; (d) investigation: History for target + owner account (direct `moderation_actions` read is allowed by RLS; add display names), `moderation_preview` for removed content (public queries filter `deleted_at`); (e) **graduated actions:** "Mark 18+" (BRC-MAT-02, Q-MAT-04), chapter-level removal (Q-MOD-03), optional timed suspension (`suspended_until` + pg_cron reinstatement, audited as `reinstate_user` by system — needs Q-MOD-01); (f) the reason dialog gains Rule (FP-065 anchor), internal note, optional user message; (g) paragraph anchor on chapter reports (SE-MOD-02-AC10); (h) admin layout without the bottom nav per WBS §1.2 `(admin)` group. ACs: SE-MOD-01-AC01…AC13 by reference. | JRN-MOD-01/02/03 friction is Verified (Code). Without history and preview, reversals and appeals (FP-063) cannot be judged. Without graduated actions, a mis-rated story can only be removed (BR-MAT-011). |
| **FP-031** "My reports" and reported state | Raise to **P2 · Maturity** (it is the reporter half of FP-006). Scope: (a) "Reported" state on the control (SE-MOD-02-AC08) using the member's own open reports (RLS already allows reading own `content_reports`); (b) `/me/reports` (or a "Reports" section on `/me`) listing target title (if still visible), reason, date and status: Pending / Under review / Closed — Action taken / Closed — No violation (outcome category only); (c) **"Withdraw report"** while pending (`withdraw_report(id)` → status `dismissed` by reporter, audited with actor = reporter, does not refund quota); (d) a link from the report success view. AC: "Given my report was dismissed, When I open My reports, Then it shows 'Closed — No violation found' and no moderator name." | JRN-MOD-07: reporters get no feedback today. Withdrawing fixes mistaken reports without moderator effort. Outcome categories keep the reported party's privacy. |

Also referenced, not amended (outside my list): **FP-008** (account lifecycle requests in JRN-MOD-05), **FP-010**
(job health data for FP-066), **FP-013** (notification excerpts after moderation), **FP-022** (U-MAT-02), **FP-009**
(captcha, required before any anonymous report/copyright form — Q-MOD-08).

---

## 6. BR change proposals and open questions

### BR change proposals (each requires approval; the BR text is not edited)

| ID | Rule affected | Current (Verified) | Proposed | Why | Linked |
| --- | --- | --- | --- | --- | --- |
| BRC-MOD-01 | BR-MOD-001 Moderator role | Role = JWT `app_metadata.role`, set by service role; revocation effective at token refresh | Role stored in `staff_roles` (moderator/admin) and projected into the JWT by a Custom Access Token hook; sensitive RPCs also check the table | Role UI with audit (WBS 6.1 not done); immediate revocation for sensitive actions (Q-MOD-02) | FP-066, Q-MOD-02, Q-MOD-09 |
| BRC-MOD-02 | BR-MOD-016 Effects of a suspension | Every write gated by `is_active_account()` is refused | Exception: a suspended account may submit an appeal against its own suspension or against actions on its content, and may manage its blocks | A suspension must be contestable; blocking only protects the user | FP-063, FP-064, FP-002 |
| BRC-MOD-03 | BR-MOD-004 Who may report (guest behaviour) | Guest → `/login?next=<pathname>`; query string and hash not kept | `next` keeps path + query + hash and a `report=<kind>:<id>` intent; the dialog reopens after sign-in | Guest intent is lost, especially for comments (JRN-MOD-07) | SE-MOD-02-AC03 |
| BRC-MAT-01 | BR-MAT-003 Changing the choice | Every control re-asks the age statement when going hidden → shown | When `ageConfirmed` is true, turning 18+ on needs no repeated age statement | Matches WBS 5.6 "ẩn rồi bật lại không hỏi hai lần" (Documented) | Q-MAT-01, SE-MAT-01-AC08 |
| BRC-MAT-02 | BR-MAT-011 The 18+ mark belongs to the author | Only owner/co-author set `is_mature`; moderators have no action | A moderator may set `is_mature = true` through `moderate('set_mature')` with an audit row. While that action is the latest on the story, the author cannot clear the flag (guard trigger like `stories_guard_removal`) but can appeal (FP-063) | Proportionate remedy for mis-rated stories instead of removal | Q-MAT-04, FP-024 |

### New open questions (continue numbering; current max Q-MOD-04, Q-MAT-04, Q-ABU-03)

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-MOD-05 | Should the queue group reports by target ("cases") and sort by severity tier? Which reasons form which tier (proposal: tier 1 sexual/violence/hate, tier 2 harassment/copyright, tier 3 spam/other)? | Time-to-action on the most harmful content | FP-024 (amendment), SE-MOD-01 | JRN-MOD-01 |
| Q-MOD-06 | Appeals: who may appeal (affected party only?), within what window (proposal 30 days), one per action, and must a different moderator decide? | Due process vs. a small team | FP-063 | JRN-MOD-05 |
| Q-MOD-07 | Scope of a block: also stop the blocked user commenting on the blocker's stories and remove their follow? | Author protection vs. openness of public stories | FP-064 | JRN-MOD-07 |
| Q-MOD-08 | Copyright requests from non-members: published contact address only, or an anonymous form once captcha (FP-009) exists? Who owns the address? | Legal reachability vs. anonymous abuse | FP-065 | JRN-MOD-05 |
| Q-MOD-09 | Is a separate `admin` role needed for staff and threshold changes, or are all moderators trusted with them? | Least privilege | FP-066 | JRN-MOD-06 |
| Q-MAT-05 | Should sign-up ask for a birth year (or an "I am 18+" statement) so that accounts declared under 18 cannot turn on 18+ content? | Age-appropriate experience for minors (CAP-TNS-14); today any account can self-declare at any time | — (no FP until decided) | JRN-MOD-04 |
| Q-MAT-06 | Should "continue" at the gate reveal only that story (per-story pass) instead of turning 18+ on for every list? The current behaviour is documented in WBS 5.6. | Readers who follow one shared link may not want their lists to change. The proposal keeps global + explains + Undo (SE-MAT-01) | SE-MAT-01 copy | JRN-MOD-04 |

---

## 7. Notes for consolidation

1. **Journey IDs:** JRN-MOD-07 (reporter) and JRN-MOD-08 (affected author/member) are reader/author journeys numbered
   under MOD to avoid colliding with other agents' RDR/AUT numbering. Renumber if the orchestrator prefers.
2. **New IDs needing registry entries (CONVENTIONS §3):** object code for blocks (proposed `BLK`, or file under
   `MOD`); screens SCR-MOD-03 (Appeal dialog, embedded) and SCR-MOD-04 (Policy pages, 4 routes). Proposed BR IDs
   BR-MOD-022…028 and BR-BLK-001…005 are placeholders for the owning files.
3. **Overlaps with other agents:**
   - *Story page agent (SE-STORY-01):* the Report placement ("More actions" menu, SE-MOD-02-AC02) and the hidden-for-owner
     quick fix (F-STORY-01).
   - *Reader agent (SE-READ-01):* end-of-chapter Report hit area; "Report this paragraph" entry in the paragraph sheet
     (SE-MOD-02-AC10); the gate is rendered inside the full app shell (orchestrator observation).
   - *Community/comments agent (SE-CMT-01):* comment "⋯" menu holding Report + Block; blocked-comment placeholder
     (FP-064); hidden-comment note link to the rule (FP-006).
   - *Account/settings agent (SE-SET-01, FP-008):* "Blocked accounts" section; the 18+ switch wording aligned with
     SE-MAT-01; account lifecycle requests (JRN-MOD-05) remain FP-008.
   - *Auth agent (SE-AUTH-02):* consent line linking Terms/Privacy (FP-065); `next` keeping query/hash
     (BRC-MOD-03) affects sign-in.
   - *Shell agent (SE-SHELL-01, FP-019):* footer with policy links; header 18+ control label; WBS §1.2 `(admin)`
     route group for the console without the bottom nav. Desktop navigation work (U-SHELL-01) should leave room for
     the 18+ label.
   - *Notifications agent (FP-013, FP-026):* moderation notification types defined in the FP-006 amendment must be
     added to the same type registry and to BR-SET-006's switch list (affected-party notices not switchable).
   - *Studio agent (SE-STM-01/02):* "Removed by a moderator" row + Appeal (FP-006/FP-063); corrected 18+ hint
     (`studio/strings.en.ts:187`).
   - *Platform/ops agent (FP-010):* `job_health()` is consumed by FP-066 Health. Do not specify it twice.
4. **Priority changes proposed:** FP-024 core subset P3 → P2; FP-031 P3/Optional → P2/Maturity; FP-065 introduced as
   P1/MVP (legal pages = WBS 6.9).
5. **Phase 1 citation drift:** `flag-content-dialog.md` cites `report-button.tsx:309-421`, but the file has 143 lines
   at both baseline and HEAD. The correct ranges are `:54-56` (auth/owner checks), `:86-88` (guest redirect),
   `:66-77` (submit), `:93-140` (dialog). Worth fixing during consolidation.
6. **Not verified:** everything signed-in (console, dialog, header dialog contents, the appearance of the success
   toast) is Code-only. The exact pixel height of the Report and gate buttons is read from screenshots, not measured
   per element. `metrics.json` gives page-level counts only.
