# Implementation Roadmap

Proposed execution order for the [feature backlog](feature-backlog.md). It is a recommendation for approval, not a
commitment. It is meant to be merged into `docs/WBS.md` once approved (the WBS stays the planning source of truth).
Entry point: [README](../README.md).

## 1. Scoring

Each proposal was scored 1–3 on each criterion. A priority follows from the total, adjusted by severity: any
permission bypass or data loss is at least P1.

| Criterion | 3 | 2 | 1 |
| --- | --- | --- | --- |
| User value | Prevents loss/harm or unblocks a core loop | Clear daily benefit | Nice to have |
| Frequency | Every session / every reader | Weekly or per author | Rare |
| Workflow criticality | Core loop (read, write, publish, moderate) | Supporting loop | Peripheral |
| Severity today | Security / data loss / moderation bypass | Wrong or misleading behaviour | Cosmetic |
| Effort (inverse) | S | M | L |
| Technical risk (inverse) | Local change | Migration with tests | Cross-cutting / external |
| Dependencies (inverse) | None | Needs a product decision | Needs external party (legal, Google, stores) |

| FP | Value | Freq | Crit | Sev | Effort | Risk | Deps | Total | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FP-001 | 3 | 1 | 3 | 3 | 3 | 2 | 2 | 17 | P1 (permission bypass) |
| FP-002 | 3 | 2 | 3 | 3 | 2 | 2 | 2 | 17 | P1 (moderation bypass) |
| FP-003 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 19 | P1 (data loss) |
| FP-004 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 17 | P1 (every 404/crash path) |
| FP-005 | 3 | 1 | 2 | 3 | 3 | 3 | 2 | 17 | P2 |
| FP-006 | 2 | 1 | 3 | 2 | 2 | 2 | 2 | 14 | P2 |
| FP-008 | 3 | 1 | 2 | 3 | 1 | 1 | 1 | 12 | P1 (compliance before launch, blocked) |
| FP-009 | 3 | 2 | 3 | 2 | 2 | 2 | 1 | 15 | P2 |
| FP-010 | 3 | 1 | 3 | 2 | 2 | 2 | 2 | 15 | P2 |
| FP-012 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 18 | P2 |
| FP-019 | 2 | 3 | 2 | 1 | 2 | 3 | 2 | 15 | P2 |
| FP-022 | 2 | 3 | 2 | 2 | 2 | 3 | 3 | 17 | P2 |
| FP-025…033 | 1–2 | 1–2 | 1 | 1 | 1–3 | 2 | 1–3 | ≤ 12 | P3 |

The remaining proposals (FP-007, 011, 013–018, 020, 021, 023, 024, 034) scored 12–16 and are P2/P3 as listed in the
backlog.

## 2. Phases

### Phase 1 — Critical gaps and broken workflows (≈ 6–8 days)

| Order | Item | Why first | Depends on |
| --- | --- | --- | --- |
| 1 | Decisions Q-TEAM-02, Q-MOD-01, Q-STM-01, Q-CMT-01 ([register](decision-register.md)) | FP-001/002 scope | Owner |
| 2 | FP-001 Role limits in DB | Small, security, unblocks honest role copy (FP-016) | Q-TEAM-02 |
| 3 | FP-002 Suspension policy | Moderation is already live (WBS 6.1) | Q-MOD-01; shares predicate with SEO |
| 4 | FP-003 Never lose text | Highest author-facing risk | — |
| 5 | FP-004 Not-found / error pages | Cheap, removes soft-404s and English pages | — |
| 6 | FP-005 Server-side 18+ | Small; legal/safety exposure | Q-SEO-01, Q-MAT-02, Q-MAT-03 |
| 7 | FP-006 Moderation outcomes | Builds on FP-002 banner and the outbox | FP-002 |

Exit criteria: no known permission bypass, no known data-loss path, every list respects suspension and 18+ rules, and
`pnpm gate` is green with new SQL tests.

### Phase 2 — Core functionality completion (≈ 15–20 days)

| Group | Items | Notes |
| --- | --- | --- |
| Account (launch blockers) | FP-009, FP-008, FP-017 (categories data) | FP-008 is blocked until the legal policy for Q7 exists; FP-009 needs Google credentials and Supabase settings (owner) |
| Authoring reliability | FP-010, FP-018, FP-016 | FP-016 copy depends on FP-001 / Q-TEAM-01 |
| Reading and library | FP-012, FP-015, FP-014 | FP-012 changes drop-off numbers in stats: announce |
| Links and notifications | FP-011, FP-013 | FP-011 before more notification types (FP-026) |
| Platform hardening | FP-023, FP-007 | Align with WBS 8.3 / 6.8 |

### Phase 3 — UX/UI consistency and productivity (≈ 8–10 days)

FP-019 (navigation, needs Q-SHELL-01) → FP-020 (async-state pattern, touches many screens, so do it before FP-022)
→ FP-022 (accessibility, folds into WBS 8.5) → FP-021 (server-side language) → FP-034, FP-024, plus the quick-fix list.

### Phase 4 — Optional enhancements (as capacity allows)

