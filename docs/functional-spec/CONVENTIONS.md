# Functional Spec Conventions

How this Living Functional Specification is written and kept up to date. Read this before editing any file under
`docs/functional-spec/`.

## 1. Sources of truth and precedence

| Order | Source | Role |
| --- | --- | --- |
| 1 | `docs/WBS.md` §4 "Quyết định đã chốt" (Q1–Q7) and per-WP "Đã làm" notes | Approved decisions and documented scope |
| 2 | `supabase/migrations/*.sql` + `supabase/tests/*.sql` | Authoritative business rules enforced by the database (RLS, RPC, triggers) |
| 3 | `packages/validation` (Zod, `limits.ts`, `enums.ts`) | Authoritative input rules shared by web/mobile |
| 4 | `packages/features/src/<feature>` (api/model/hooks/screens) | Actual client behaviour |
| 5 | `apps/web/src/app/**` | Routes, server prefetch, guards, SEO |
| 6 | Root `README.md` | Technical overview (partly stale — see coverage report) |

This spec **describes** the product; it does not replace the WBS. When code and WBS disagree, the spec records both
and raises a finding or a decision (`Q-*`) instead of silently picking one.

## 2. Verification status (mandatory on every rule, action, state and finding)

| Tag | Meaning |
| --- | --- |
| **Verified** | Directly confirmed in source code (file:line cited) or in a passing automated test / runtime check |
| **Documented** | Stated in `docs/WBS.md` or `README.md`, not confirmed in code during this analysis |
| **Inferred** | Reasonably derived from evidence; not directly stated or observed |
| **Unknown** | Cannot be established from available evidence |
| **Proposed** | Not implemented. Used only for recommended behaviour / acceptance criteria. Requires human approval |

"Verified" in this spec normally means *verified in code*. Runtime/browser verification is called out explicitly as
"Verified (runtime)" or "Verified (SQL test)".

## 3. Identifiers

| Kind | Format | Example |
| --- | --- | --- |
| Domain | `D-<DOMAIN>` | `D-READING` |
| Business object / feature | `OBJ-<CODE>` | `OBJ-READ` |
| Business rule | `BR-<CODE>-NNN` | `BR-READ-004` |
| Workflow | `WF-<CODE>-NN` | `WF-READ-01` |
| Screen | `SCR-<CODE>-NN` | `SCR-READ-01` |
| Screen component | `<SCR>-CNN` | `SCR-READ-01-C03` |
| User action | `<SCR>-ANN` | `SCR-READ-01-A05` |
| Acceptance criterion | `<SCR>-ACNN` (suffix `[Proposed]` when not implemented) | `SCR-READ-01-AC07` |
| Functional finding | `F-<CODE>-NN` | `F-CMT-02` |
| UX/UI finding | `U-<CODE>-NN` | `U-HOME-01` |
| Open question | `Q-<CODE>-NN` (indexed in the decision register) | `Q-ACC-01` |
| Feature proposal | `FP-NNN` | `FP-004` |
| Decision record | `DEC-NNN` | `DEC-003` |

Phase 2 (product discovery) identifiers:

| Kind | Format | Example |
| --- | --- | --- |
| User journey | `JRN-<ROLE>-NN`, ROLE ∈ `RDR` reader/guest, `AUT` author/team, `MOD` moderator/operator (incl. reporter and affected party), `ACC` account lifecycle | `JRN-RDR-05` |
| Capability (gap matrix row) | `CAP-<AREA>-NN`, AREA ∈ `READ`, `DISC`, `ENG`, `AUTH` (author), `TNS`, `ACCT`, `PLAT`, `GROW` | `CAP-READ-04` |
| Screen enhancement | `SE-<CODE>-NN`, mirrors the screen it assesses (`SCR-HOME-01` → `SE-HOME-01`) | `SE-READ-01` |
| Screen enhancement AC | `SE-<CODE>-NN-ACnn` (always `[Proposed]` until implemented) | `SE-READ-01-AC03` |
| Business-rule change proposal | `BRC-<CODE>-NN` — proposes a change to a Verified rule; never edits the rule until approved | `BRC-READ-01` |
| External benchmark | `BM-NN` | `BM-12` |

