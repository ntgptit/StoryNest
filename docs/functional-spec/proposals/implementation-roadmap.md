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
