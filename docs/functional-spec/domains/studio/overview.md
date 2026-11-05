# D-STUDIO — Authoring (Studio): domain overview

## Purpose

The Studio is the signed-in writer's workspace: list the stories I own or was invited to, create and configure a
story (metadata, cover, tags, slug, visibility, status, 18+ flag), manage its chapters (add, order, slug, archive,
delete/restore), write and publish chapter content, look back through version history, invite collaborators, and read
audience statistics. Documented scope: `docs/WBS.md` Phase 3 (WP 3.1–3.9) and WP 6.5.

## Actors

| Actor | Who | How the system knows |
| --- | --- | --- |
| Guest | Not signed in | Redirected to `/login?next=…` by the proxy and by `requireUser` (`apps/web/src/lib/auth/route-guard.ts:4-12`, `apps/web/src/lib/auth/require-user.ts:29-33`) |
| Member (no role on a story) | Any signed-in user | `story_role(story) IS NULL` (`supabase/migrations/20261103000100_auth_and_rls.sql:83-91`) — sees "not found" on studio pages of that story |
| Owner | `stories.owner_id = auth.uid()` | `story_role = 'owner'` |
| Co-author | Accepted invitation as `co_author` | `story_role = 'co_author'` |
| Editor | Accepted invitation as `editor` | `story_role = 'editor'` |
| Moderator | JWT `app_metadata.role = 'moderator'` | Can *read* any story through RLS but the Studio refuses to open stories they do not work on (`packages/features/src/studio/api/story-write.api.ts:83-85`); moderation is D-TRUST |