Verification tags used from Phase 2 on: `Verified (Code)`, `Verified (Runtime)`, `Documented`, `Inferred`,
`Proposed`, `Unknown`. Phase 1's plain "Verified" means `Verified (Code)` unless the text says runtime or SQL test.

Object codes (single registry — do not invent new ones without adding them here):

| Domain | Folder | Object codes |
| --- | --- | --- |
| `D-ACCOUNT` Account & Identity | `domains/account` | `AUTH` authentication, `PRF` profile & avatar, `SET` account settings & language |
| `D-DISCOVERY` Discovery | `domains/discovery` | `HOME` home/discover feed, `TAX` categories & tags, `SRCH` search, `RANK` rankings, `REC` recommendations, `AUTHOR` author page, author follow & following feed |
| `D-READING` Reading | `domains/reading` | `STORY` public story page, `READ` chapter reader & reader preferences, `PROG` reading progress & read counting |
| `D-COMMUNITY` Community & Engagement | `domains/community` | `VOTE` chapter votes, `CMT` comments (incl. author moderation), `NOTI` notifications |
| `D-LIBRARY` Library | `domains/library` | `LIB` library, story follow & save, `LIST` reading lists |
| `D-STUDIO` Authoring (Studio) | `domains/studio` | `STM` story management (studio list, create/edit, cover, tags, slug, delete/restore), `CHM` chapter management, `EDT` chapter editor, autosave & publishing, `HIST` version history & preview, `TEAM` collaboration, `STAT` author analytics |
| `D-TRUST` Trust & Safety | `domains/trust-safety` | `MOD` reports & moderation console, `MAT` mature (adult) content, `ABU` abuse limits & spam filter |
| `D-PLATFORM` Platform (cross-cutting) | `domains/platform` | `SHELL` app shell & navigation, `I18N` language, `SEO` SEO & sharing, `JOB` background jobs (outbox, cron), `DEV` developer tools |

## 4. Rule ownership (no duplication)

A rule is defined **once**, in the business object that owns the data it governs. Other documents link to it by
ID. Example: "unlisted stories are readable by link but excluded from discovery" is owned by `BR-STORY-*` and only
referenced from discovery, search and ranking.

## 5. File templates

### `domains/<domain>/overview.md`
Purpose, actors, business objects table (ID, name, folder, screens), cross-domain dependencies, domain-level open
questions.

### `domains/<domain>/<object>/business-rules.md`
1. Overview table: Object ID, name, business purpose, user goals, actors/roles, related entities (tables, RPCs), dependencies.
2. One section per rule:

```
### BR-XXX-001 — <short name>
| Field | Value |
| --- | --- |
| Description | ... |
| Preconditions | ... |
| Conditions | ... |
| Expected behavior | ... |
| Exceptions | ... |
| Related screens | SCR-... |
| Evidence | `path/file.ts:120`, `supabase/tests/xx.test.sql` |
| Status | Verified / Documented / Inferred / Unknown |
```

### `domains/<domain>/<object>/workflows.md`
One section per workflow: ID, user goal, trigger, preconditions, main flow (numbered), alternative flows, exception
flows, success criteria, postconditions, affected objects, related screens, status.

### `domains/<domain>/<object>/screens/<screen>.md`
A. Identification · B. Components (table) · C. User actions & system responses (one table per action, fields:
Action ID, Trigger, Preconditions, Expected behavior, State change, Validation, Error behavior, Navigation,
Evidence) · D. UI states (table with Implemented / Missing / Recommended) · E. Acceptance criteria (Given/When/Then)
· F. Findings referenced (links to audits) · G. Open questions.

## 6. Maintenance

- Update the spec in the same PR as the behaviour change (WBS DoD: "README/WBS cập nhật" also covers this folder).
- When a proposal is approved, record it in `proposals/decision-register.md` and move its acceptance criteria from
  `[Proposed]` to the screen spec when implemented.
- Re-run the counts in `audits/coverage-report.md` after large changes.
