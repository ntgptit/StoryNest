# OBJ-TAX — Categories & tags — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-TAX |
| Name | Categories (genre tree) and tags (controlled folksonomy, WBS D4) |
| Business purpose | Classify stories so readers can browse by genre or theme, while keeping the tag vocabulary clean (no near-duplicates, no spam) |
| User goals | Reader: browse by category/tag. Author: label a story with up to 10 tags, reusing existing ones |
| Actors / roles | Guest/Member (browse), Owner / co-author with active account (set tags), service role / seed (categories) |
| Related entities | Tables `categories`, `tags` (`created_by` hidden), `story_tags`; RPCs `tag_slug`, `set_story_tags`, `popular_tags`, `search_tags` (OBJ-SRCH) |
| Dependencies | OBJ-STM owns the tag editor UI (`packages/features/src/studio/components/tag-editor.tsx`, limits mirrored in `studio/model/tags.ts:7-12`) and the category picker; BR-HOME-003/004 own browsing |
| Dedicated route | **None.** Browsing by category/tag is the `?category=` / `?tag=` filter of SCR-HOME-01; no SCR-TAX-01 exists |
| Code | `supabase/migrations/20261104001400_tags.sql`, `supabase/seed/dev_seed.sql:22-42`, `packages/features/src/discovery/model/{categories,popular-tags}.ts` |

## 2. Rules

### BR-TAX-001 — Category model
| Field | Value |
| --- | --- |
| Description | Categories form a tree (`parent_id`, `ON DELETE RESTRICT`), with unique `slug` (≤80), `name` (≤120) and `sort_order`; a story has at most one category (`stories.category_id`, nullable, `ON DELETE SET NULL`) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Tree depth is not limited by the schema |
| Exceptions | — |
| Related screens | SCR-HOME-01 |
| Evidence | `supabase/migrations/20261103000000_init_schema.sql:37-44,58` |
| Status | Verified |

