# OBJ-HOME — Home / discover feed — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-HOME |
| Name | Home / discover feed ("Recently updated") |
| Business purpose | Give every visitor an always-fresh entry point into public stories, filterable by category and tag, with shortcuts to rankings and (members) the followed-authors feed |
| User goals | Browse what is new; narrow by genre or tag; share a filtered view by URL; continue to personal suggestions |
| Actors / roles | Guest, Member, Moderator (same list) |
| Related entities | `stories`, `app_users` (owner embed), `categories`, `story_stats`, `story_tags`/`tags`; RPC `popular_tags` (OBJ-TAX), `recommend_for_me` (OBJ-REC) |
| Dependencies | BR-STORY-* (visibility), BR-MAT-* (mature opt-in), BR-TAX-* (category tree, tags), BR-REC-* (For-you block), BR-MOD-* (suspension) |
| Code | `packages/features/src/discovery/**`, `apps/web/src/app/(main)/{page,discover-home,home-hero}.tsx`, widgets `packages/ui/src/widgets/{story-card,story-cover,infinite-list}.tsx` |

## 2. Rules

### BR-HOME-001 — Feed eligibility
| Field | Value |
| --- | --- |
| Description | The feed lists only stories with `visibility = public`, `deleted_at IS NULL`, `status <> draft`; mature stories only when the reader opted in |
| Preconditions | Any visitor |
| Conditions | `includeMature` comes from `useShowMature()` (never from the caller) |
| Expected behavior | Unlisted stories (readable by link per BR-STORY-*) are never advertised. Mature stories carry an "18+" badge when shown |
| Exceptions | **Owner account status is not checked**: stories of suspended/deactivated owners are listed; the owner embed is hidden by `app_users_read` RLS so the card shows "Anonymous author" (`unknownAuthor`). Every other discovery list excludes them (see domain overview matrix) → F-HOME-01 |
| Related screens | SCR-HOME-01, SCR-AUTHOR-01 (same function with `authorId`) |
| Evidence | `packages/features/src/discovery/api/discovery.api.ts:51-56,63-71`, `discovery/hooks/use-latest-stories.ts:22-24`, `discovery/model/story-card.ts:51-54`, `supabase/migrations/20261103000100_auth_and_rls.sql:182-184,198-202`, `discovery/discovery.test.tsx:82`, `docs/WBS.md:206` ("Chưa làm … listLatestStories chưa lọc theo trạng thái chủ truyện") |
| Status | Verified |

### BR-HOME-002 — Ordering and keyset pagination
| Field | Value |
| --- | --- |
| Description | Newest update first, keyset on `(updated_at, id)` |
| Preconditions | — |
| Conditions | Page size 12 (`DEFAULT_PAGE_SIZE`); one extra row is requested to know whether more exist |
| Expected behavior | Order `updated_at DESC, id DESC`; next cursor = base64 `{u: updatedAt, i: id}` of the last item, or null; next page strictly after the cursor (ties neither skipped nor repeated). Pages load on scroll (IntersectionObserver, 240 px margin) and via a visible "Load more" button; end shows "You've seen all the stories." |
| Exceptions | Malformed cursor → `AppError("invalid")` before any query |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/api/discovery.api.ts:40-49,109-128`, `discovery/keys.ts:47`, `packages/ui/src/widgets/infinite-list.tsx:30-62`, `discovery/discovery.test.tsx:98,110,120`, `discovery/strings.en.ts:10-11` |
| Status | Verified |

### BR-HOME-003 — Category filter
| Field | Value |
| --- | --- |
| Description | `?category=<slug>` restricts the feed to that category and its **direct** children |
| Preconditions | Category tree loaded (the feed query waits for it only when a category filter is active) |
| Conditions | Slug matched against the full category list |
| Expected behavior | Ids = root + direct children (BR-TAX-004). Unknown slug → empty list (never "everything") with the generic empty state |
| Exceptions | Category tree fails to load while a category filter is active → error state |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/api/discovery.api.ts:74-79`, `discovery/model/categories.ts:10-14`, `discovery/hooks/use-latest-stories.ts:25,34`, `discovery/screens/discover-screen.tsx:45`, `discovery/discovery.test.tsx:146,205` |
| Status | Verified |

