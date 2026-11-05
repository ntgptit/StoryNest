# Implementation Readiness

For each proposal: can an agent start once the Product Owner approves it, and what does it need (decisions,
dependencies, migration, rollback, tests, quality gates)? This page does **not** approve anything; it says what
would be needed. Entry point: [README](../README.md). Decisions: [product-decisions.md](product-decisions.md).
Evidence: [runtime verification](../verification/README.md) (2026-11-05).

> **WBS mapping:** every Ready / Pending Decision item below has a work package in
> [`docs/WBS.md` Phase 9](../../WBS.md#phase-9-hoàn-thiện-sau-product-discovery-lập-2026-11-05--92-ngày) (⬜ = Ready,
> ⚠️ = Pending Decision, ⛔ = Blocked), or is mapped to an existing WP (0.7, 1.1, 6.4, 6.7, 6.8, 6.9, 8.2, 8.3, 8.5).

## 1. Status definitions

| Status | Meaning | What unblocks it |
| --- | --- | --- |
| **Ready** | No open business decision; evidence is Verified (Code or Runtime); dependencies are met or part of the same item. Still needs the Product Owner's approval of the FP itself | PO approval + WBS work package |
| **Pending Decision** | A business/product decision is open. A recommendation may exist (PD-*) but is not approved | Approve the PD/Q in [product-decisions.md](product-decisions.md) |
| **Blocked** | Depends on something outside engineering (legal content, credentials, owner actions) or on an unbuilt prerequisite (WBS 6.7, Phase 7) | The external input |
| **Needs Verification** | The key premise is Inferred, or a signed-in behaviour was not reproduced at runtime | Re-run the listed check before designing the change |

An item can carry a secondary flag (e.g. *Ready · part A*). **Fix-now** marks verified defects that should get a
separate fix task first (§3); fixing them is outside this documentation task.

## 2. Readiness by proposal

### 2.1 Phase 1 proposals

