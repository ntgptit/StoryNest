# OBJ-SRCH — Search — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-SRCH |
| Name | Search of stories, authors and tags (header SearchBox with suggestions + results page) |
| Business purpose | Find a story/author/tag by name in Vietnamese with or without diacritics (WBS Q3) |
| User goals | Type a few letters, jump to a matching story, or browse full results by tab and share the URL |
| Actors / roles | Guest, Member, Moderator (identical results — rules applied inside the RPCs) |
| Related entities | RPCs `search_normalize`, `search_prepare`, `search_stories`, `search_authors`, `search_tags`; 5 GIN trigram indexes on normalised expressions; card query on `stories` |
| Dependencies | BR-STORY-* (visibility), BR-MAT-* (opt-in), BR-MOD-* (suspended owners), BR-HOME-009 (card), BR-TAX-* (tag links to home filter), OBJ-AUTHOR (author links) |
| Code | `supabase/migrations/20261104001300_search.sql`, `packages/features/src/search/**`, `apps/web/src/app/(main)/search/*` |

## 2. Rules

### BR-SRCH-001 — Normalisation (case and diacritics ignored)
| Field | Value |
| --- | --- |
| Description | Query and searched text are compared after `lower(unaccent(...))`; whitespace runs collapse to one space and the query is trimmed |
| Preconditions | — |
| Conditions | Applies to story title, username, display name, tag display name and tag slug |
| Expected behavior | "doc truyen" finds "Đọc truyện"; upper case, NFD text and "đ" fold correctly |
| Exceptions | Synopsis and chapter text are not searched (WBS 5.1 "Chưa làm") |
| Related screens | SCR-SRCH-01 |
| Evidence | `supabase/migrations/20261104001300_search.sql:21-38,46`, `packages/features/src/search/model/search.ts:16-19`, `supabase/tests/190_search.test.sql:45-54`, `docs/WBS.md:206` |
| Status | Verified (SQL test) |

### BR-SRCH-002 — Query length 3–100 characters
| Field | Value |
| --- | --- |
| Description | A normalised query shorter than 3 or longer than 100 characters is refused |
| Preconditions | — |
| Conditions | Client counts Unicode code points of the normalised term; DB measures after normalisation |
| Expected behavior | Client: no request; results page shows "Enter at least 3 characters to search. Accents are optional." or "Search terms can be up to 100 characters."; header box shows no list and Enter does nothing. DB: `22023` |
| Exceptions | Input `maxLength` is 120 so an overlong term can be typed and explained |
| Related screens | SCR-SRCH-01 (incl. header SearchBox) |
| Evidence | `20261104001300_search.sql:48-53`, `search/model/search.ts:3-4,21-33`, `search/screens/search-screen.tsx:70,80-83`, `search/components/search-box.tsx:48`, `search/strings.en.ts:7-8`, `search/search.test.tsx:84,93,247,275,283,412`, `supabase/tests/190_search.test.sql:91-96` |
| Status | Verified |

