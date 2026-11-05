# Approved Feature Backlog (index)

An **index only**. It lists features whose approval is recorded in [`docs/WBS.md`](../../WBS.md), with a link to the
WBS work package and to the proposal text. It never holds scope, estimates or acceptance criteria of its own: the
WBS is the planning authority, and the proposal in [feature-backlog.md](feature-backlog.md) is the specification
until the work package says otherwise. Entry point: [README](../README.md).

Rules:
- A row is added only after the Product Owner approves the item in [product-decisions.md](product-decisions.md) **and**
  the WBS has a work package for it.
- A recommendation (`Recommended / Pending Approval`) is not approval and is not listed here.
- When the work ships, the row links to the PR; the screen spec takes over the acceptance criteria.

## Approved features

| FP | WBS work package | Approved (date, by) | Status | Spec |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

**No feature proposal is approved as of 2026-11-05.** Phase 1 and Phase 2 proposals (`FP-001…FP-066`) are all
Proposed; ten recommendations await approval in [product-decisions.md §3](product-decisions.md#3-recommended-decisions-pending-approval).

## For reference: proposals that would implement already-planned WBS work

These work packages are in the WBS plan (not delivered). The listed proposal is a candidate specification for them;
it still needs approval before it replaces or extends the WBS text.

| WBS item | WBS status | Candidate proposal |
| --- | --- | --- |
| 1.1 Google OAuth | 🟡 | FP-009 |
| 6.4 Account lifecycle (Q7) | ⬜ | FP-008 |
| 6.7 Push notification | ⬜ | FP-026 (channels part) |
| 6.8 Abuse limits (rest) | 🟡 | FP-007, FP-009 (captcha) |
| 6.9 Legal pages | ⬜ | FP-065, FP-039 |
| 8.2 Monitoring | not tracked in WBS | FP-010 (job health) |
| 8.3 Security review | not tracked in WBS | FP-023 (CSP), FP-001, FP-002 |
| 8.5 Accessibility | not tracked in WBS | FP-022 |
| §1.2 target tree: `(reader)` and `(studio)` groups | Documented plan, not built | FP-043, FP-058 (PD-01, PD-03) |
