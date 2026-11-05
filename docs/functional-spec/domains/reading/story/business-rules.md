# OBJ-STORY — Public story page: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-STORY` |
| Name | Public story page (story detail, visibility & availability rules) |
| Business purpose | Present one story to readers (cover, facts, synopsis, tags, stats, published chapters) and decide **who may see a story at all**. This object owns the authoritative visibility / status / deletion rules that every other domain references. |
| User goals | Decide whether to read a story; start or continue reading; follow / save / list / report it; share a canonical link. |
| Actors / roles | Guest (anon), Member (authenticated, active), Story team (owner, `co_author`, `editor` via `story_role`), Moderator (`app_metadata.role = 'moderator'`), Search-engine / social crawler. |
| Related entities | Tables `stories`, `story_tags`, `tags`, `categories`, `app_users`, `story_stats`, `chapters`, `chapter_versions`. Helpers `can_read_story()`, `can_read_chapter()`, `story_role()`, `is_moderator()`. Policy `stories_read`. |
| Dependencies | `OBJ-READ` (chapter URL), `OBJ-PROG` (continue reading), `OBJ-LIB` (follow/save, `BR-LIB-*`), `OBJ-LIST` (add to list, `BR-LIST-*`), `OBJ-MOD` (report, `BR-MOD-004…006`), `OBJ-MAT` (adult gate, `BR-MAT-009`), `OBJ-REC` (similar stories), `OBJ-AUTHOR` (author link), `OBJ-TAX` (tag links), `OBJ-SEO` (metadata, JSON-LD, OG image), `OBJ-STM` (where visibility/status/slug are edited). |

### Rule index