| FP | Title | Status | Blocking item / note | Evidence level |
| --- | --- | --- | --- | --- |
| FP-001 | Role limits in the database | Pending Decision · **Fix-now** | PD-04 (Q-TEAM-02). WBS 3.2/3.4 already document owner-only delete, so approval is expected to be quick. Include F-STM-09 | Verified (Runtime) VER-TEAM-05/06, VER-AUT-15 |
| FP-002 | One suspension policy | Pending Decision · part B Ready after PD-05 | PD-05 (writes), PD-06 (content visibility) | Verified (Runtime) VER-MOD-08; F-HOME-01 Code |
| FP-003 | Never lose typed text | **Ready · Fix-now** | Q-HIST-01 refines the restore backup; not blocking | Verified (Runtime) VER-AUT-06/08 |
| FP-004 | Not-found and error pages | **Ready · Fix-now** | — | Verified (Runtime) RT-01, VER-AUT-11, VER-MOD-02/06 |
| FP-005 | Server-side 18+ | Pending Decision | Q-SEO-01, Q-MAT-02, Q-MAT-03 | Verified (Runtime) RT-06 |
| FP-006 | Moderation outcomes visible | Pending Decision | Q-MOD-04; write part of Q-AUTH-03 via PD-05 | Verified (Runtime) VER-MOD-05/08 |
| FP-007 | Abuse limits | Ready (link-count fix) · Pending Decision (extension) | Q-ABU-02 confirms the policy; Q-ABU-01 for tuning | Verified (SQL) |
| FP-008 | Account lifecycle | **Blocked** | Q-X-01 legal policy | Documented |
| FP-009 | Complete sign-up and sign-in | Ready (resend, username alignment, change password) · **Blocked** (Google, captcha, leaked-password) | Q-X-03 owner actions, Q-AUTH-02 | Verified (Code); sign-up/email flows not run (would send email) |
| FP-010 | Scheduled publishing reliability | Pending Decision | Q-JOB-01, Q-EDT-02, Q-EDT-05 | Verified (Runtime) VER-AUT-09/10 |
| FP-011 | Stable links | Ready (chapter part) · Pending Decision (usernames: Q-PRF-02) | — | Verified (Runtime) VER-AUT-07 |
| FP-012 | Completion and Continue | Pending Decision · Needs Verification (95 % rule) | Q-PROG-01, Q-READ-01; F-PROG-01 not conclusive with short test chapters | Verified (Runtime) F-PROG-02; F-PROG-01 Code |
| FP-013 | Notification safety and deep links | Ready (excerpt blanking, deep link) · Pending Decision (retention: Q-NOTI-01) | — | Verified (Runtime) VER-RDR-08 |
| FP-014 | Reading-list integrity | Pending Decision · Needs Verification (F-LIST-01) | Q-LIST-01, Q-LIST-02 | Inferred (F-LIST-01) |
| FP-015 | Library paging, URL tabs, undo | Ready | Q-LIB-02 minor | Verified (Code) |
| FP-016 | Team lifecycle | Pending Decision | Q-TEAM-01 (editor publishing), Q-TEAM-03 | Verified (Runtime) VER-TEAM-04/07 |
| FP-017 | Taxonomy provisioning | Pending Decision | Q-TAX-01, Q-TAX-02 | Verified (Code/Runtime RT-07) |
| FP-018 | Studio robustness | Ready · Needs Verification (F-STM-04 retry) | — | Verified (Code); F-STM-04 Inferred |
| FP-019 | Navigation | Pending Decision | Q-SHELL-01/02, BRC-SHELL-02 | Verified (Runtime) |
| FP-020 | Async-state pattern | Ready | — | Verified (Code) |
| FP-021 | Server-side language | Pending Decision | Q-I18N-01 | Verified (Runtime) RT-08 |
| FP-022 | Accessibility pass | Ready | — | Verified (Runtime) metrics + Code |
| FP-023 | Security headers / CSP | Ready | Test in report-only mode first | Verified (Code) |
| FP-024 | Moderation console productivity | Pending Decision (Q-MOD-03) · core subset Ready | — | Verified (Runtime) VER-MOD-01/06 |
| FP-025 | Richer comments | Pending Decision | Q-CMT-02 | Verified (Code) |
| FP-026 | Notification types and channels | **Blocked** (channels: WBS 6.7) · Pending Decision (types: Q-NOTI-02/03) | — | Verified (Code) |
| FP-027 | Guest device progress | Ready (optional) | — | Verified (Code) |
| FP-028 | Discoverable public lists | Pending Decision | Q-LIST-03, Q-SEO-02 | Verified (Code) |
| FP-029 | Recommendation feedback | Pending Decision | Q-REC-01 | Documented |
| FP-030 | Image alt, paste/drop, clean-up | Ready (optional) | DB column + RPC snapshot change | Verified (Code) |
| FP-031 | Reporter feedback | Ready | — | Verified (Code) |
| FP-032 | Guest landing | Ready after FP-037, FP-045, FP-046 rails | — | Verified (Runtime) |
| FP-033 | Faster reordering | Ready | — | Verified (Code) |
| FP-034 | Editor publish safety | Delivered through FP-060 (DEC-018) | — | — |

### 2.2 Phase 2 proposals

