# OBJ-AUTHOR — Author page, author follow, following feed — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-AUTHOR |
| Name | Author page, follow author, "From authors you follow" feed |
| Business purpose | Give each author a public page and let readers follow authors and see their updates in one feed |
| User goals | Learn about an author and their stories; follow/unfollow; read recent updates of followed authors |
| Actors / roles | Guest (view page), Member (follow, feed), Author (own page without Follow button), Moderator (same as member; report flow owned by OBJ-MOD) |
| Related entities | `app_users`, `user_follows` (public graph), `stories`; RPCs `author_follower_count`, `author_profile`, `set_user_follow`, `list_followed_stories` (all SECURITY INVOKER) |
| Dependencies | BR-PRF-* (profile fields, avatar), BR-AUTH-* (login redirect, `requireUser`), BR-MOD-* (suspension, report button), BR-MAT-*, BR-STORY-*, BR-HOME-001/002 (story list), BR-SEO-* |
| Code | `supabase/migrations/20261104001600_author_follows.sql`, `packages/features/src/author/**`, `apps/web/src/app/(main)/{author/[username],following}/*` |

## 2. Rules

### BR-AUTHOR-001 — Which accounts have an author page
| Field | Value |
| --- | --- |
| Description | `author_profile(username)` returns a row only for an account with `account_status = active` and `deleted_at IS NULL`; username matched case-insensitively and trimmed |
| Preconditions | Anyone |
| Conditions | NULL/blank username → `22023` |
| Expected behavior | No row → "Author not found / The author doesn't exist or the account is no longer visible." Applies to suspended authors viewing their own page too |
| Exceptions | Page responds HTTP 200 with a generic title even when not found (BR-AUTHOR-012) |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `supabase/migrations/20261104001600_author_follows.sql:29-51`, `author/api/author.api.ts:20-25`, `author/screens/author-screen.tsx:46-48`, `author/strings.en.ts:16-19`, `supabase/tests/220_author_follows.test.sql:54-62,77` |
| Status | Verified (SQL test) |

### BR-AUTHOR-002 — Profile header content
| Field | Value |
| --- | --- |
| Description | Avatar (or first letter), display name (`h1`), "@username · N followers · M stories", bio (line breaks kept) or "This author hasn't written a bio yet." |
| Preconditions | Profile found |
| Conditions | M = owned stories that are public, not draft, not deleted and **not mature** — regardless of the viewer's mature choice and even for the author themself |
| Expected behavior | Numbers formatted per locale |
| Exceptions | When the reader shows mature content the list below may contain more stories than M → U-AUTHOR-02 |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `author/screens/author-screen.tsx:71-91`, `20261104001600_author_follows.sql:41-45`, `supabase/tests/220_author_follows.test.sql:56,73`, `docs/WBS.md:211` |
| Status | Verified |

### BR-AUTHOR-003 — Follower count counts active followers only
| Field | Value |
| --- | --- |
| Description | `author_follower_count` = follows whose follower account is active and not deleted |
| Preconditions | — |
| Conditions | Computed on read (no denormalised counter) |
| Expected behavior | A suspended follower stops counting without deleting the edge |
| Exceptions | — |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `20261104001600_author_follows.sql:21-27`, `supabase/tests/220_author_follows.test.sql:57,76` |
| Status | Verified (SQL test) |

### BR-AUTHOR-004 — Author's story list
| Field | Value |
| --- | --- |
| Description | Home feed query filtered by `owner_id = author` (BR-HOME-001/002): public, not draft, not deleted, mature on opt-in, newest update first, 12 per keyset page |
| Preconditions | Profile found (list renders only then) |
| Conditions | Only **owned** stories; co-authored stories are not listed (Q-AUTHOR-01) |
| Expected behavior | Empty → "No public stories yet / When the author publishes a story, it will appear here." |
| Exceptions | — |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `author/screens/author-screen.tsx:61,93-131`, `discovery/api/discovery.api.ts:84`, `author/author.test.tsx:302,310` |
| Status | Verified |

### BR-AUTHOR-005 — Follow eligibility
| Field | Value |
| --- | --- |
| Description | `set_user_follow(user, followed)`: caller must be signed in (`42501`); flag and user required (`22023`); cannot follow yourself (`22023`); target must be active and not deleted (`PT404`); follower must be active (RLS `user_follows_insert`) |
| Preconditions | Authenticated |
| Conditions | Idempotent: following twice / unfollowing a non-followed author are not errors |
| Expected behavior | Returns the author's follower count after the change |
| Exceptions | Unfollow is always allowed (no active-account check on delete) |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `20261104001600_author_follows.sql:53-85`, `20261103000100_auth_and_rls.sql:189-193`, `supabase/tests/220_author_follows.test.sql:95-107` |
| Status | Verified (SQL test) |