### BR-HOME-004 — Tag filter
| Field | Value |
| --- | --- |
| Description | `?tag=<slug>` restricts the feed to stories carrying that tag; combinable with category |
| Preconditions | — |
| Conditions | Inner join under its own alias so the card's tag embed stays complete |
| Expected behavior | Filtered list; the "Filtering by tag #name" line with "Clear tag filter" link keeps the category; unknown tag → "No stories with this tag yet" empty state |
| Exceptions | Active tag not among popular tags → named by its slug |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/api/discovery.api.ts:21-24,63,81`, `discovery/screens/tag-filters.tsx:26-41`, `discovery/screens/discover-screen.tsx:98-99`, `discovery/discovery-tags.test.tsx:116-133,213-236` |
| Status | Verified |

### BR-HOME-005 — Language filter (API only)
| Field | Value |
| --- | --- |
| Description | The feed API can filter by `language_code`; the home route neither reads a `language` param nor shows a control |
| Preconditions | — |
| Conditions | `LatestStoriesFilter.language` |
| Expected behavior | Today the home feed always lists all languages |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/api/discovery.api.ts:74`, `discovery/keys.ts:5-6`, `apps/web/src/app/(main)/page.tsx:18-22`, `discovery/discovery.test.tsx:133`, `docs/WBS.md:154` (WP 2.2 "lọc theo category/ngôn ngữ") → F-HOME-02 |
| Status | Verified |

### BR-HOME-006 — Filters live in the URL
| Field | Value |
| --- | --- |
| Description | Category and tag are query-string links, so each filtered view is shareable and SSR-able |
| Preconditions | — |
| Conditions | Only a single non-empty string is accepted; arrays/empty values are ignored |
| Expected behavior | `homeHref({categorySlug, tagSlug})` → `/`, `/?category=…`, `/?tag=…`, `/?category=…&tag=…`; chips are `<a>` links with `aria-current="page"` when active |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `apps/web/src/app/(main)/page.tsx:20-22`, `discovery/model/home-href.ts:1-8`, `discovery/screens/category-chips.tsx:19-36`, `discovery/discovery-tags.test.tsx:76,197` |
| Status | Verified |

### BR-HOME-007 — Server prefetch with client continuation
| Field | Value |
| --- | --- |
| Description | First page and category tree are fetched on the server and hydrated |
| Preconditions | Supabase configured |
| Conditions | Server keys = client keys (`includeMature: false` on the server) |
| Expected behavior | Crawlers and first paint see cards. Prefetch failure is logged (`home: prefetch failed`) and the client fetches and shows its own states. Unfiltered home loads tree and feed in parallel |
| Exceptions | A reader who opted into mature content gets a client refetch (different key) |
| Related screens | SCR-HOME-01 |
| Evidence | `apps/web/src/app/(main)/page.tsx:24-33`, `discovery/queries.ts:37-56`, `discovery/discovery.test.tsx:197,205,355` |
| Status | Verified |

### BR-HOME-008 — Personal blocks and shortcuts
| Field | Value |
| --- | --- |
| Description | What differs between guest and member on home |
| Preconditions | — |
| Conditions | `auth.status === "authenticated"`; filter active or not |
| Expected behavior | "Recommended for you" (BR-REC-005) above the feed only on the **unfiltered** home and only for a member. Shortcut "From authors you follow" → `/following` only for members; "See rankings" → `/ranking` for everyone |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `apps/web/src/app/(main)/discover-home.tsx:9-13`, `discovery/screens/discover-screen.tsx:53-62`, `discovery/discovery-tags.test.tsx:171` |
| Status | Verified |

### BR-HOME-009 — Story card content
| Field | Value |
| --- | --- |
| Description | Shared card for every discovery list |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Whole card is one link to `/story/{id}/{slug}` (WBS Q2). Shows cover (lazy) or the title's first letter, "18+" badge, title (2 lines), author display name (not a link), category badge, status label (Draft/Ongoing/Completed/On hiatus), synopsis excerpt (120 chars), reads and votes (with sr-only labels), "Updated <relative>" |
| Exceptions | Missing owner → "Anonymous author"; missing stats → zeros; unknown status → raw value |
| Related screens | SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02, story page (similar) |
| Evidence | `discovery/model/story-card.ts:38-85`, `packages/ui/src/widgets/story-card.tsx:56-165`, `packages/ui/src/widgets/story-cover.tsx:5-41` |
| Status | Verified |

### BR-HOME-010 — Hero
| Field | Value |
| --- | --- |
| Description | Headline "Where stories are written and read." + intro, rendered client-side to follow the language |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Identical for guests and members (no sign-up or "start writing" call to action) |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `apps/web/src/app/(main)/home-hero.tsx:5-12`, `apps/web/src/lib/strings.ts:41-49` → U-HOME-02 |
| Status | Verified |