### BR-TAX-002 — Categories are read-only for clients
| Field | Value |
| --- | --- |
| Description | Anyone may read categories; nobody but service role / seed writes them |
| Preconditions | — |
| Conditions | `GRANT SELECT` only; policy `categories_read USING (true)` |
| Expected behavior | Dev seed provides 6 roots (Lãng mạn, Giả tưởng, Phiêu lưu, Trinh thám - Kinh dị, Đời thường, Khoa học viễn tưởng) and 2 children (Lãng mạn học đường, Giả tưởng hiện đại); seed refuses to run outside dev |
| Exceptions | **No migration provisions categories for other environments; no admin UI** → F-TAX-01 / Q-TAX-01 |
| Related screens | SCR-HOME-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:174,178`, `README.md:53`, `supabase/seed/dev_seed.sql:22-37`, `docs/WBS.md:153` |
| Status | Verified (prod provisioning: Unknown) |

### BR-TAX-003 — Category chips show root categories in order
| Field | Value |
| --- | --- |
| Description | Home chips list only categories with `parent_id IS NULL`, by `sort_order`, then name |
| Preconditions | Tree loaded (cached 10 min) |
| Conditions | — |
| Expected behavior | "All" chip first; sub-categories are never chips |
| Exceptions | An active sub-category (typed URL) has no highlighted chip → U-TAX-01 |
| Related screens | SCR-HOME-01 |
| Evidence | `packages/features/src/discovery/model/categories.ts:16-21`, `discovery/screens/category-chips.tsx:34-35` |
| Status | Verified |

### BR-TAX-004 — Browsing a category includes its direct children
| Field | Value |
| --- | --- |
| Description | Filter ids = the category + categories whose `parent_id` is it |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Grandchildren are not included (one level only) |
| Exceptions | Unknown slug → `[]` → empty feed |
| Related screens | SCR-HOME-01 |
| Evidence | `discovery/model/categories.ts:9-14`, `discovery/discovery.test.tsx:223` |
| Status | Verified |

### BR-TAX-005 — Tag identity is the normalised slug
| Field | Value |
| --- | --- |
| Description | `tag_slug(name)` = lower case, diacritics removed (`unaccent`, "đ"→"d", NFD-safe), every run of non `[a-z0-9]` becomes one `-`, trimmed of `-`. "Lãng mạn" and "lang  man!" are the same tag `lang-man` |
| Preconditions | — |
| Conditions | `tags.slug` is `citext UNIQUE` |
| Expected behavior | Two spellings never create two tags |
| Exceptions | Only punctuation → empty slug (refused by BR-TAX-007) |
| Related screens | Studio story form (OBJ-STM), SCR-HOME-01 |
| Evidence | `supabase/migrations/20261104001400_tags.sql:26-30`, `20261103000000_init_schema.sql:47-52`, `supabase/tests/200_tags.test.sql:44-50` |
| Status | Verified (SQL test) |

### BR-TAX-006 — Who may set a story's tags
| Field | Value |
| --- | --- |
| Description | Only the story's owner or a co-author, signed in with an active account |
| Preconditions | Authenticated |
| Conditions | `story_role(story) IN ('owner','co_author')` and `is_active_account()` |
| Expected behavior | Editor, stranger, guest, suspended owner, unknown story → `42501` |
| Exceptions | — |
| Related screens | Studio story form (OBJ-STM) |
| Evidence | `20261104001400_tags.sql:48-51`, `supabase/tests/200_tags.test.sql:56-64,93` |
| Status | Verified (SQL test) |

### BR-TAX-007 — Tag name validation
| Field | Value |
| --- | --- |
| Description | Each name is trimmed and inner whitespace collapsed; it must be ≤ 40 characters and its slug 2–40 characters |
| Preconditions | — |
| Conditions | NULL list → 22023; NULL/blank/1-char/punctuation-only names → 22023 |
| Expected behavior | Whole call refused with `22023` ("a tag must be 2 to 40 characters and contain letters or digits"); nothing changes |
| Exceptions | Studio editor pre-validates and skips invalid names with a message (OBJ-STM) |
| Related screens | Studio story form |
| Evidence | `20261104001400_tags.sql:52-63`, `supabase/tests/200_tags.test.sql:65,101-109`, `packages/features/src/studio/model/tags.ts:40-43` |
| Status | Verified (SQL test) |

### BR-TAX-008 — Duplicates merge; existing tags keep their spelling
| Field | Value |
| --- | --- |
| Description | Names with the same slug in one call collapse to the first spelling; a tag that already exists is reused with its existing `display_name` |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Return value lists the resulting tags in the order given |
| Exceptions | — |
| Related screens | Studio story form |
| Evidence | `20261104001400_tags.sql:62-65,95-98`, `supabase/tests/200_tags.test.sql:70,78,87` |
| Status | Verified (SQL test) |

### BR-TAX-009 — At most 10 tags per story
| Field | Value |
| --- | --- |
| Description | After de-duplication a story may carry at most 10 tags |
| Preconditions | — |
| Conditions | `cardinality(v_slugs) > 10` |
| Expected behavior | `22023` "a story can have at most 10 tags"; refused call changes nothing |
| Exceptions | — |
| Related screens | Studio story form (counter `n/10`) |
| Evidence | `20261104001400_tags.sql:67-69`, `supabase/tests/200_tags.test.sql:111-119` |
| Status | Verified (SQL test) |

### BR-TAX-010 — New-tag creation quota
| Field | Value |
| --- | --- |
| Description | One author may create at most 10 **new** tags per rolling 24 h; reusing existing tags is unlimited |
| Preconditions | Call contains at least one unknown slug |
| Conditions | Count of `tags.created_by = caller AND created_at > now() - 24h` + new in this call > 10 |
| Expected behavior | `PT409` "you can create at most 10 new tags per day"; the whole call is refused (no tags created, story's set unchanged). Per-author advisory lock + story row lock prevent two concurrent calls from exceeding the quota |
| Exceptions | Another author's quota is independent |
| Related screens | Studio story form (shows the reason; story itself still saved — OBJ-STM) |
| Evidence | `20261104001400_tags.sql:72-85`, `supabase/tests/200_tags.test.sql:125-144`, `docs/WBS.md:207` |
| Status | Verified (SQL test) |

### BR-TAX-011 — `set_story_tags` replaces the set and is the only write path
| Field | Value |
| --- | --- |
| Description | The call sets the story's complete tag set (removes absent ones, adds new ones); an empty array clears all tags. Clients cannot `INSERT/DELETE story_tags` directly; `tags.created_by` is not readable by clients |
| Preconditions | BR-TAX-006 |
| Conditions | — |
| Expected behavior | Tags themselves are never deleted (orphan tags remain but are invisible: popular/search require ≥1 eligible story) |
| Exceptions | No moderation/rename/merge path for tags → F-TAX-02 |
| Related screens | Studio story form |
| Evidence | `20261104001400_tags.sql:17-23,88-93`, `supabase/tests/200_tags.test.sql:81,95-97` |
| Status | Verified (SQL test) |

### BR-TAX-012 — Popular tags
| Field | Value |
| --- | --- |
| Description | `popular_tags(limit)` returns tags ordered by the number of eligible stories (public, not draft, not deleted, **never mature**, owner active), then slug; only tags with ≥ 1 such story |
| Preconditions | Anyone (anon + authenticated) |
| Conditions | `limit` 1–50 else `22023` |
| Expected behavior | Home requests 12 (5-minute cache); Studio editor offers up to 8 as suggestions (OBJ-STM). Mature exclusion is a documented decision (WBS 5.6) |
| Exceptions | Failure → home hides the bar |
| Related screens | SCR-HOME-01 |
| Evidence | `20261104001400_tags.sql:101-120`, `discovery/model/popular-tags.ts:1`, `discovery/api/discovery.api.ts:141-145`, `supabase/tests/200_tags.test.sql:163-174`, `docs/WBS.md:211` |
| Status | Verified (SQL test) |