FP-026 (with WBS 6.7 push and Phase 7 mobile), FP-030, FP-025, FP-032, FP-033, FP-027, FP-028, FP-029, FP-031.

## 3. Dependency graph

```text
Q-TEAM-02 ─► FP-001 ─► FP-016
Q-MOD-01  ─► FP-002 ─► FP-006 ─► FP-026 (moderation notification types)
                └────► (sitemap predicate shared with SEO)
FP-003 (independent)          FP-004 ─► FP-021 (translated metadata)
FP-011 ─► FP-013 ─► FP-026     FP-020 ─► FP-022
Legal Q7 ─► FP-008             Google creds / Supabase config ─► FP-009
WBS 6.7 + Phase 7 ─► FP-026 channels, FP-027
```

## 4. Relationship to the WBS

| WBS item | Covered by |
| --- | --- |
| 1.1 🟡 (Google OAuth) | FP-009 |
| 6.4 ⬜ Account lifecycle | FP-008 |
| 6.8 🟡 Abuse limits | FP-007, FP-009 (captcha) |
| 8.2 Monitoring | FP-010 (job health) |
| 8.3 Security review | FP-001, FP-002, FP-023 |
| 8.5 Accessibility | FP-022 |
| 6.7 Push, Phase 7 Mobile | Not re-planned here; FP-026/027 depend on them |

---

## Phase 2 update (product discovery, 2026-11-05)