### BR-HOME-011 — Cache lifetimes
| Field | Value |
| --- | --- |
| Description | Category tree stale after 10 min, popular tags after 5 min; feed uses defaults |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Following/unfollowing an author invalidates all discovery queries (`discoveryKeys.all`) |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/queries.ts:11-19`, `discovery/hooks/use-latest-stories.ts:66-76`, `author/hooks/use-author.ts:44` |
| Status | Verified |

### BR-HOME-012 — Failure isolation
| Field | Value |
| --- | --- |
| Description | Secondary data never blocks the feed |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Popular tags failing → tag bar hidden, feed shown. For-you failing/loading → block hidden. Feed failing with no items → full error state with "Try again" (refetches tree and feed); failing on a later page → inline error under the list with "Try again" (fetches next page) |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/screens/tag-filters.tsx:27`, `discovery/screens/discover-screen.tsx:79-88,122-129`, `recommendations/components/recommendation-list.tsx:25`, `discovery/discovery-tags.test.tsx:250`, `discovery/discovery.test.tsx:340` |
| Status | Verified |

### BR-HOME-013 — Event popup with "Don't show today" (Lucian 311, batch 4 · platform4)
| Field | Value |
| --- | --- |
| Description | The unfiltered home page opens a popup with the active `announcements` of kind `popup` for the interface language: sliding cards (2.8 s each, drag or arrow keys, "1 / 3" and dots) with the end date ("Until 30 Nov") and an optional "View details" link |
| Preconditions | At least one active popup (same window and language rule as BR-SHELL-015); not on a category/tag-filtered view |
| Conditions | Opens once per visit of the page, unless "Don't show today" was chosen on this device today for these same announcements (`localStorage["storynest.announcements.popupSnoozed"] = {day, ids}`, day = the reader's local date) |
| Expected behavior | "Don't show today" and "Close" (also Escape or a press outside) shrink the card into a gift button in the bottom corner (above the phone bottom navigation) that opens it again; after "Don't show today" a "See you tomorrow" note shows for a moment. The next day, or when a new popup announcement is published the same day, it opens again |
| Exceptions | Per device only: nothing is stored in the account. Under reduced motion nothing slides by itself and the card closes without shrinking |
| Related screens | SCR-HOME-01 (C12) |
| Evidence | `packages/features/src/announcements/components/home-event-popup.tsx`, `packages/features/src/announcements/model/announcement.ts` (`isPopupSnoozed`, `snoozePopupToday`), `packages/ui/src/widgets/event-popup.tsx`, `apps/web/src/app/(main)/discover-home.tsx`, `announcements/announcements.test.tsx`. Rollback (top of the migration): `DROP FUNCTION public.active_announcements(text, text); DROP TABLE public.announcements;` |
| Status | Verified (unit, SQL test); not run against a real Supabase project |

### BR-HOME-014 — Length filter
| Field | Value |
| --- | --- |
| Description | `story_stats.word_count` (sum of the published versions' `word_count` of the published, not deleted chapters) and `story_stats.published_chapters` are kept by triggers (chapter publish / re-publish / unpublish / archive / delete; a story_stats row created later starts with the computed length). The feed filters by a word range through `story_stats!inner(word_count)` (gte min, lt max). The range picker (Lucian #024) is a histogram of `story_length_histogram(include_mature, language, category_ids, tag_slug)` over fixed buckets 0, 2k, 10k, 30k, 60k, 100k, 200k, 400k+ (`STORY_LENGTH_EDGES`), with two thumbs and the rolling count of stories in range |
| Preconditions | BR-HOME-001 |
| Conditions | The range lives in the URL as `words=min-max` (`max` empty = no upper bound; only bucket edges accepted, anything else is no filter) and combines with category and tag; every chip and link keeps it. A story without a stats row is left out while the filter is on. Clients cannot write the two columns (no write grant on story_stats) |
| Expected behavior | From `sm` up: a "Filter by length" button unfolds the histogram with Apply and "Remove length filter". On a phone: a "Length" section in the filter sheet; the footer count includes it. An empty result offers "Remove length filter" with its count (BR-HOME loosen) |
| Exceptions | Words are whitespace-separated (a Vietnamese syllable is one word), as counted by publish_chapter |
| Related screens | SCR-HOME-01 (C13) |
| Evidence | `supabase/migrations/20261106030600_story_length.sql`; `supabase/tests/480_story_length.test.sql`; `packages/ui/src/widgets/range-histogram.tsx`; `packages/features/src/discovery/model/story-length.ts`, `screens/length-filter.tsx`, `api/discovery.api.ts` (`LENGTH_FILTER_COLUMN`, `getLengthHistogram`). Rollback: `DROP FUNCTION public.story_length_histogram(boolean, text, bigint[], text); DROP TRIGGER chapters_story_length ON public.chapters; DROP TRIGGER story_stats_init_length ON public.story_stats; DROP FUNCTION public.sync_story_length(), public.story_stats_init_length(), private.refresh_story_length(uuid), private.story_length(uuid); DROP INDEX public.idx_story_stats_word_count; ALTER TABLE public.story_stats DROP COLUMN word_count, DROP COLUMN published_chapters;` |
| Status | Verified on local PostgreSQL; not run against Supabase |