What each role may do across the Studio is defined once, in the role-permission matrix
[BR-TEAM-010](collaboration/business-rules.md#br-team-010--studio-role-permission-matrix).

## Business objects

| Object | Name | Folder | Screens |
| --- | --- | --- | --- |
| `OBJ-STM` | Story management (studio list, create/edit, cover, tags, slug, delete/restore) | [story-management](story-management/business-rules.md) | [SCR-STM-01 Studio home](story-management/screens/studio-home.md) `/studio` · [SCR-STM-02 Create story](story-management/screens/create-story.md) `/studio/new` · [SCR-STM-03 Edit story](story-management/screens/edit-story.md) `/studio/story/[id]` |
| `OBJ-CHM` | Chapter management | [chapter-management](chapter-management/business-rules.md) | [SCR-CHM-01 Chapter manager](chapter-management/screens/chapter-manager.md) `/studio/story/[id]/chapters` |
| `OBJ-EDT` | Chapter editor, autosave & publishing | [chapter-editor](chapter-editor/business-rules.md) | [SCR-EDT-01 Chapter editor](chapter-editor/screens/chapter-editor.md) `/studio/story/[id]/chapter/[chapterId]` (`packages/features/src/editor/screens/chapter-editor-screen.tsx`) |
| `OBJ-HIST` | Version history & preview | [version-history](version-history/business-rules.md) | [SCR-HIST-01 Version history](version-history/screens/version-history.md) `/studio/story/[id]/chapter/[chapterId]/history` (`packages/features/src/history/screens/history-screen.tsx`) · [SCR-HIST-02 Chapter preview](version-history/screens/chapter-preview.md) `/studio/story/[id]/chapter/[chapterId]/preview` (`packages/features/src/history/screens/preview-screen.tsx`) |
| `OBJ-TEAM` | Collaboration (invitations, collaborators, **studio role matrix**) | [collaboration](collaboration/business-rules.md) | [SCR-TEAM-01 Team](collaboration/screens/team.md) `/studio/story/[id]/team` |
| `OBJ-STAT` | Author analytics | [analytics](analytics/business-rules.md) | [SCR-STAT-01 Story statistics](analytics/screens/story-statistics.md) `/studio/story/[id]/stats` |

`OBJ-EDT` and `OBJ-HIST` are written by a separate analysis; links to their files are by convention
(`chapter-editor/…`, `version-history/…`). Screen file names for them are assumed and may differ.

## Navigation map (Verified)

```
Header user menu "Studio" / bottom nav "Write"  ──►  /studio (SCR-STM-01)
  ├─ "Write a new story" ─────────────────────►  /studio/new (SCR-STM-02) ──(created)──► /studio/story/[id]
  ├─ row "Edit" (owner, co-author) ───────────►  /studio/story/[id] (SCR-STM-03)
  │                                               └─ "Manage chapters" ──► /chapters
  ├─ row "Manage chapters" (all roles) ───────►  /studio/story/[id]/chapters (SCR-CHM-01)
  │                                               ├─ "Write" ──► /chapter/[chapterId] (SCR-EDT-01) ─► history / preview
  │                                               └─ "Back to story details" ──► /studio/story/[id]
  ├─ row "Collaborators" (owner) ─────────────►  /studio/story/[id]/team (SCR-TEAM-01)
  ├─ row "Stats" (owner, co-author) ──────────►  /studio/story/[id]/stats (SCR-STAT-01) ── "Back to Studio"
  ├─ row "View story page" ───────────────────►  /story/[id]/[slug] (D-READING OBJ-STORY)
  ├─ "Collaboration invitations" inbox (MyInvitations, only when there are pending invitations)
  └─ "Show deleted stories (n)" toggle (owner's deleted stories, restore)
Notification "collaboration_invited" ──► /studio ; "collaboration_accepted/declined" ──► /studio/story/[id]/team
```

Evidence: `packages/features/src/shell/components/main-shell.tsx:18`, `packages/features/src/shell/components/user-menu.tsx:66`,
`packages/features/src/studio/screens/studio-screen.tsx:61-97,120,127,150`,
`packages/features/src/studio/screens/story-form-screen.tsx:107-112`,
`packages/features/src/studio/screens/chapter-manager-screen.tsx:231-236`, `packages/features/src/studio/components/chapter-row.tsx:180-182`,
`packages/features/src/analytics/screens/story-stats-screen.tsx:98-104`,
`packages/features/src/notifications/model/notification.ts:112-122`.

All studio routes are `robots: { index: false }` and server-render only a client view (no server prefetch: studio
data is private and per-user, `packages/features/src/studio/keys.ts:1`).

## Cross-domain dependencies

| Depends on | For | Link |
| --- | --- | --- |
| D-ACCOUNT `OBJ-AUTH` | Session, route guard, active-account check (`is_active_account`) | `../account/` |
| D-DISCOVERY `OBJ-TAX` | Categories list, tag creation rules and daily quota, popular tag suggestions | `../discovery/` (BR-TAX-*) |
| D-READING `OBJ-STORY`, `OBJ-READ` | Public story page, canonical slug redirect, reader visibility rules for stories/chapters | `../reading/` (BR-STORY-*) |
| D-COMMUNITY `OBJ-CMT`, `OBJ-NOTI` | Author comment moderation (owner/co-author), collaboration notifications | `../community/` |
| D-TRUST `OBJ-MOD`, `OBJ-MAT` | Moderator removal blocks owner restore; mature flag effects | `../trust-safety/` |
| D-PLATFORM `OBJ-SEO`, `OBJ-JOB` | Canonical/`noindex`; scheduled publish job, stats aggregation job | `../platform/` |

Dependents: discovery feeds, search, rankings and the reader show what the Studio writes; every studio write
invalidates the story/discovery caches (`packages/features/src/studio/hooks/use-story-editing.ts:50-58`,
`packages/features/src/studio/hooks/use-chapter-management.ts:32-40`).

## Domain-level open questions

| ID | Question | Why it matters |
| --- | --- | --- |
| Q-TEAM-01 | May editors publish and schedule chapters? The database and editor UI say yes; the invitation copy says no. | Owners consent to a role based on that copy — see [F-TEAM-01](collaboration/business-rules.md#br-team-010--studio-role-permission-matrix) |
| Q-TEAM-02 | Are "only the owner deletes the story" and "editors do not delete chapters" security rules or UI conventions? RLS does not enforce them. | Decides whether F-STM-01 / F-CHM-01 need an RLS change |
| Q-STM-01 | What may a suspended account still do to its own stories (edit, delete, rename chapter slugs)? Direct-table writes do not check account status; RPCs do. | Moderation effectiveness |
| Q-STM-02 | When does the Studio list need pagination (WBS 3.1 defers it)? | Long-tail authors |

Findings for this domain are in the [functional gap analysis](../../audits/functional-gap-analysis.md) / [UX gap analysis](../../audits/ux-ui-gap-analysis.md) (IDs `F-STM-*`, `U-STM-*`, `F-CHM-*`, `U-CHM-*`,
`F-TEAM-*`, `U-TEAM-*`, `U-STAT-*`); each screen spec lists the ones that concern it in section F.
