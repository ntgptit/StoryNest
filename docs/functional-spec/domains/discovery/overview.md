# D-DISCOVERY — Discovery (domain overview)

## Purpose
Help readers find stories and authors: the latest-updated feed with category/tag filters, full-text-like search
(diacritic-insensitive), rankings by period, "why recommended" suggestions, author pages with follow, and the feed of
followed authors. Discovery never writes story content; it reads the public catalogue through RLS and `SECURITY
INVOKER/DEFINER` RPCs that re-apply the discovery eligibility rules.

Documented scope: `docs/WBS.md:154` (WP 2.2), `docs/WBS.md:206-211` (WP 5.1–5.6).

## Actors

| Actor | Description | Discovery capabilities |
| --- | --- | --- |
| Guest | Not signed in | Home feed, filters, search, rankings, author pages, similar stories. No "Recommended for you", no follow (redirected to `/login?next=`), no `/following` (redirected by proxy + `requireUser`) |
| Member (reader) | Signed-in, `account_status = active` | Everything a guest can, plus follow authors, `/following`, "Recommended for you" on home |
| Author | Member who owns/co-owns stories | Sets tags on own stories (owner / co-author) through `set_story_tags` (UI owned by OBJ-STM) |
| Moderator | `app_metadata.role = moderator` | Same lists as a member; RLS lets moderators see more rows, but every discovery RPC still applies the public rules (`supabase/tests/190_search.test.sql:129-132`) |
| Suspended / deactivated member | `account_status <> active` | Cannot follow (RLS `user_follows_insert` requires active account), cannot set tags (42501); own author page shows "Author not found" |

## Business objects

| Object ID | Name | Folder | Screens | Rules | Workflows |
| --- | --- | --- | --- | --- | --- |
| OBJ-HOME | Home / discover feed | [home](home/business-rules.md) | [SCR-HOME-01 Home / Discover `/`](home/screens/home-discover.md) | BR-HOME-001…012 | WF-HOME-01…04 |
| OBJ-TAX | Categories & tags | [taxonomy](taxonomy/business-rules.md) | none (browsing is a filter of SCR-HOME-01; no dedicated route exists) | BR-TAX-001…012 | WF-TAX-01…03 |
| OBJ-SRCH | Search (incl. header SearchBox) | [search](search/business-rules.md) | [SCR-SRCH-01 Search results `/search`](search/screens/search-results.md) | BR-SRCH-001…011 | WF-SRCH-01…03 |
| OBJ-RANK | Rankings | [ranking](ranking/business-rules.md) | [SCR-RANK-01 Rankings `/ranking`](ranking/screens/rankings.md) | BR-RANK-001…008 | WF-RANK-01…02 |
| OBJ-REC | Recommendations | [recommendations](recommendations/business-rules.md) | none (embedded in SCR-HOME-01 and the story page SCR-STORY-*) | BR-REC-001…008 | WF-REC-01…02 |
| OBJ-AUTHOR | Author page, follow, following feed | [author](author/business-rules.md) | [SCR-AUTHOR-01 Author page `/author/[username]`](author/screens/author-page.md), [SCR-AUTHOR-02 Following feed `/following`](author/screens/following-feed.md) | BR-AUTHOR-001…012 | WF-AUTHOR-01…03 |

## Discovery eligibility — cross-list consistency check (key deliverable)

The common rule ("public, not draft, not deleted, owner account active, mature only when the reader opted in") is
stated in every discovery migration header. Story visibility/unlisted is owned by BR-STORY-*, the mature opt-in by
BR-MAT-*, suspension by BR-MOD-* / BR-AUTH-*. This matrix records where each list actually enforces each part.

| List (screen) | Data source | `visibility = public` (unlisted excluded) | not draft | not deleted | owner account active | mature only on opt-in | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home feed (SCR-HOME-01) | `listLatestStories` (PostgREST) | Yes | Yes | Yes | **No** — suspended/deactivated owners' stories are listed with "Anonymous author" | Yes (`useShowMature`) | `packages/features/src/discovery/api/discovery.api.ts:64-71`, `discovery/model/story-card.ts:51-54`, `supabase/migrations/20261103000100_auth_and_rls.sql:198-202` → [F-HOME-01](#findings-index) |
| Author page stories (SCR-AUTHOR-01) | `listLatestStories({authorId})` | Yes | Yes | Yes | Indirect: list renders only after `author_profile` returned an active author | Yes | `author/screens/author-screen.tsx:46-49,61`, `20261104001600_author_follows.sql:50` |
| Popular tags (SCR-HOME-01) | `popular_tags` RPC | Yes | Yes | Yes | Yes | Never counted (always excluded) | `20261104001400_tags.sql:110-120` |
| Search stories + header suggestions (SCR-SRCH-01) | `search_stories` RPC | Yes | Yes | Yes | Yes | Yes | `20261104001300_search.sql:78-81` |
| Search authors (SCR-SRCH-01) | `search_authors` RPC | count only public | Yes | Yes | author must be active | count includes mature on opt-in | `20261104001300_search.sql:104-108` |
| Search tags (SCR-SRCH-01) | `search_tags` RPC | Yes | Yes | Yes | Yes | Never counted | `20261104001300_search.sql:132-138` |
| Rankings (SCR-RANK-01) | `top_stories` RPC (live `stories` join) | Yes | Yes | Yes | Yes | Yes | `20261104001500_rankings.sql:102-107` |
| Similar stories (story page) | `similar_stories` RPC | Yes (source and candidates) | Yes | Yes | Yes | Yes | `20261104001700_recommendations.sql:33-39` |
| Recommended for you (SCR-HOME-01) | `recommend_for_me` RPC | Yes | Yes | Yes | Yes | Yes | `20261104001700_recommendations.sql:98-104` |
| Following feed (SCR-AUTHOR-02) | `list_followed_stories` RPC | Yes | Yes | Yes | Yes | Yes | `20261104001600_author_follows.sql:106-115` |
| Author header "N stories" (SCR-AUTHOR-01) | `author_profile` RPC | Yes | Yes | Yes | n/a | Never counted (mismatch with list on opt-in → U-AUTHOR-02) | `20261104001600_author_follows.sql:43-45` |