| ID | Name | Status |
| --- | --- | --- |
| [BR-STORY-001](#br-story-001--story-identity-and-canonical-url) | Story identity and canonical URL | Verified |
| [BR-STORY-002](#br-story-002--visibility-levels) | Visibility levels (public / unlisted / private) | Verified |
| [BR-STORY-003](#br-story-003--story-status-and-draft-hiding) | Story status and draft hiding | Verified |
| [BR-STORY-004](#br-story-004--soft-deleted-and-removed-stories) | Soft-deleted and moderator-removed stories | Verified |
| [BR-STORY-005](#br-story-005--team-and-moderator-access) | Team and moderator access | Verified |
| [BR-STORY-006](#br-story-006--hidden-equals-missing) | Hidden equals missing (no probing) | Verified |
| [BR-STORY-007](#br-story-007--discovery-exclusion) | Only public stories are discoverable | Verified |
| [BR-STORY-008](#br-story-008--search-engine-indexability) | Search-engine indexability | Verified |
| [BR-STORY-009](#br-story-009--mature-stories) | Mature (18+) stories | Verified |
| [BR-STORY-010](#br-story-010--published-chapter-list) | Published chapter list | Verified |
| [BR-STORY-011](#br-story-011--chapter-url-and-numbering) | Chapter URL and numbering | Verified |
| [BR-STORY-012](#br-story-012--primary-reading-cta) | Primary reading CTA | Verified |
| [BR-STORY-013](#br-story-013--story-statistics) | Story statistics shown | Verified |
| [BR-STORY-014](#br-story-014--author-attribution) | Author attribution | Verified |
| [BR-STORY-015](#br-story-015--engagement-actions-need-an-account) | Engagement actions need an account | Verified |
| [BR-STORY-016](#br-story-016--author-account-status-does-not-gate-readability) | Author account status does not gate readability | Verified (open question) |

---

### BR-STORY-001 — Story identity and canonical URL
| Field | Value |
| --- | --- |
| Description | A story's public address is `/story/{id}/{slug}`. The id alone identifies the story. The slug is only there for readability. |
| Preconditions | Request to `/story/{id}/{slug}`. |
| Conditions | `id` is not a UUID → treated as not found, with no DB query. The slug in the URL ≠ the current `stories.slug` → redirect. |
| Expected behavior | Wrong or stale slug → **308 permanent redirect** to `/story/{id}/{currentSlug}` (the chapter route keeps its `chapterSlug`). `<link rel=canonical>` = `/story/{id}/{slug}`. All in-app links are built by `storyHref()` / `chapterHref()`. |
| Exceptions | `/story/{id}` without a slug has no route (404). See finding F-STORY-03. Story slug is unique only per owner (`UNIQUE(owner_id, slug)`), which is why the id is required (WBS D10/Q2). |
| Related screens | SCR-STORY-01, SCR-READ-01 |
| Evidence | `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:40-49`, `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:47`, `packages/features/src/story/api/story.api.ts:26-27`, `packages/features/src/discovery/model/story-card.ts:61-64`, `supabase/migrations/20261103000000_init_schema.sql:73`, `apps/web/src/app/(main)/story/[id]/[slug]/page.test.tsx:84-89`, WBS §4 Q2 |
| Status | Verified (unit test; WBS 2.3 notes runtime 308 check on dev) |

### BR-STORY-002 — Visibility levels
| Field | Value |
| --- | --- |
| Description | `stories.visibility` ∈ `private` (default) / `unlisted` / `public` is the story's access-control state. |
| Preconditions | Story exists, not deleted, status ≠ `draft` (BR-STORY-003). |
| Conditions | — |
| Expected behavior | **public**: anyone (anon included) can read the story and its published chapters, and it appears in discovery (BR-STORY-007). **unlisted**: anyone *with the link* can read it, but it never appears in discovery and is `noindex`. **private**: only the story team and moderators (BR-STORY-005). Everyone else gets a 404 (BR-STORY-006). Unknown values from the DB are mapped to `private` on the client. |
| Exceptions | — |
| Related screens | SCR-STORY-01, SCR-READ-01; referenced by D-DISCOVERY, D-LIBRARY, D-COMMUNITY |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:66-67`, `supabase/migrations/20261103000100_auth_and_rls.sql:93-101,198-202`, `packages/features/src/story/model/story-detail.ts:16-19`, `supabase/tests/10_rls.test.sql:91,126` |
| Status | Verified (SQL test) |

### BR-STORY-003 — Story status and draft hiding
| Field | Value |
| --- | --- |
| Description | `stories.status` ∈ `draft` (default) / `ongoing` / `completed` / `hiatus` is the *creative* state. It is separate from visibility. |
| Preconditions | — |
| Conditions | `status = 'draft'`. |
| Expected behavior | A `draft` story is hidden from everyone outside the team, **even if** its visibility is `public` or `unlisted`. The other statuses don't change access. The status is shown as an outline badge with the labels "Draft" / "Ongoing" / "Completed" / "On hiatus" (vi: `discoveryText.status.*`). |
| Exceptions | Team and moderators still see a draft story (BR-STORY-005). |
| Related screens | SCR-STORY-01 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:64-65`, `supabase/migrations/20261103000100_auth_and_rls.sql:97-99,199`, `packages/features/src/story/screens/story-screen.tsx:121`, `packages/features/src/discovery/strings.en.ts:17-22` |
| Status | Verified |

### BR-STORY-004 — Soft-deleted and removed stories
| Field | Value |
| --- | --- |
| Description | Stories are never hard-deleted by clients. Instead, `deleted_at` is set (by the owner/co-author, or by a moderator through `remove_story`). |
| Preconditions | `stories.deleted_at IS NOT NULL`. |
| Conditions | — |
| Expected behavior | Hidden from the public by RLS. The story page query additionally filters `deleted_at IS NULL`, so a deleted story is a **404 for everyone on the public page, team and moderators included**. Its chapters are unreadable to the public (`can_read_chapter` checks `s.deleted_at`). A story removed by a moderator cannot be restored by its owner (trigger raises 42501). |
| Exceptions | The team can still see the row through RLS (for the studio and restore, see OBJ-STM). |
| Related screens | SCR-STORY-01, SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:97-99,108-109,205-206,212`, `packages/features/src/story/api/story.api.ts:33`, `supabase/migrations/20261104002000_moderation.sql:15-18,104-116,381-395`, `packages/features/src/story/story.test.tsx:115` |
| Status | Verified |

### BR-STORY-005 — Team and moderator access
| Field | Value |
| --- | --- |
| Description | The owner, `co_author` and `editor` of a story (`story_role() IS NOT NULL`) and moderators can read the story and **all** of its chapters, whatever their visibility or status. |
| Preconditions | Authenticated. |
| Conditions | `story_role(story_id) IS NOT NULL` or `is_moderator()`. |
| Expected behavior | The public story page renders a private or draft story for these users (no JSON-LD, `noindex`). The chapter list still shows only published chapters (BR-STORY-010). Drafts are previewed in the studio (OBJ-HIST). |
| Exceptions | Soft-deleted stories are still a 404 on the public page (BR-STORY-004). |
| Related screens | SCR-STORY-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:83-112,198-202`, `supabase/tests/10_rls.test.sql:125-126,141,158` |
| Status | Verified (SQL test) |

### BR-STORY-006 — Hidden equals missing
| Field | Value |
| --- | --- |
| Description | A story the caller may not see looks exactly like one that does not exist, so the page cannot be used to probe for hidden stories. |
| Preconditions | — |
| Conditions | Non-UUID id, no row, RLS-hidden row (private, draft, deleted). |
| Expected behavior | The server answers a **real HTTP 404** (`notFound()`), and the metadata is the fallback title "Truyện" with `robots: {index:false}`. A client-side render shows "Story not found" / "This story doesn't exist, was taken down or is private." (vi `storyText.notFound`). |
| Exceptions | A load *error* is not a 404: the server logs it and the client shows the error state with retry (BR in SCR-STORY-01, state "Request error"). |
| Related screens | SCR-STORY-01 |
| Evidence | `packages/features/src/story/api/story.api.ts:22-38`, `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:20,48`, `apps/web/src/lib/story/load-story.ts:10,24-34`, `packages/features/src/story/strings.en.ts:43-46`, `packages/features/src/story/story.test.tsx:107,130,310` |
| Status | Verified |

### BR-STORY-007 — Discovery exclusion
| Field | Value |
| --- | --- |
| Description | Only stories that are `visibility = 'public'`, not deleted and not `draft` are *discoverable*. Unlisted stories are readable by link only. |
| Preconditions | — |
| Conditions | Any listing surface: home feed, category/tag filters, search, rankings, recommendations, author pages and the following feed. |
| Expected behavior | Unlisted, private, draft and deleted stories never appear in listings. Each listing implements this filter itself (rule defined here; implemented in `OBJ-HOME`, `OBJ-SRCH`, `OBJ-RANK`, `OBJ-REC`, `OBJ-AUTHOR`). |
| Exceptions | A reader's own library, reading lists and progress may still show an unlisted story they opened (owned by `BR-LIB-*` / `BR-LIST-*`). |
| Related screens | SCR-STORY-01 (source); discovery screens (consumers) |
| Evidence | `packages/features/src/discovery/api/discovery.api.ts:75`, `supabase/migrations/20261104001300_search.sql:78,106,134`, `supabase/migrations/20261104001500_rankings.sql:104`, `supabase/migrations/20261104001700_recommendations.sql:37,102`, `supabase/migrations/20261104001600_author_follows.sql:111`, `supabase/migrations/20261103000000_init_schema.sql:344-345` |
| Status | Verified |

### BR-STORY-008 — Search-engine indexability
| Field | Value |
| --- | --- |
| Description | A story (and each of its chapters) may be indexed only if it is **public and not mature**. |
| Preconditions | Story was loaded. |
| Conditions | `isIndexable = visibility === 'public' && !isMature`. |
| Expected behavior | Indexable → no `robots` override, plus `Book` JSON-LD (story) / `Chapter` JSON-LD (chapter) with absolute URLs. Not indexable (unlisted, private, team view, mature) → `robots: {index:false, follow:false}` and **no** JSON-LD. Missing story → `robots: {index:false}`. Metadata: title = story title, description = synopsis excerpt (160), OG type `book` with authors and cover. |
| Exceptions | — |
| Related screens | SCR-STORY-01, SCR-READ-01 (SEO details: `OBJ-SEO`) |
| Evidence | `packages/features/src/story/model/story-detail.ts:34-40`, `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:18-39,55-63`, `apps/web/src/app/(main)/story/[id]/[slug]/page.test.tsx:64-102`, `packages/features/src/story/story.test.tsx:165-179` |
| Status | Verified |

### BR-STORY-009 — Mature stories
| Field | Value |
| --- | --- |
| Description | `stories.is_mature = true` marks 18+ content. |
| Preconditions | — |
| Conditions | `isMature`. |
| Expected behavior | The story page and every chapter are wrapped in the adult gate. Content is shown only after the reader confirms they are 18+ (rules owned by `BR-MAT-009`, see [trust-safety](../../trust-safety/overview.md)). A red "18+" badge is shown. Never indexed (BR-STORY-008). Excluded from rankings unless asked for (`BR-RANK-*`). |
| Exceptions | — |
| Related screens | SCR-STORY-01, SCR-READ-01 |
| Evidence | `packages/features/src/story/screens/story-screen.tsx:91,122`, `packages/features/src/adult-content/components/adult-gate.tsx:13-34`, `packages/features/src/story/story.test.tsx:215-242` |
| Status | Verified |

### BR-STORY-010 — Published chapter list
| Field | Value |
| --- | --- |
| Description | The story page lists only chapters with `status = 'published'` and `deleted_at IS NULL`, ordered by `sort_order` ascending, with the title and word count from the **published** version. |
| Preconditions | Story readable. |
| Conditions | — |
| Expected behavior | Draft, scheduled and archived chapters are never listed, not even for the team. Each row shows "Chapter N", the title and "N words". With none, the page shows "This story has no published chapters yet." Count: "N chapter(s)". |
| Exceptions | Chapter without a published snapshot → empty title, 0 words (defensive; the CHECK makes it impossible). No pagination (F-STORY-02). |
| Related screens | SCR-STORY-01, SCR-READ-01 (TOC, prev/next use the same list) |
| Evidence | `packages/features/src/story/api/story.api.ts:40-55`, `packages/features/src/story/model/story-detail.ts:37-65`, `supabase/migrations/20261103000000_init_schema.sql:113`, `packages/features/src/story/story.test.tsx:140,180`, `packages/features/src/story/strings.en.ts:3-8` |
| Status | Verified |

### BR-STORY-011 — Chapter URL and numbering
| Field | Value |
| --- | --- |
| Description | Chapter URL = `/story/{id}/{storySlug}/{chapterSlug}`. The chapter slug is unique within the story. The number shown ("Chapter N") is the chapter's `sort_order`. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Links are built with `chapterHref()`. `sort_order` is renumbered 1..n over all **non-deleted** chapters (drafts and archived included) by `reorder_chapters`, so published numbering can have gaps (U-READ-03). |
| Exceptions | Renaming a chapter slug is allowed in the studio. Old chapter links then 404, and the studio warns about this (F-STORY-03). |
| Related screens | SCR-STORY-01, SCR-READ-01 |
| Evidence | `packages/features/src/story/model/story-detail.ts:49,56-70`, `supabase/migrations/20261103000000_init_schema.sql:110-111`, `supabase/migrations/20261104000400_chapter_management.sql:13-16`, `packages/features/src/studio/strings.en.ts:79-80` |
| Status | Verified |

### BR-STORY-012 — Primary reading CTA
| Field | Value |
| --- | --- |
| Description | The header shows one primary button that opens a chapter. |
| Preconditions | At least one published chapter. |
| Conditions | Signed-in reader with a resolvable continue target → "Continue reading · Chapter N" (vi "Đọc tiếp · Chương N"). Otherwise → "Start reading" (vi "Bắt đầu đọc") to the first published chapter. |
| Expected behavior | The continue target is resolved by [BR-PROG-008](../reading-progress/business-rules.md#br-prog-008--continue-reading-target). There is no button when there are no published chapters. |
| Exceptions | While the chapter list is loading, `chapters.data` is empty, so no button is shown yet. |
| Related screens | SCR-STORY-01 |
| Evidence | `packages/features/src/story/screens/story-screen.tsx:68-75,127-131`, `packages/features/src/progress/strings.en.ts:2`, `packages/features/src/story/story.test.tsx:273,300,338-378` |
| Status | Verified |

### BR-STORY-013 — Story statistics
| Field | Value |
| --- | --- |
| Description | The page shows four counters from `story_stats`: Reads, Votes, Comments, Followers. |
| Preconditions | — |
| Conditions | Missing stats row → all zeros. |
| Expected behavior | Locale-formatted (`StatPill`). Semantics are owned elsewhere: reads = aggregated read events ([BR-PROG-014](../reading-progress/business-rules.md#br-prog-014--read-aggregation)), votes ([BR-VOTE-005](../../community/vote/business-rules.md#br-vote-005--counter-maintenance)), comments (`BR-CMT-*`), followers (`BR-LIB-*`). Followers move optimistically on Follow (`BR-LIB-*`). Stats rows are readable wherever the story is (`story_stats_read`). |
| Exceptions | Reads lag by ≤ 1 min (aggregation job) plus the 30 s client cache. Votes cast in the reader are not pushed into the story-page cache (they refresh when the cache goes stale). |
| Related screens | SCR-STORY-01 |
| Evidence | `packages/features/src/story/screens/story-screen.tsx:125-135`, `packages/features/src/discovery/model/story-card.ts:57`, `packages/features/src/discovery/api/discovery.api.ts:17`, `supabase/migrations/20261103000100_auth_and_rls.sql:364-365`, `packages/features/src/_shared/query.ts:24` |
| Status | Verified |

### BR-STORY-014 — Author attribution
| Field | Value |
| --- | --- |
| Description | "Author" + the owner's display name links to `/author/{username}`. |
| Preconditions | — |
| Conditions | The owner's `app_users` row is hidden (suspended / deactivated; `app_users_read` shows only active accounts). |
| Expected behavior | Visible owner → link. Hidden owner → plain text "Anonymous author" (vi `discoveryText.unknownAuthor`), no link. Collaborators are not shown. |
| Exceptions | JSON-LD still emits `/author/` for a hidden owner (F-STORY-04). |
| Related screens | SCR-STORY-01 |
| Evidence | `packages/features/src/story/screens/story-screen.tsx:105-117`, `packages/features/src/discovery/model/story-card.ts:51-54`, `supabase/migrations/20261103000100_auth_and_rls.sql:182-184` |
| Status | Verified |

### BR-STORY-015 — Engagement actions need an account
| Field | Value |
| --- | --- |
| Description | Follow, Save to library, Add to list and Report are member-only actions placed on the story page. |
| Preconditions | — |
| Conditions | Guest presses Follow/Save → `navigation.push('/login?next=<current path>')`. Guest presses Add to list / Report → sign-in flow owned by those components. |
| Expected behavior | Follow / Save semantics, optimistic UI and errors: `BR-LIB-001…005` ([library](../../library/library/business-rules.md)). Add to list: `BR-LIST-*`. Report: `BR-MOD-004…006` ([trust-safety](../../trust-safety/overview.md)). The server allows follow/save only when `can_read_story` is true. |
| Exceptions | The Report button is shown to the author on their own story, and the server refuses it (F-STORY-01). |
| Related screens | SCR-STORY-01 |
| Evidence | `packages/features/src/story/components/story-actions.tsx:15-60`, `packages/features/src/story/screens/story-screen.tsx:133-136`, `supabase/migrations/20261103000100_auth_and_rls.sql:290-297`, `packages/features/src/story/library.test.tsx:147` |
| Status | Verified |

### BR-STORY-016 — Author account status does not gate readability
| Field | Value |
| --- | --- |
| Description | Story readability depends only on the story row (visibility, status, deleted_at), not on the owner's account status. |
| Preconditions | Owner `account_status` = `suspended` / `deactivated`, or the owner was soft-deleted. |
| Conditions | — |
| Expected behavior | The story stays readable under BR-STORY-002/003. The author is shown as "Anonymous author" (BR-STORY-014). |
| Exceptions | — |
| Related screens | SCR-STORY-01, SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:93-101` (no owner check), `:182-184` |
| Status | Verified (absence of a check); intent is open: Q-STORY-01 |

### BR-STORY-017 — Star ratings (batch 4 · community4, Lucian 016)
| Field | Value |
| --- | --- |
| Description | Signed-in readers rate a story 1–5, one rating per reader per story (`story_ratings`); rating again replaces it, NULL (0 in the widget) takes it back. `story_stats.rating_count`, `rating_sum` and `rating_avg` (stored generated, 2 decimals, NULL without ratings) move by trigger in the same transaction and are readable wherever `story_stats` is. |
| Preconditions | Active account; story readable; not the owner or a collaborator. |
| Conditions | **Decision: rating needs having opened N = 1 chapter** of the story (a `user_chapter_progress` row for a published chapter), kept in `abuse_limits.rating_min_chapters_read` (an administrator may raise it or set 0). Reason: stops ratings from people who only saw the cover, while a reader who stopped after one chapter can still say why. Taking a rating back is always allowed. |
| Expected behavior | Story page shows "★ 4.3 · 12 ratings" (or "No ratings yet") and, for a signed-in reader, the five-star slider "Your rating" (disabled with "Read at least 1 chapter to rate this story." until then); guests get "Sign in to rate". `get_story_rating` returns the summary plus chapters_read / chapters_needed (guests too). |
| Exceptions | 42501 not signed in / not active / own story (HINT own_story) / not read enough (HINT read_first); PT404 story not readable; 22023 stars outside 1–5. Ratings of a later-suspended reader stay counted; account deletion cascades and the trigger corrects the counters. |
| Related screens | SCR-STORY-01 |
| Evidence | `supabase/migrations/20261106010300_story_ratings.sql`, `supabase/tests/380_story_ratings.test.sql`, `packages/ui/src/widgets/star-rating.tsx`, `packages/features/src/story/components/story-rating.tsx`, `packages/features/src/story/rating.test.tsx` |
| Status | Verified (SQL + unit/component tests; not run on a real Supabase project) |

### BR-STORY-018 — Next chapter countdown, schedule line and parts (batch 4, Lucian 265 / 109 / 102)
| Field | Value |
| --- | --- |
| Description | `next_chapter_at(story_id)` (SECURITY DEFINER, anon + authenticated) returns only the earliest future `scheduled_for` of the story's non-deleted scheduled chapters |
| Preconditions | Caller can read the story (`can_read_story`); otherwise, for an unknown story or nothing scheduled: NULL (no probing) |
| Conditions | Fetched in the browser only (not prefetched), refreshed every 5 min; a non-timestamp answer is treated as none |
| Expected behavior | Above the chapter list: "Next chapter in 3 h 12 min 05 s" ticking every second, bar shrinking from the latest chapter to the next; at zero the headline swaps to "A new chapter is on its way". The header shows the weekly schedule (BR-STM-028); the chapter list groups runs of a part into folders (BR-CHM-016) |
| Exceptions | No id, title or draft content leaves the function |
| Related screens | SCR-STORY-01 |
| Evidence | `supabase/migrations/20261106040200_next_chapter_countdown.sql`; `supabase/tests/510_next_chapter_countdown.test.sql`; `packages/features/src/story/api/story.api.ts` (`getNextChapterAt`); `packages/ui/src/widgets/next-chapter-countdown.tsx`; `packages/features/src/story/story.test.tsx` |
| Status | Verified (SQL test, unit test) |