| FP | Title | Status | Blocking item / note | Evidence level |
| --- | --- | --- | --- | --- |
| FP-035 | First-run welcome | Pending Decision | BRC-AUTH-01 (move identity fields) | Verified (Code) |
| FP-036 | Appearance and motion | Pending Decision | Q-SET-01 | Verified (Code) |
| FP-037 | Design-system consistency | Ready | Visual review of variants | Verified (Runtime) metrics |
| FP-038 | Connectivity awareness | **Needs Verification** | Premise (TanStack pauses offline) not observed | Inferred |
| FP-039 | Public site frame | Ready (icons, manifest, footer shell) · **Blocked** (legal links: Q-X-02) | — | Verified (Runtime) |
| FP-040 | Story facts | Pending Decision | PD-08, Q-HOME-03 | Verified (Code) |
| FP-041 | Filter and sort | Pending Decision | PD-08, Q-HOME-03; shares the predicate with FP-002 | Verified (Code) |
| FP-042 | Search beyond titles | Pending Decision | Q-SRCH-02 | Verified (Code) |
| FP-043 | Immersive reader | Pending Decision (PD-01, PD-02) · **minimal overlap fix Ready · Fix-now** | — | Verified (Runtime) F-READ-01 |
| FP-044 | Reading continuity (incl. FP-052) | Pending Decision | PD-09 | Verified (Runtime) VER-RDR-10 |
| FP-045 | Responsive layouts | Pending Decision (design approval of BRC-HOME-02) | After FP-037 | Verified (Runtime) |
| FP-046 | Ranking scopes | Pending Decision | Q-RANK-02 | Verified (Code) |
| FP-047 | What's new | Pending Decision | Q-LIB-04 | Verified (Code) |
| FP-048 | One "Save" | Ready (stage A, PD-07) · Deferred (stages B/C) | — | Verified (Code) |
| FP-049 | Two-way conversations | Pending Decision | Q-CMT-04, Q-NOTI-06, BRC-CMT-01, BRC-NOTI-01 | Verified (Runtime) VER-RDR-08 |
| FP-050 | Tunable notification inbox | Ready | — | Verified (Code) |
| FP-051 | Share | Ready | Q-SEO-01 affects only 18+ previews | Verified (Code) |
| FP-053 | Story workspace | Ready | — | Verified (Code) |
| FP-054 | Reader-visibility status and warnings | **Ready · Fix-now** | Q-STM-03 only for changing the default | Verified (Runtime) VER-AUT-02/04 |
| FP-055 | Author dashboard | Ready | — | Verified (Code/Runtime U-STM-08) |
| FP-056 | Audience insights | Pending Decision | Q-STAT-02, BRC-STAT-01 | Verified (Code) |
| FP-057 | Author comments tab | Pending Decision | Q-CMT-03 | Verified (Code) |
| FP-058 | Focused writing frame | Pending Decision | PD-03 | Verified (Code) |
| FP-059 | Draft checkpoints | Pending Decision | Q-HIST-03, BRC-HIST-01 | Verified (Runtime) VER-AUT-08 |
| FP-060 | Pre-publish review | Ready | Uses FP-054; Q-EDT-01 refines checks | Verified (Runtime) VER-AUT-04 |
| FP-061 | Editing presence | **Needs Verification** | Private Realtime channel authorisation | Inferred |
| FP-062 | Writing aids | Ready (optional) | — | Verified (Code) |
| FP-063 | Appeals | Pending Decision | Q-MOD-06, BRC-MOD-02 | Verified (Code) |
| FP-064 | Block another user | Pending Decision | Q-MOD-07 | Verified (Code) |
| FP-065 | Guidelines, legal pages, copyright | **Blocked** (content: Q-X-02) · drafting Pending Decision (PD-10) | — | Verified (Code) |
| FP-066 | Operations area | Pending Decision | BRC-MOD-01, Q-MOD-09, Q-ABU-01 | Verified (Code) |

### 2.3 Summary

| Status (primary) | Count | Items |
| --- | --- | --- |
| Ready (incl. Ready parts) | 28 | FP-003, 004, 007a, 009a, 011a, 013a, 015, 018, 020, 022, 023, 024 core, 027, 030, 031, 032, 033, 037, 039a, 043 minimal, 048 A, 050, 051, 053, 054, 055, 060, 062 |
| Pending Decision | 32 | FP-001, 002, 005, 006, 010, 012, 014, 016, 017, 019, 021, 025, 028, 029, 035, 036, 040, 041, 042, 043, 044, 045, 046, 047, 049, 056, 057, 058, 059, 063, 064, 066 — plus parts of FP-007, 011, 013, 024, 026, 065 |
| Blocked | 5 | FP-008, FP-009 (part), FP-026 (channels), FP-039 (legal links), FP-065 |
| Needs Verification | 5 | FP-012 (95 % rule), FP-014 (F-LIST-01), FP-018 (F-STM-04), FP-038, FP-061 |

