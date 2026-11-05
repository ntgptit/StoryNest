# OBJ-REC — Recommendations — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-REC |
| Name | Recommendations with a "why" sentence |
| Business purpose | Keep readers reading: "You might also like" on a story page and "Recommended for you" on home |
| User goals | Find a next story similar to one they like or from authors they follow |
| Actors / roles | Guest (similar only), Member (similar + personal) |
| Related entities | RPCs `similar_stories` (SECURITY DEFINER), `recommend_for_me` (SECURITY INVOKER); sources `story_tags`, `categories`, `chapter_read_events`, `user_follows`, `story_saves`, `story_follows`, `user_story_progress` |
| Dependencies | BR-TAX-*, BR-PROG-*, BR-LIB-*, BR-AUTHOR-*, BR-STORY-*, BR-MAT-*, BR-MOD-* |
| Own screen | **None.** Rendered by `SimilarStories` at the end of the story page (`packages/features/src/story/screens/story-screen.tsx:210`, inside `AdultGate`) and by `ForYouStories` above the home feed (`apps/web/src/app/(main)/discover-home.tsx:15`) |
| Code | `supabase/migrations/20261104001700_recommendations.sql`, `packages/features/src/recommendations/**` |

## 2. Rules

### BR-REC-001 — Similar stories: reasons and points
| Field | Value |
| --- | --- |
| Description | Candidates for a story S: `shared_tags` (3 points per shared tag; detail = tag names, comma-separated, alphabetical), `co_readers` (2 points per distinct reader of S who also read the candidate; no detail), `same_category` (1 point; detail = category name) |
| Preconditions | Anyone (anon + authenticated) |
| Conditions | Candidate ≠ S |
| Expected behavior | Total score = sum of all reasons; displayed reason = the one worth most (ties: tags, readers, category); order total DESC, `updated_at` DESC, id |
| Exceptions | — |
| Related screens | Story page (SCR-STORY-01) |
| Evidence | `supabase/migrations/20261104001700_recommendations.sql:3-9,40-74`, `supabase/tests/230_recommendations.test.sql` |
| Status | Verified (SQL test) |

### BR-REC-002 — Co-reading never reveals one person's reading
| Field | Value |
| --- | --- |
| Description | `co_readers` counts only when ≥ 2 distinct readers are shared; the function returns ids, reasons and scores, never reader identities |
| Preconditions | — |
| Conditions | `chapter_read_events` has no client access; hence SECURITY DEFINER |
| Expected behavior | A single co-reader produces no `co_readers` reason |
| Exceptions | — |
| Related screens | Story page |
| Evidence | `20261104001700_recommendations.sql:6-7,17-19,49-58` |
| Status | Verified (SQL test) |

### BR-REC-003 — Candidate and source eligibility
| Field | Value |
| --- | --- |
| Description | Candidates must be public, not draft, not deleted, owner active, mature only on opt-in. The **source** story must satisfy the same rule, otherwise no recommendations at all |
| Preconditions | — |
| Conditions | `includeMature = useShowMature()` |
| Expected behavior | An unlisted, private, draft, deleted, suspended-owner or (not opted-in) mature story page shows no "You might also like" |
| Exceptions | — |
| Related screens | Story page |
| Evidence | `20261104001700_recommendations.sql:15-16,33-39`, `recommendations/hooks/use-recommendations.ts:15-24` |
| Status | Verified (SQL test) |

### BR-REC-004 — Personal recommendations: only for signed-in readers, only unmet stories
| Field | Value |
| --- | --- |
| Description | `recommend_for_me` requires a user (`42501`). It excludes stories the reader saved, follows, has progress on, or owns |
| Preconditions | Authenticated; client query disabled for guests |
| Conditions | Same eligibility as BR-REC-003 |
| Expected behavior | Reasons: `followed_author` (5 points; detail = author display name), `library_similar` (3 points per shared tag + 1 for same category with a saved/followed story; detail = that story's title, alphabetically first) |
| Exceptions | Stories where the reader is only a collaborator (co-author/editor) are not excluded (Q-REC-01) |
| Related screens | SCR-HOME-01 |
| Evidence | `20261104001700_recommendations.sql:10-14,77-136`, `recommendations/hooks/use-recommendations.ts:26-39`, `recommendations/recommendations.test.tsx:250` |
| Status | Verified (SQL test); collaborator exclusion Inferred |

### BR-REC-005 — Where and when the blocks render
| Field | Value |
| --- | --- |
| Description | "You might also like" at the end of the story page for everyone; "Recommended for you" above the home feed only for a member on the unfiltered home |
| Preconditions | — |
| Conditions | Nothing renders while loading, on error, or when the list is empty |
| Expected behavior | Titled section (`h2`) with a 2/3/4-column grid of home cards, each followed by its reason sentence |
| Exceptions | — |
| Related screens | SCR-HOME-01, SCR-STORY-01 |
| Evidence | `recommendations/components/recommendation-list.tsx:13-92`, `apps/web/src/app/(main)/discover-home.tsx:9-13`, `story/screens/story-screen.tsx:186-188`, `recommendations/recommendations.test.tsx:219,235` |
| Status | Verified |

### BR-REC-006 — Sizes and limits
| Field | Value |
| --- | --- |
| Description | Client asks 6 similar and 8 personal stories; RPC `limit` 1–50 else `22023`; no paging |
| Preconditions | — |
| Conditions | Cached 5 min; keys include story id or user id and the mature flag |
| Expected behavior | Stories that vanished between the RPC and the card query are dropped |
| Exceptions | — |
| Related screens | SCR-HOME-01, SCR-STORY-01 |
| Evidence | `recommendations/model/recommendation.ts:14-15,32-40`, `recommendations/keys.ts:3-7`, `recommendations/hooks/use-recommendations.ts:12`, `20261104001700_recommendations.sql:29-31,87-89`, `recommendations/recommendations.test.tsx:118` |
| Status | Verified |

### BR-REC-007 — The "why" sentence
| Field | Value |
| --- | --- |
| Description | `shared_tags` → "Shared tags: {tags}"; `same_category` → "Same category: {category}"; `co_readers` → "Readers of this story also read"; `followed_author` → "From an author you follow: {author}"; `library_similar` → "Because you saved or followed “{title}”" |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Unknown reason code or missing detail → card shown **without** a sentence (never a wrong one) |
| Exceptions | — |
| Related screens | SCR-HOME-01, SCR-STORY-01 |
| Evidence | `recommendations/model/recommendation.ts:42-63`, `recommendations/strings.en.ts:7-13`, `recommendations/recommendations.test.tsx:67,81` |
| Status | Verified |

### BR-REC-008 — Not yet supported
| Field | Value |
| --- | --- |
| Description | No "not interested"/dismiss, no opt-out of personal recommendations in settings, no history-based reasons beyond the library, computed on request (no schedule) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | — |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `docs/WBS.md:210` ("Chưa làm") → F-REC-01 |
| Status | Documented |
