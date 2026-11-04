# D-LIBRARY — Library: overview

## Purpose

A signed-in reader's private shelf and curated collections: what they are reading (continue in one tap), what they
saved, which stories they follow for new-chapter notifications, and named reading lists that can be kept private or
shared (unlisted link / public). This domain owns the story **follow** and **save** rules used by the story page.

## Actors

| Actor | Role in this domain |
| --- | --- |
| Guest | Opens unlisted/public reading lists by link; Follow / Save / Add to list and `/library` send them to sign in |
| Reader (signed in) | Follows, saves, removes; manages own reading lists (active account required to create a list) |
| Other reader | Reads someone's unlisted/public list, no controls |
| System | Follower/save counter triggers, daily reconcile job (OBJ-JOB), outbox notifications to followers (OBJ-NOTI) |

## Business objects

| ID | Name | Folder | Screens | Rules / workflows |
| --- | --- | --- | --- | --- |
| `OBJ-LIB` | Library, story follow & save | [`library/`](library/) | [SCR-LIB-01 Library](library/screens/library.md) `/library` (tabs Reading / Saved / Following / Lists); follow & save buttons on the story page (OBJ-STORY) | [business rules](library/business-rules.md) (BR-LIB-001…012) · [workflows](library/workflows.md) (WF-LIB-01…06) |
| `OBJ-LIST` | Reading lists | [`reading-lists/`](reading-lists/) | [SCR-LIST-01 Reading list](reading-lists/screens/reading-list.md) `/lists/[id]`; components: list form dialog (list page + Library Lists tab), My lists (Library Lists tab), Add-to-list sheet (story page) | [business rules](reading-lists/business-rules.md) (BR-LIST-001…014) · [workflows](reading-lists/workflows.md) (WF-LIST-01…09) |

## Behaviour when a story becomes private or is deleted

| Place | Behaviour | Rule |
| --- | --- | --- |
| Library tabs (Reading / Saved / Following) | Entry kept as placeholder "Story no longer available", removable | BR-LIB-010 |
| Follow notifications | No `chapter_published` while the story is private/deleted/draft | [BR-NOTI-003](../community/notifications/business-rules.md#br-noti-003--chapter_published) |
| Follow / save of it | New follow/save refused (`42501`); unfollow/unsave still allowed | BR-LIB-002, BR-LIB-003 |
| Reading list | Story silently hidden for every viewer incl. owner; data kept; reappears if readable again | BR-LIST-009 |
| Add to list | Refused (`42501`) | BR-LIST-006 |

## Cross-domain dependencies

| Depends on | What | Reference |
| --- | --- | --- |
| D-READING / OBJ-STORY | Story page hosts Follow, Save, Add to list; `can_read_story` | `packages/features/src/story/components/story-actions.tsx`, `BR-STORY-*` |
| D-READING / OBJ-PROG | `user_story_progress` feeds the Reading tab and "Continue with chapter N" | `BR-PROG-*` |
| D-COMMUNITY / OBJ-NOTI | Follows are the audience of `chapter_published` | [BR-NOTI-003](../community/notifications/business-rules.md#br-noti-003--chapter_published) |
| D-DISCOVERY / OBJ-HOME, OBJ-AUTHOR | `StoryCard`, story columns; author follows and `/following` are separate from story follows | `BR-AUTHOR-*` |
| D-PLATFORM / OBJ-SHELL, OBJ-JOB, OBJ-SEO | Bottom nav and user menu entries; counter reconcile; list pages `noindex` | `packages/features/src/shell/components/main-shell.tsx:15`, `BR-JOB-*` |
| D-ACCOUNT / OBJ-AUTH | Guards and sign-in redirects | `apps/web/src/lib/auth/route-guard.ts` |

## Domain-level open questions

- Q-LIB-01 — Should suspended accounts be able to follow/save, and count as story followers (author follower counts exclude them)?
- Q-LIB-02 — Should "Remove from reading" clear per-chapter progress too?
- Q-LIST-01 — Placeholders for unavailable stories in lists (consistency with the Library)?
- Q-LIST-02 — Must `unlisted` lists be non-enumerable (link-only), as the UI copy "It isn't listed anywhere" implies?
- Q-LIST-03 — Should public lists be discoverable (author page, list index, SEO)? WBS 4.5 lists this as not done.