### BR-SRCH-003 — Matching and relevance
| Field | Value |
| --- | --- |
| Description | A row matches when its normalised text contains the whole query (LIKE, wildcards `% _ \` escaped) or is trigram-similar (`%`). Score = similarity + 1 for a containing match |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Stories ordered score DESC, `updated_at` DESC, id; authors score DESC, story count DESC, id; tags score DESC, story count DESC, id. One-letter typos still match |
| Exceptions | "%%%" / "___" match nothing; "100%" matches a literal percent |
| Related screens | SCR-SRCH-01 |
| Evidence | `20261104001300_search.sql:60,74-84,98-113,126-143`, `supabase/tests/190_search.test.sql:56-66` |
| Status | Verified (SQL test) |

### BR-SRCH-004 — Story results follow the discovery eligibility rule
| Field | Value |
| --- | --- |
| Description | Only public, non-draft, non-deleted stories of active, non-deleted owners; mature only when `p_include_mature` |
| Preconditions | — |
| Conditions | `includeMature = useShowMature()`, part of the query key |
| Expected behavior | Same for every caller incl. moderators and the owner |
| Exceptions | — |
| Related screens | SCR-SRCH-01 (Stories tab, header suggestions) |
| Evidence | `20261104001300_search.sql:78-81`, `search/hooks/use-search.ts:27-40`, `search/keys.ts:5,8`, `supabase/tests/190_search.test.sql:46,69-71,114,129-132` |
| Status | Verified (SQL test) |

### BR-SRCH-005 — Author results
| Field | Value |
| --- | --- |
| Description | Active, non-deleted accounts with ≥ 1 eligible story whose username or display name matches |
| Preconditions | — |
| Conditions | Story count includes mature stories only on opt-in |
| Expected behavior | Row: avatar (or first letter), display name, "@username · N stories"; links to `/author/<username>` |
| Exceptions | Suspended accounts never found (not even by themselves). Count may differ from the author page header, which never counts mature stories (U-AUTHOR-02) |
| Related screens | SCR-SRCH-01 (Authors tab) → SCR-AUTHOR-01 |
| Evidence | `20261104001300_search.sql:98-113`, `search/screens/search-screen.tsx:168-209`, `supabase/tests/190_search.test.sql:108-113,134` |
| Status | Verified (SQL test) |

### BR-SRCH-006 — Tag results
| Field | Value |
| --- | --- |
| Description | Tags with ≥ 1 eligible **non-mature** story whose name or slug matches; at most 10, no paging |
| Preconditions | — |
| Conditions | Not keyed on the mature flag (never counts mature) |
| Expected behavior | Row "#name … N stories" links to `/?tag=<slug>` (home filter, any category dropped) |
| Exceptions | Tag used only by private/mature stories is not discoverable |
| Related screens | SCR-SRCH-01 (Tags tab) → SCR-HOME-01 |
| Evidence | `20261104001300_search.sql:126-144`, `search/model/search.ts:10`, `search/screens/search-screen.tsx:211-231`, `supabase/tests/190_search.test.sql:117-119` |
| Status | Verified (SQL test) |

### BR-SRCH-007 — Offset paging with a hard cap
| Field | Value |
| --- | --- |
| Description | Relevance order has no stable keyset, so stories and authors page by offset (12 per page, one extra row requested), limit 1–50, offset 0–200 |
| Preconditions | — |
| Conditions | Next offset = offset + 12 while ≤ 200 |
| Expected behavior | At most 17 pages (204 rows). After the cap the list shows the normal end message "No more results." |
| Exceptions | The prepared "Only the first results are shown. Try a more specific search." (`capReached`) is never displayed → F-SRCH-01 |
| Related screens | SCR-SRCH-01 |
| Evidence | `20261104001300_search.sql:54-59`, `search/model/search.ts:5-7,49-54`, `search/api/search.api.ts:48-58,72-83`, `search/strings.en.ts:15-16`, `search/search.test.tsx:112,173` |
| Status | Verified |

### BR-SRCH-008 — The URL holds the search
| Field | Value |
| --- | --- |
| Description | `/search?q=<term>&tab=<stories|authors|tags>`; default tab omitted; unknown tab → stories |
| Preconditions | — |
| Conditions | Submitting the page form or switching tab **replaces** the history entry; a new `q` remounts the screen so the field shows it |
| Expected behavior | Search can be shared and survives reload; page open to guests; `robots: noindex`; `/search` disallowed in robots.txt |
| Exceptions | — |
| Related screens | SCR-SRCH-01 |
| Evidence | `apps/web/src/app/(main)/search/page.tsx:7-19`, `search/search-view.tsx:7-9`, `search/model/search.ts:35-47`, `search/screens/search-screen.tsx:56-59,87`, `apps/web/src/app/robots.ts:18`, `search/search.test.tsx:98,105,331,342` |
| Status | Verified |

### BR-SRCH-009 — Header suggestions
| Field | Value |
| --- | --- |
| Description | From `sm` width the header shows a combobox; after 250 ms without typing and with a searchable term it lists up to 5 matching story titles plus "See all results for “term”" |
| Preconditions | — |
| Conditions | Suggestions cached 30 s, previous list kept while the next loads; the list of an earlier different term is not shown |
| Expected behavior | ArrowDown/Up cycle through rows, Enter opens the active story or the results page, Escape closes, mouse-down on a row navigates, blur closes after 120 ms. Below `sm` only a search icon linking to `/search` |
| Exceptions | Loading, no-match and error states of the list are not shown (only the "See all" row) → U-SRCH-02 |
| Related screens | SCR-SRCH-01-C01 (renders in the shell on every page) |
| Evidence | `search/components/search-box.tsx:13-137`, `search/model/search.ts:8-9`, `search/hooks/use-search.ts:66-80`, `search/search.test.tsx:393-476` |
| Status | Verified |

### BR-SRCH-010 — Story results reuse the home card
| Field | Value |
| --- | --- |
| Description | The RPC returns ids + scores; a second request loads `STORY_COLUMNS` for those ids; order restored; stories that vanished between requests are dropped |
| Preconditions | — |
| Conditions | No second request when nothing matched |
| Expected behavior | A result card is identical to a home card (BR-HOME-009) |
| Exceptions | A dropped story can make a page shorter than 12 |
| Related screens | SCR-SRCH-01 |
| Evidence | `search/api/search.api.ts:29-59`, `discovery/model/order-by-ids.ts:1-8`, `search/search.test.tsx:120-149` |
| Status | Verified |

### BR-SRCH-011 — Access
| Field | Value |
| --- | --- |
| Description | All three RPCs are `SECURITY INVOKER`, executable by anon and authenticated |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Guests search freely; RLS of the caller plus explicit discovery rules decide rows |
| Exceptions | — |
| Related screens | SCR-SRCH-01 |
| Evidence | `20261104001300_search.sql:11-13,147-151` |
| Status | Verified |