### BR-AUTHOR-006 — At most 1000 followed authors
| Field | Value |
| --- | --- |
| Description | A new follow beyond 1000 followed authors is refused with `PT409` |
| Preconditions | — |
| Conditions | Re-following an already followed author at the cap is allowed |
| Expected behavior | Toast "You're following the maximum of 1000 authors. Unfollow some before following more." |
| Exceptions | — |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `20261104001600_author_follows.sql:57,75-78`, `author/model/author.ts:69-79`, `author/strings.en.ts:27-31`, `docs/WBS.md:209` |
| Status | Verified (SQL test) |

### BR-AUTHOR-007 — Follow button behaviour
| Field | Value |
| --- | --- |
| Description | Hidden on your own page. Guest press → `/login?next=<current path>`. Member press toggles; button disabled while pending; **not optimistic** — shows what the DB confirmed |
| Preconditions | Profile loaded |
| Conditions | Variant "default" + label "Following" when followed, "outline" + "Follow" otherwise; `aria-pressed` for members |
| Expected behavior | Success → toast "You're now following this author." / "Unfollowed."; profile cache updated with returned count; followed-feed and all discovery queries invalidated |
| Exceptions | Errors → toast: limit (PT409), "This author is no longer visible." (PT404), else "That didn't work. Please try again." |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `author/components/follow-author-button.tsx:14-44`, `author/hooks/use-author.ts:30-47`, `author/strings.en.ts:8-11,27-31`, `author/author.test.tsx:334-399` |
| Status | Verified |

### BR-AUTHOR-008 — Following feed eligibility and order
| Field | Value |
| --- | --- |
| Description | `list_followed_stories(mature, cursor_at, cursor_id, limit)`: stories owned by followed authors that are public, not draft, not deleted, owner active, mature on opt-in; newest update first, keyset `(updated_at, id)` |
| Preconditions | Signed in (`42501`; anon has no EXECUTE privilege) |
| Conditions | `limit` 1–50; cursor needs both parts (`22023`); client 12 per page, one extra row |
| Expected behavior | A suspended author's stories vanish though the follow edge remains |
| Exceptions | — |
| Related screens | SCR-AUTHOR-02 |
| Evidence | `20261104001600_author_follows.sql:87-116,118-124`, `author/api/author.api.ts:38-66`, `author/model/author.ts:4,63-67`, `supabase/tests/220_author_follows.test.sql:84` |
| Status | Verified (SQL test) |

### BR-AUTHOR-009 — `/following` is a protected route
| Field | Value |
| --- | --- |
| Description | Proxy redirects guests to `/login?next=%2Ffollowing`; the page re-checks with `requireUser("/following")`; `robots: noindex` and disallowed in robots.txt |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Feed query enabled only once the viewer id is known; `staleTime: 0` |
| Exceptions | — |
| Related screens | SCR-AUTHOR-02 |
| Evidence | `apps/web/src/lib/auth/route-guard.ts:4-12,37-45`, `apps/web/src/app/(main)/following/page.tsx:8-14`, `apps/web/src/lib/auth/require-user.ts:29-33`, `apps/web/src/app/robots.ts:16`, `author/hooks/use-author.ts:49-70` |
| Status | Verified |

### BR-AUTHOR-010 — Follow graph is public data
| Field | Value |
| --- | --- |
| Description | `user_follows` is readable by anyone (`USING (true)`); users write only their own edges from an active account |
| Preconditions | — |
| Conditions | — |
| Expected behavior | No UI lists followers or followed authors (WBS 5.4 "Chưa làm") → F-AUTHOR-01 |
| Exceptions | — |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `20261103000100_auth_and_rls.sql:188-193`, `docs/WBS.md:209` |
| Status | Verified |

### BR-AUTHOR-011 — Viewer-specific caching
| Field | Value |
| --- | --- |
| Description | Profile key = (lower-cased username, viewer id or "guest"); the query waits until the session is known, so a guest answer (`is_following=false`) is never shown to a member |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Skeleton while the session resolves |
| Exceptions | — |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `author/keys.ts:2-9`, `author/hooks/use-author.ts:18-28`, `author/author.test.tsx:139,266` |
| Status | Verified |

### BR-AUTHOR-012 — Page metadata
| Field | Value |
| --- | --- |
| Description | `/author/[username]` has a static title "Tác giả · StoryNest" (server, Vietnamese only), is indexable, is not in the sitemap, and renders client-side (no server prefetch); an unknown author still answers HTTP 200 |
| Preconditions | — |
| Conditions | — |
| Expected behavior | — |
| Exceptions | → F-AUTHOR-02 (owned jointly with OBJ-SEO) |
| Related screens | SCR-AUTHOR-01 |
| Evidence | `apps/web/src/app/(main)/author/[username]/page.tsx:7-13`, `apps/web/src/lib/strings.ts:21`, `apps/web/src/lib/seo/sitemap.ts:43` |
| Status | Verified |