Result: **one inconsistent list — the home feed** (and it is the busiest one). WBS already records it as not done
(`docs/WBS.md:206`, "truyện của tác giả bị khóa vẫn hiện ở danh sách trang chủ"). All RPC-backed lists are
consistent and covered by SQL tests (`supabase/tests/190_search.test.sql`, `200_tags`, `210_rankings`,
`220_author_follows`, `230_recommendations`). Every two-step list (RPC ids → `STORY_COLUMNS` card query) drops a story
that disappeared between the two requests (`discovery/model/order-by-ids.ts:1-8`, `ranking/model/ranking.ts:73-90`,
`recommendations/model/recommendation.ts:32-40`).

## Navigation / discoverability

| Destination | Header (desktop) | Header (mobile) | Bottom nav | User menu | In-page links | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `/` Home | Brand link | Brand link | "Home" | — | — | `shell/components/site-header.tsx:17`, `main-shell.tsx:14` |
| `/search` | SearchBox (combobox) | Search icon → `/search` | — | — | Tag/author results | `search/components/search-box.tsx:67-71` |
| `/ranking` | — | — | — | — | Home section link "See rankings" only | `discovery/screens/discover-screen.tsx:59-61` → U-HOME-01 |
| `/following` | — | — | — | — | Home section link "From authors you follow" (signed-in only) | `discover-screen.tsx:54-58` → U-HOME-01 |
| `/author/[username]` | — | — | — | — | Story page author name, search Authors tab, moderation report card | `story/screens/story-screen.tsx:87`, `search/screens/search-screen.tsx:225`, `moderation/model/report.ts:122` |

## Cross-domain dependencies

| Depends on | What | Reference |
| --- | --- | --- |
| D-READING / OBJ-STORY | Story visibility (public/unlisted/private), status, soft delete; story page hosts SimilarStories and links tags/author | BR-STORY-*; `story/screens/story-screen.tsx:87,153,210` |
| D-READING / OBJ-PROG | `chapter_read_events` (rankings, co-readers), `user_story_progress` (excluded from For-you) | BR-PROG-* |
| D-COMMUNITY / OBJ-VOTE | `chapter_votes` in rankings (score = reads + 5 × votes) | BR-VOTE-* |
| D-LIBRARY / OBJ-LIB | `story_saves`, `story_follows` feed "Recommended for you" | BR-LIB-* |
| D-TRUST / OBJ-MAT | `useShowMature()` opt-in flag in every list key and RPC call | BR-MAT-*; `docs/WBS.md:211` |
| D-TRUST / OBJ-MOD | `account_status` suspension, story removal (`deleted_at`) | BR-MOD-*; `20261104002000_moderation.sql:384-420` |
| D-STUDIO / OBJ-STM | Tag editor UI (`studio/components/tag-editor.tsx`), category picker | BR-STM-*; tag rules owned here (BR-TAX-006…010) |
| D-PLATFORM / OBJ-SHELL, OBJ-SEO, OBJ-I18N | Header SearchBox, nav, page titles (server titles are Vietnamese only, `apps/web/src/lib/strings.ts:1-2`), sitemap (`/`, `/ranking` only) | BR-SHELL-*, BR-SEO-*; `apps/web/src/lib/seo/sitemap.ts:43` |
| D-ACCOUNT / OBJ-AUTH | `requireUser`, proxy guard for `/following`; login `next` round-trip for Follow | BR-AUTH-*; `apps/web/src/lib/auth/route-guard.ts:10` |

## Domain-level open questions
- Q-HOME-01 — Should stories of suspended/deactivated authors also disappear from the home feed (as in every other list), or is the current behaviour intended? See [findings](#findings-index).
- Q-TAX-01 — How are categories provisioned in production (no migration inserts them)?
- Q-RANK-01 — Should "Today" follow the reader's time zone instead of UTC?
- Q-TAX-02, Q-SRCH-01, Q-REC-01, Q-AUTHOR-01 — object-level questions, listed in the screen/rule files and the [decision register](../../proposals/decision-register.md).

## Findings index
Full finding details are in the [functional gap analysis](../../audits/functional-gap-analysis.md) / [UX gap analysis](../../audits/ux-ui-gap-analysis.md): F-HOME-01, F-HOME-02, U-HOME-01, U-HOME-02, F-TAX-01, F-TAX-02, U-TAX-01, F-SRCH-01, U-SRCH-01,
U-SRCH-02, U-RANK-01, U-RANK-02, F-REC-01, F-AUTHOR-01, F-AUTHOR-02, U-AUTHOR-01, U-AUTHOR-02.