Counts overlap where an FP has parts in two states.

## 3. Fix-now candidates (verified defects, separate implementation task)

Verified at runtime or in SQL; each is a correction of established behaviour, not a new feature. Implementation is
**not** part of this task.

| # | Defect | Evidence | Fix outline | Decision needed | Size |
| --- | --- | --- | --- | --- | --- |
| 1 | **F-STM-09** Owner cannot restore a deleted story on Supabase | VER-AUT-15; `pg_proc` privileges | Make the guard independent of caller privileges (e.g. `SECURITY DEFINER` + fixed `search_path` on the trigger function, or an owner-only restore RPC from FP-001); add a test that runs with real role privileges | None (restoring own stories is documented, WF-STM-06) | S |
| 2 | **F-READ-01** Reader toolbar and progress hidden under the header | Runtime (390/1280 px) | Minimal: offset the reader bar below the site header (or make the header non-sticky on chapter routes); the full frame is FP-043 | None for the minimal fix | S |
| 3 | **F-STM-08** First chapter reaches nobody; panel claims readers see it | VER-AUT-02/04 | FP-054 indicator + correct publish-panel copy based on story visibility/status | None | S/M |
| 4 | **F-EDT-02 / F-HIST-01** Text loss on leaving the editor / restoring | VER-AUT-06/08 | FP-003 (flush before navigation, keep backup on restore) | None | M |
| 5 | **F-STM-01 / F-CHM-01** Role limits only in the UI | VER-TEAM-05/06 | FP-001 RPCs + revoke `deleted_at` grants | PD-04 | S |
| 6 | **F-SHELL-01** Soft 404s and default English pages | RT-01, VER-AUT-11, VER-MOD-02/06 | FP-004 | None | S |
| 7 | **F-ABU-01** Two `https://www.` links refused as spam | SQL check | Count one match per URL + test | Q-ABU-02 (policy confirmation) | S |
| 8 | **F-EDT-01** Schedule offered where it always fails | VER-AUT-10 | Hide/explain on published chapters | Q-EDT-05 (optional) | S |
| 9 | **F-CMT-02 + follow while suspended** | VER-MOD-08 | Add `is_active_account()` checks | PD-05 | S |

## 4. Impact analysis of the first increment (I-1 Safe core)

| Item | Frontend | Shared components | API / RPC | Database / RLS | Jobs | Other screens |
| --- | --- | --- | --- | --- | --- | --- |
| F-STM-09 / FP-001 | Studio restore/delete call the RPC | — | `set_story_deleted`, `set_chapter_deleted` | Trigger function privileges; revoke `deleted_at` from UPDATE grants | — | SCR-STM-01/03, SCR-CHM-01 |
| FP-002 (B) | Suspension banner in shell | Banner widget | — | `is_active_account()` in `stories_update`, `chapters_update`, `chapter_drafts_all`, comment edit, follow/save | — | all write screens |
| FP-003 | Editor, history, story/profile forms | `useUnsavedChangesGuard` in `_shared` | History restore passes displayed revision | — | — | SCR-EDT-01, SCR-HIST-01/02, SCR-STM-02/03, SCR-PRF-02 |
| FP-004 | `not-found.tsx`, `error.tsx`, `global-error.tsx`; studio UUID check; author `generateMetadata` | `EmptyState`, `ErrorState` | — | — | — | all routes |
| FP-043 (minimal) | Reader bar offset | `AppShell` sticky offset | — | — | — | SCR-READ-01, SCR-HIST-02 |
| FP-054 | Studio row chip, story form warnings, publish-panel copy | Visibility chip | Optional `story_reader_visibility` helper | — | — | SCR-STM-01/02/03, SCR-EDT-01 |
| FP-019 (tablet nav) | Shell breakpoints | `BottomNav` | — | — | — | all `(main)` routes |

