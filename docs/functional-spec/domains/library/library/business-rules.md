# OBJ-LIB — Library, story follow & save: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-LIB` |
| Name | Library (Reading / Saved / Following tabs, continue reading) and the story follow & save actions |
| Business purpose | Give each reader a private shelf of what they read, keep and follow, and turn follows into new-chapter notifications |
| User goals | Pick up where I left off in one tap; keep stories for later; be told about new chapters; tidy my shelf |
| Actors / roles | Signed-in reader (own data only) · Guest (story page buttons send to sign-in; `/library` redirects) · System (counter triggers, reconcile job) |
| Related entities | Tables `story_follows` (`created_at`), `story_saves` (`saved_at`), `user_story_progress` (written by OBJ-PROG), `story_stats.followers` / `.saves`. RPCs `set_story_follow`, `set_story_save`, `reconcile_library_counts` (service role). Triggers `story_follows_count`, `story_saves_count` |
| Dependencies | OBJ-STORY (story page hosts `StoryActions`; visibility via `can_read_story` — `BR-STORY-*`), OBJ-PROG (reading progress rows — `BR-PROG-*`), OBJ-NOTI (follow → [BR-NOTI-003](../../community/notifications/business-rules.md#br-noti-003--chapter_published)), OBJ-LIST (Lists tab), OBJ-JOB (daily `reconcile_counters`), OBJ-HOME (`StoryCard`, `STORY_COLUMNS`) |
| Screens | [SCR-LIB-01 Library](screens/library.md) `/library`; follow/save buttons on the story page (OBJ-STORY) |
| Source | `supabase/migrations/20261104000800_story_follows_saves.sql`; `packages/features/src/library/**`; `packages/features/src/story/{api/library.api.ts,hooks/use-story-library.ts,model/library.ts,components/story-actions.tsx}` |
| WBS | WP 4.3 (follow/save), 4.4 (library page), 4.8 (counters) |

Rule summary

| ID | Rule | Status |
| --- | --- | --- |
| BR-LIB-001 | Follow and save are independent | Verified (SQL test) |
| BR-LIB-002 | Follow / unfollow a story | Verified (SQL test) |
| BR-LIB-003 | Save / unsave a story | Verified (SQL test) |
| BR-LIB-004 | Follower and save counters | Verified (SQL test) |
| BR-LIB-005 | Story page follow/save buttons | Verified |
| BR-LIB-006 | Library access and privacy | Verified |
| BR-LIB-007 | Reading tab and continue reading | Verified |
| BR-LIB-008 | Saved and Following tabs | Verified |
| BR-LIB-009 | Tab size limit (no paging) | Verified |
| BR-LIB-010 | Stories that are no longer available | Verified |
| BR-LIB-011 | Removing a story from a tab | Verified |
| BR-LIB-012 | Tab loading and freshness | Verified |

## 2. Rules

### BR-LIB-001 — Follow and save are independent
| Field | Value |
| --- | --- |
| Description | Follow = "tell me about new chapters"; Save = "keep it on my private shelf". Neither implies the other. Only follows produce `chapter_published` notifications. |
| Preconditions | — |
| Conditions | Separate tables, separate RPCs, separate buttons, separate tabs. |
| Expected behavior | Saving does not follow; unfollowing keeps "Saved"; a saver gets no chapter notifications. |
| Exceptions | — |
| Related screens | SCR-LIB-01, story page (OBJ-STORY) |
| Evidence | `supabase/migrations/20261104000800_story_follows_saves.sql:1-5`, `supabase/tests/140_follows_saves.test.sql:43-52`, `:71-72`, `docs/WBS.md:191` |
| Status | Verified (SQL test) |

### BR-LIB-002 — Follow / unfollow a story
| Field | Value |
| --- | --- |
| Description | `set_story_follow(story, followed)` sets the caller's follow to exactly the given value and returns the story's follower count. |
| Preconditions | Signed in (`42501` otherwise). Follow: story readable by the caller (`story_follows_insert` RLS: `can_read_story`). |
| Conditions | SECURITY INVOKER; `ON CONFLICT DO NOTHING` / delete of zero rows → repeat is harmless; `NULL` flag → `22023`; private / unknown story → `42501`. |
| Expected behavior | Returns `story_stats.followers` (0 when no stats row). |
| Exceptions | Unfollow works on any story, readable or not (delete policy only checks `user_id`) — needed for the library placeholder. No `is_active_account` check (Q-LIB-01). |
| Related screens | SCR-LIB-01, story page |
| Evidence | `supabase/migrations/20261104000800_story_follows_saves.sql:53-72`, `supabase/migrations/20261103000100_auth_and_rls.sql:291-294`, `supabase/tests/140_follows_saves.test.sql:26-41`, `:76-81` |
| Status | Verified (SQL test) |

### BR-LIB-003 — Save / unsave a story
| Field | Value |
| --- | --- |
| Description | `set_story_save(story, saved)` — same contract as BR-LIB-002, returns `story_stats.saves`. |
| Preconditions | As BR-LIB-002. |
| Conditions | As BR-LIB-002. |
| Expected behavior | Saved row carries `saved_at` (orders the Saved tab). |
| Exceptions | As BR-LIB-002. The saves count is not displayed anywhere today. |
| Related screens | SCR-LIB-01, story page |
| Evidence | `supabase/migrations/20261104000800_story_follows_saves.sql:74-93`, `supabase/migrations/20261103000100_auth_and_rls.sql:295-298`, `supabase/tests/140_follows_saves.test.sql:48-54`, `:78-79` |
| Status | Verified (SQL test) |

### BR-LIB-004 — Follower and save counters
| Field | Value |
| --- | --- |
| Description | `story_stats.followers` / `.saves` move by ±1 in the same transaction as the row insert/delete, whatever path wrote it; never below 0. |
| Preconditions | — |
| Conditions | AFTER INSERT/DELETE row triggers; decrement only updates existing stats rows (cascade-safe). `reconcile_library_counts()` (service role) recomputes; scheduled daily inside `reconcile_counters()` at 03:41 (`BR-JOB-*`). |
| Expected behavior | Story page follower count = number of follow rows (including followers whose accounts are suspended — unlike author followers, Q-LIB-01). |
| Exceptions | Clients cannot write counters. |
| Related screens | Story page (OBJ-STORY) |
| Evidence | `supabase/migrations/20261104000800_story_follows_saves.sql:21-51`, `:95-125`, `supabase/migrations/20261104001200_counter_unification.sql:138`, `:152`, `supabase/tests/140_follows_saves.test.sql:43`, `:59`, `:83-118` |
| Status | Verified (SQL test) |

### BR-LIB-005 — Story page follow/save buttons
| Field | Value |
| --- | --- |
| Description | The story page shows "Follow"/"Following" and "Save to library"/"Saved" toggle buttons (plus "Add to list", OBJ-LIST). |
| Preconditions | Library state loaded (buttons hidden until then; query waits for the session). |
| Conditions | Guest press → `/login?next=<pathname>`. Signed in: optimistic toggle, follower count on the page moves at once (never below 0), server count applied on success, rollback on error. Button disabled while its request is pending; `aria-pressed` for signed-in users. |
| Expected behavior | Toasts: "Followed. You'll be notified when there are new chapters." / "Unfollowed." / "Saved to your library." / "Removed from your library."; errors: forbidden "You can't follow or save this story.", network, generic. |
| Exceptions | The button group's accessible name is "Sign in to follow or save stories" for everyone (U-LIB-03). |
| Related screens | Story page (OBJ-STORY) |
| Evidence | `packages/features/src/story/components/story-actions.tsx:15-60`, `packages/features/src/story/hooks/use-story-library.ts:17-97`, `packages/features/src/story/model/library.ts:22-36`, `packages/features/src/story/api/library.api.ts:6-26`, `packages/features/src/story/strings.en.ts:17-32` |
| Status | Verified |

### BR-LIB-006 — Library access and privacy
| Field | Value |
| --- | --- |
| Description | `/library` is for signed-in users only; each user sees only their own follows, saves and progress. |
| Preconditions | — |
| Conditions | Proxy redirect for `/library` prefix + `requireUser("/library")`; RLS `user_id = auth.uid()` on all three tables; queries also filter `user_id`; data never server-prefetched; `robots: noindex`. |
| Expected behavior | Guest → `/login?next=%2Flibrary`. |
| Exceptions | — |
| Related screens | SCR-LIB-01 |
| Evidence | `apps/web/src/app/(main)/library/page.tsx:8-14`, `apps/web/src/lib/auth/route-guard.ts:4-12`, `supabase/migrations/20261103000100_auth_and_rls.sql:291-298`, `:336-341`, `packages/features/src/library/keys.ts:1` |
| Status | Verified |

### BR-LIB-007 — Reading tab and continue reading
| Field | Value |
| --- | --- |
| Description | "Reading" lists stories with a `user_story_progress` row, most recently read first, each with "Continue with chapter N" linking straight to the current chapter. |
| Preconditions | Progress rows are written by the reader (OBJ-PROG, `BR-PROG-*`). |
| Conditions | Order `last_read_at DESC`; link `storyHref(story)/<chapter slug>`; N = chapter `sort_order`; line "Read <relative time>". |
| Expected behavior | One tap opens the chapter (the reader restores the paragraph, OBJ-PROG). |
| Exceptions | Current chapter not readable any more (unpublished) → no continue button (card link to the story remains). Story gone → placeholder (BR-LIB-010). |
| Related screens | SCR-LIB-01 |
| Evidence | `packages/features/src/library/api/library.api.ts:19-34`, `packages/features/src/library/model/library.ts:49-58`, `packages/features/src/library/screens/library-screen.tsx:208-212`, `packages/features/src/library/strings.en.ts:23`, `:25` |
| Status | Verified |

### BR-LIB-008 — Saved and Following tabs
| Field | Value |
| --- | --- |
| Description | "Saved" lists my saves by `saved_at DESC`; "Following" lists my follows by follow time (`created_at DESC`). Each card has "Open story". |
| Preconditions | — |
| Conditions | Lines "Saved <relative>" / "Followed <relative>". |
| Expected behavior | — |
| Exceptions | Following tab covers story follows only; author follows live on `/following` (OBJ-AUTHOR). |
| Related screens | SCR-LIB-01 |
| Evidence | `packages/features/src/library/api/library.api.ts:36-62`, `packages/features/src/library/screens/library-screen.tsx:213-217`, `packages/features/src/library/strings.en.ts:24-27` |
| Status | Verified |

### BR-LIB-009 — Tab size limit (no paging)
| Field | Value |
| --- | --- |
| Description | Each tab loads at most 50 entries; there is no "load more". |
| Preconditions | — |
| Conditions | `LIBRARY_PAGE_SIZE = 50`, `.limit(50)`. |
| Expected behavior | Older entries beyond 50 are not reachable in the UI. |
| Exceptions | WBS 4.4 records paging beyond 50 as not done (F-LIB-01). |
| Related screens | SCR-LIB-01 |
| Evidence | `packages/features/src/library/model/library.ts:8`, `packages/features/src/library/api/library.api.ts:30`, `:44`, `:58`, `docs/WBS.md:192` |
| Status | Verified |

### BR-LIB-010 — Stories that are no longer available
| Field | Value |
| --- | --- |
| Description | An entry whose story was deleted, made private, or is no longer readable stays in its tab as a placeholder so it can be removed. |
| Preconditions | — |
| Conditions | Story is a left embed: RLS returns `null` for unreadable stories; a soft-deleted story the reader can still read (own) is treated as gone (`deleted_at` check). |
| Expected behavior | Dashed card "Story no longer available" / "The story was deleted, made private, or you no longer have permission to view it." with only the remove button. No title is shown. |
| Exceptions | — |
| Related screens | SCR-LIB-01 |
| Evidence | `packages/features/src/library/model/library.ts:40-62`, `packages/features/src/library/screens/library-screen.tsx:139-154`, `packages/features/src/library/strings.en.ts:32-35`, `packages/features/src/library/library.test.tsx:71`, `:289` |
| Status | Verified |

### BR-LIB-011 — Removing a story from a tab
| Field | Value |
| --- | --- |
| Description | Each entry has a remove button: "Remove from reading" deletes only my `user_story_progress` row for that story; "Unsave" / "Unfollow" call the same RPCs as the story page with `false`. |
| Preconditions | Signed in. |
| Conditions | No confirmation, no undo; button disabled while pending. Per-chapter progress (`user_chapter_progress`) is not touched. |
| Expected behavior | Toasts "Removed from your reading list." / "Unsaved." / "Unfollowed."; all library and story caches refresh (story page buttons and counts follow). Error toast "No connection…" / "That didn't work. Please try again." |
| Exceptions | Reading the story again recreates the Reading entry (OBJ-PROG). |
| Related screens | SCR-LIB-01 |
| Evidence | `packages/features/src/library/hooks/use-library.ts:57-79`, `packages/features/src/library/api/library.api.ts:64-67`, `packages/features/src/library/screens/library-screen.tsx:166-179`, `packages/features/src/library/strings.en.ts:28-29`, `packages/features/src/library/library.test.tsx:320-345` |
| Status | Verified |

### BR-LIB-012 — Tab loading and freshness
| Field | Value |
| --- | --- |
| Description | A tab loads only when first opened and is re-read whenever opened (`staleTime: 0`); nothing loads before the session is known. Tabs are independent (one failing does not break others). |
| Preconditions | — |
| Conditions | Radix Tabs mount content on activation; selected tab is component state (not in the URL; default "Reading"). |
| Expected behavior | — |
| Exceptions | Reload, back navigation and links to `/library` always land on "Reading" (U-LIB-01). |
| Related screens | SCR-LIB-01 |
| Evidence | `packages/features/src/library/hooks/use-library.ts:13-25`, `packages/features/src/library/screens/library-screen.tsx:43-64`, `packages/features/src/library/library.test.tsx:215`, `:276`, `:307` |
| Status | Verified |
