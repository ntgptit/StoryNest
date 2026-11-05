# StoryNest — Living Functional Specification

What the application actually does, screen by screen, with its business rules, workflows, known gaps and proposed
improvements. Baseline: commit `204a1ea`, analysed 2026-11-04.

> This folder **describes** the product. The plan and approved decisions live in [`docs/WBS.md`](../WBS.md); the
> technical setup lives in the root [`README.md`](../../README.md). Nothing under `proposals/` is approved or
> implemented.

## Start here

| If you want to… | Read |
| --- | --- |
| Understand the product in 5 minutes | [application-overview.md](application-overview.md) |
| See domains, objects and who owns which rule | [domain-map.md](domain-map.md) |
| Find a screen by route | [screen-inventory.md](screen-inventory.md) |
| Follow a user journey across screens | [workflow-map.md](workflow-map.md) |
| See what is broken or missing | [audits/functional-gap-analysis.md](audits/functional-gap-analysis.md), [audits/ux-ui-gap-analysis.md](audits/ux-ui-gap-analysis.md) |
| Know how much is verified | [audits/coverage-report.md](audits/coverage-report.md) |
| Plan the next work | [proposals/feature-backlog.md](proposals/feature-backlog.md), [proposals/implementation-roadmap.md](proposals/implementation-roadmap.md) |
| Answer open business questions | [proposals/decision-register.md](proposals/decision-register.md) |
| Edit this spec | [CONVENTIONS.md](CONVENTIONS.md) (IDs, templates, verification tags, rule ownership) |

## Domains

| Domain | Objects (folder) | Screens |
| --- | --- | --- |
| [Account & Identity](domains/account/overview.md) | [authentication](domains/account/authentication/business-rules.md) · [profile](domains/account/profile/business-rules.md) · [settings](domains/account/settings/business-rules.md) | Sign in, Sign up, Forgot/Reset password, My profile, Edit profile, Settings |
| [Discovery](domains/discovery/overview.md) | [home](domains/discovery/home/business-rules.md) · [taxonomy](domains/discovery/taxonomy/business-rules.md) · [search](domains/discovery/search/business-rules.md) · [ranking](domains/discovery/ranking/business-rules.md) · [recommendations](domains/discovery/recommendations/business-rules.md) · [author](domains/discovery/author/business-rules.md) | Home, Search, Rankings, Author page, Following feed |
| [Reading](domains/reading/overview.md) | [story](domains/reading/story/business-rules.md) · [chapter-reader](domains/reading/chapter-reader/business-rules.md) · [reading-progress](domains/reading/reading-progress/business-rules.md) | Story page, Chapter reader |
| [Community & Engagement](domains/community/overview.md) | [vote](domains/community/vote/business-rules.md) · [comments](domains/community/comments/business-rules.md) · [notifications](domains/community/notifications/business-rules.md) | Comment thread (embedded), Notifications |
| [Library](domains/library/overview.md) | [library](domains/library/library/business-rules.md) · [reading-lists](domains/library/reading-lists/business-rules.md) | Library, Reading list |
| [Authoring (Studio)](domains/studio/overview.md) | [story-management](domains/studio/story-management/business-rules.md) · [chapter-management](domains/studio/chapter-management/business-rules.md) · [chapter-editor](domains/studio/chapter-editor/business-rules.md) · [version-history](domains/studio/version-history/business-rules.md) · [collaboration](domains/studio/collaboration/business-rules.md) · [analytics](domains/studio/analytics/business-rules.md) | Studio, Create/Edit story, Chapters, Editor, History, Preview, Team, Stats |
| [Trust & Safety](domains/trust-safety/overview.md) | [moderation](domains/trust-safety/moderation/business-rules.md) · [mature-content](domains/trust-safety/mature-content/business-rules.md) · [abuse-limits](domains/trust-safety/abuse-limits/business-rules.md) | Moderation console, Report dialog (embedded), 18+ gate (embedded) |
| [Platform](domains/platform/overview.md) | [app-shell](domains/platform/app-shell/business-rules.md) · [i18n](domains/platform/i18n/business-rules.md) · [seo](domains/platform/seo/business-rules.md) · [background-jobs](domains/platform/background-jobs/business-rules.md) · [dev-tools](domains/platform/dev-tools/business-rules.md) | Main shell, Dev gallery |

Each object folder has `business-rules.md`, `workflows.md` and, where it owns screens, `screens/<screen>.md`.

## At a glance

| | Count |
| --- | --- |
| Domains · objects | 8 · 31 |
| Routes · screen specs | 33 · 32 |
| Business rules · workflows | 412 · 144 |
| Functional gaps (A/B) · UX gaps (C) | 68 · 62 |
| Proposals · open questions | 34 · 56 (+3 owner actions) |

Top issues before launch: role limits enforced only in the UI (FP-001), inconsistent suspension (FP-002),
text loss when leaving the editor (FP-003), missing not-found/error pages (FP-004), client-only 18+ gate (FP-005),
no account lifecycle (FP-008). Details in the [roadmap](proposals/implementation-roadmap.md).

## Verification legend

**Verified** (code, SQL test or runtime) · **Documented** (WBS/README only) · **Inferred** · **Unknown** ·
**Proposed** (not implemented). See [CONVENTIONS §2](CONVENTIONS.md#2-verification-status-mandatory-on-every-rule-action-state-and-finding).

## Keeping it alive

1. Change behaviour → update the owning `business-rules.md` / screen spec in the same PR.
2. New screen → add it to [screen-inventory.md](screen-inventory.md) with a new `SCR-` ID from the registry.
3. Approved proposal → log it in the [decision register](proposals/decision-register.md); when shipped, move its
   `[Proposed]` acceptance criteria into the screen spec and close the related findings.
4. Re-run the counts in the [coverage report](audits/coverage-report.md#6-regenerating-the-counts).