Adds the 31 active Phase 2 proposals (`FP-035…FP-066`, FP-052 merged into FP-044) to the plan above. Sources:
[product discovery](product-discovery.md), [screen enhancements](screen-enhancements.md),
[feature backlog](feature-backlog.md#phase-2-proposals-product-discovery). Still a recommendation: nothing here is
approved, and approved items move into `docs/WBS.md`.

### 5.1 Ranking method

Each proposal is weighed on eight criteria: user impact, frequency of use, core-journey importance, product
completeness, implementation effort (inverse), technical risk (inverse), dependencies (inverse) and evidence
confidence (Verified (Runtime) > Verified (Code) > Inferred > Hypothesised). **Security, privacy and data-loss items
are ranked first regardless of score**, and items blocked by an open decision cannot be scheduled until it is
answered.

### 5.2 Ranked backlog

#### A. Critical before launch (security, privacy, data loss, broken core journeys)

| Rank | FP | Why it is critical | Evidence | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | FP-001 Role limits in the database | Permission bypass (co-authors delete stories, editors delete chapters) | Verified (Code) | Q-TEAM-02 |
| 2 | FP-003 Never lose typed text | Data loss when leaving the editor or restoring a version | Verified (Code) | — |
| 3 | FP-002 One suspension policy | Moderation bypass on Home and sitemap; suspended users keep editing | Verified (Code) | Q-MOD-01 |
| 4 | FP-005 Server-side 18+ protection | Adult titles and text in HTML and link previews | Verified (Runtime) | Q-SEO-01, Q-MAT-02/03 |
| 5 | **FP-043** Immersive reader frame | Reader toolbar and progress hidden under the header after scrolling; bottom nav covers text | **Verified (Runtime)** | Q-READ-02, BRC-SHELL-01 (a minimal fix that stops the overlap needs no decision) |
| 6 | **FP-054** Reader-visibility status and warnings | First chapters of new stories reach nobody by default, silently | Verified (Code) | — |
| 7 | FP-004 Not-found and error pages | Soft 404s, English default pages | Verified (Runtime) | — |
| 8 | FP-019 Navigation at every width (amended) | Tablet 768 px has no navigation at all; desktop has no section links | **Verified (Runtime)** | Q-SHELL-01, BRC-SHELL-02 |
| 9 | **FP-065** Guidelines, legal pages, copyright requests | WBS 6.9; no terms/privacy anywhere; moderation cites a policy that does not exist | Verified (Code) | **Q-X-02**, Q-MOD-08 |
| 10 | FP-008 Account lifecycle | Legal requirement before public launch | Documented (WBS 6.4) | **Q-X-01** |
| 11 | FP-009 Complete sign-up and sign-in | OAuth approved for M1, cross-device links, captcha | Verified (Code) | Q-AUTH-02, Google keys |
| 12 | FP-023 Security headers and CSP | Hardening (WBS 8.3) | Verified (Code) | — |
| 13 | FP-006 Moderation outcomes visible | Removed stories look self-deleted; nobody is told | Verified (Code) | Q-MOD-04, Q-AUTH-03 |
| 14 | **FP-039** Public site frame | No footer, icons, manifest or default share card | Verified (Runtime) | Q-X-02 (legal links only), Q-SHELL-03 |
| 15 | FP-007 / FP-017 / FP-010 | Spam false positives; no prod categories; silent schedule failures | Verified (Code/SQL) | Q-ABU-02, Q-TAX-01, Q-JOB-01 |

#### B. Missing capabilities for product completeness (core journeys)

| Rank | FP | Journey it completes | Notes |
| --- | --- | --- | --- |
| 16 | FP-012 Correct completion and "Continue" | JRN-RDR-05/06 | Prerequisite of FP-044 and FP-047 |
| 17 | **FP-044** Reading continuity (absorbs FP-052) | JRN-RDR-05/06/11 | Q-STORY-02, BRC-STORY-01 |
| 18 | **FP-047** What's new (Home continue rail, new-chapter badges) | JRN-RDR-06/10/11 | Q-LIB-04 |
| 19 | **FP-053** Story workspace | JRN-AUT-02/03/07 | No decision needed |
| 20 | **FP-060** Pre-publish review | JRN-AUT-10 | Reuses FP-054 |
| 21 | **FP-055** Author dashboard | JRN-AUT-01/06 | — |
| 22 | **FP-049** Two-way comment conversations | JRN-RDR-09, JRN-AUT-05 | Q-CMT-04, Q-NOTI-06 |
| 23 | **FP-051** Share story/chapter/list | JRN-RDR-11, growth | — |
| 24 | **FP-048** One "Save" (stage A first) | JRN-RDR-07/08 | Stages B/C blocked by Q-LIB-03 |
| 25 | **FP-063** Appeals · **FP-064** Block | JRN-MOD-05/08, account safety | Q-MOD-06/07 |
| 26 | **FP-040** Story facts · **FP-041** Filter and sort | JRN-RDR-02/03/04 | Q-HOME-02/03 |
| 27 | **FP-035** First-run welcome | JRN-ACC-01 | BRC-AUTH-01 for moving fields |
| 28 | FP-016, FP-013, FP-014, FP-015, FP-011, FP-018 | Phase 1 remediation bundles | As in §2 |
| 29 | FP-031 Reporter feedback (raised P3 → P2) · FP-024 console core (raised P3 → P2) | JRN-MOD-01/07 | Priority change proposed by the trust & safety review |

#### C. High-value UX improvements

FP-037 Design-system consistency → FP-045 Responsive layouts → FP-020 async states → FP-022 accessibility (with the
runtime baseline: 17 of 21 reader controls < 44 px) → **FP-058** focused writing frame (P1 if Q-EDT-06 says mobile
web authoring is a launch target) → **FP-059** draft checkpoints → **FP-050** tunable inbox → FP-021 server-side
language → FP-032 guest landing (rewritten by amendment).

#### D. Product differentiation opportunities

Paragraph comments are already a strength; build on them with FP-049 (conversations) and FP-057 (author comments
tab). Then FP-046 ranking scopes ("New & rising" helps new authors), FP-056 audience insights, FP-061 editing
presence.

#### E. Optional / later

FP-025, FP-026 (channels need WBS 6.7), FP-027, FP-028, FP-029, FP-030, FP-033, FP-036, FP-038, FP-042, FP-062,
FP-066.

### 5.3 Journey-based increments

| Increment | Goal (end-to-end) | Items | Depends on |
| --- | --- | --- | --- |
| I-1 Safe core | No permission bypass, no data loss, reading frame usable, authors know who can read | FP-001, FP-002, FP-003, FP-004, FP-043 (minimal overlap fix first), FP-054, FP-019 (tablet nav) | Q-TEAM-02, Q-MOD-01 |
| I-2 Launch readiness | A stranger can join, trust and leave the service | FP-065, FP-039, FP-005, FP-008, FP-009, FP-023, FP-006, FP-007, FP-017, FP-035 | Legal content (Q-X-01/02), Supabase/Google settings |
| I-3 Reader return loop | Readers come back and pick up where they left off | FP-012, FP-044, FP-047, FP-051, FP-048 (stage A), FP-049, FP-013, FP-015 | Q-STORY-02, Q-LIB-04, Q-CMT-04 |
| I-4 Author publishing loop | Authors publish confidently to the right audience from any device | FP-053, FP-055, FP-060, FP-010, FP-058, FP-059, FP-016, FP-018 | Q-EDT-06, BRC-SHELL-01 |
| I-5 Discovery at scale | Readers find the right story as the catalogue grows | FP-037, FP-045, FP-040, FP-041, FP-020, FP-022, FP-014, FP-011 | Q-HOME-02/03 |
| I-6 Community safety maturity | Fair, transparent moderation and self-protection | FP-063, FP-064, FP-031, FP-024, FP-050 | Q-MOD-06/07 |
| Later | Evidence-driven additions | Section E above, plus FP-046, FP-056, FP-057, FP-061 | Usage data (risk R2 in product discovery) |

Before I-3 and I-4, run the signed-in Playwright checks (WBS 0.7): every member, author and moderator claim in these
increments is code-based (risk R1).

### 5.4 Priority changes proposed in Phase 2

| FP | Phase 1 | Proposed | Reason |
| --- | --- | --- | --- |
| FP-019 | P2 | **P1** | Tablet has no navigation (runtime) |
| FP-024 (core subset) | P3 | P2 | Moderators cannot see target history or removed content before deciding |
| FP-031 | P3 / Optional | P2 / Maturity | Reporter feedback is part of moderation transparency |
| FP-034 | P3 | Delivered by FP-060 | Merged scope (DEC-018) |
| FP-032 | P3 | P3 (scope rewritten) | Concrete guest landing with runtime evidence |