## 5. Migration and rollback rules

| Change type | Migration | Rollback | Notes |
| --- | --- | --- | --- |
| New/changed RPC or trigger | New file `supabase/migrations/<ts>_<name>.sql` with a `-- Rollback:` header (repo convention, e.g. `20261104000400_chapter_management.sql:24`) | The rollback SQL in the header; revert the PR | Regenerate types (`pnpm db:types`); never edit an applied migration |
| RLS / grant change | Same; state the before/after policy in the header | Re-create the previous policy/grant | **Check privileges on Supabase, not only on the shim** (lesson from F-STM-09): `has_function_privilege`, `pg_proc.prosecdef` |
| Data migration (e.g. categories, FP-017) | Idempotent `INSERT … ON CONFLICT DO NOTHING` | Delete by the inserted ids | Never in `seed/` for production data |
| UI-only | — | Revert the PR | No feature-flag system exists; keep changes small and per screen |
| New route group / frame (FP-043, FP-058, FP-053) | — | Revert; URLs stay unchanged by design | Re-test FP-004 inside the new frame |

## 6. Testing per change

| Layer | Required | Tooling |
| --- | --- | --- |
| Pure logic (`model/`, `utils`) | Unit tests | Vitest (`pnpm test`) |
| Screens/components | Component tests for new states (loading, empty, error, disabled, unsaved) | Vitest + Testing Library (existing `*.test.tsx`) |
| SQL (RPC, RLS, triggers) | SQL tests for every allowed and refused case | `supabase/tests/*.sql` via `pnpm db:verify` |
| Real Supabase parity | For RLS/trigger/privilege changes: apply to dev and re-run the affected `VER-*` cases | [verification/](../verification/README.md) Playwright run-book |
| End-to-end | Re-run the VER cases listed for the item; add new cases for new behaviour | Playwright (WBS 0.7 to make it a permanent `pnpm test:e2e`) |
| Visual / a11y | Screenshots at 390 / 768 / 1280 px; touch targets ≥ 44 px; keyboard path; vi + en | Playwright screenshots; FP-022 checks |

## 7. Quality gates

| Gate | When |
| --- | --- |
| `pnpm gate` green (format, lint, typecheck, test, check:hardcode, check:tokens, db:types:check, db:verify, build web) | Every PR (README) |
| Affected `VER-*` cases pass on `storynest-dev` | PRs touching RLS, RPC, triggers, auth, publishing, moderation |
| Privileges verified on Supabase for new SECURITY DEFINER/INVOKER functions and triggers | DB PRs |
| Spec updated: BR text in `domains/**`, screen spec, `[Proposed]` AC moved to implemented, finding closed | Every behaviour change (CONVENTIONS §6) |
| WBS work package updated | Every approved feature |
| No credentials in repo/logs; QA data only on dev | Verification runs |

## 8. Dependencies (summary)

```text
PD-04 ─► FP-001 (+F-STM-09) ─► FP-016
PD-05 ─► FP-002 B ─► FP-006 banner ─► FP-063 (appeals)
PD-06 ─► FP-002 A ─► FP-041 (shared discovery predicate) ─► FP-040
FP-054 ─► FP-060            FP-037 ─► FP-045 ─► FP-032
PD-01/02 ─► FP-043 ─► FP-044 ─► FP-047      PD-03 ─► FP-058 ─► FP-059
FP-012 ─► FP-044, FP-047    FP-011 ─► FP-013 ─► FP-049
Q-X-01 ─► FP-008    Q-X-02 ─► FP-065 ─► FP-039 legal links    Q-X-03 ─► FP-009 (Google, captcha)
WBS 6.7 + Phase 7 ─► FP-026 channels
```
