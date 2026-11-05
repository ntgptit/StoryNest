# OBJ-MAT — Mature (adult, 18+) content — Business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | OBJ-MAT |
| Name | Mature (adult, 18+) content filter and gate |
| Business purpose | Keep 18+ stories out of sight unless a reader deliberately opts in, and stop an 18+ story opened by link from showing before the reader confirms their age |
| User goals | Reader: never stumble on adult content; adult reader: turn it on once and have it follow them across devices |
| Actors / roles | Guest, Member, Author (marks a story 18+ — OBJ-STM), Moderator (no special rule) |
| Related entities | `stories.is_mature`; `user_settings.age_confirmed`, `user_settings.show_mature` (CHECK `NOT show_mature OR age_confirmed`); localStorage key `storynest.adult-content`; RPC parameter `p_include_mature` on `search_stories`, `search_authors`, `top_stories`, `similar_stories`, `recommend_for_me`, `list_followed_stories`; hard-coded `NOT is_mature` in `popular_tags`, `search_tags`, `author_profile` count, sitemap queries |
| Dependencies | OBJ-STM (sets `is_mature`), OBJ-SET (settings switch, `user_settings` row), discovery objects (lists), OBJ-STORY / OBJ-READ (gate hosts), OBJ-SEO (`isIndexable`), OBJ-SHELL (header, `AdultContentSync` mount) |
| Code | `packages/features/src/adult-content/**`, `supabase/migrations/20261104001900_user_settings.sql`, tests `adult-content/adult-content.test.tsx`, `supabase/tests/250_user_settings.test.sql` |

## 2. Rules

### BR-MAT-001 — Hidden by default for everyone
| Field | Value |
| --- | --- |
| Description | With no stored choice, 18+ stories are excluded from every discovery list and the gate is shown |
| Preconditions | No device value, or a value that is not a clear "yes" |
| Conditions | `NO_ADULT_CONTENT = {ageConfirmed:false, show:false}`; server render always uses it (`getServerAdultContent`); every RPC defaults `p_include_mature = false` |
| Expected behavior | Guests and members start hidden; the client switches after hydration if the device says otherwise |
| Exceptions | After a member signs out, the device keeps the choice that was synced from their account (F-MAT-03) |
| Related screens | SCR-MAT-01, all list screens |
| Evidence | `adult-content/model/store.ts:14,29-40,52-55`, `supabase/migrations/20261104001300_search.sql:65`, `20261104001500_rankings.sql:83`, `adult-content/adult-content.test.tsx:41` |
| Status | Verified |

### BR-MAT-002 — Showing requires a self-declared age confirmation
| Field | Value |
| --- | --- |
| Description | `show` can be true only together with `ageConfirmed` |
| Preconditions | — |
| Conditions | Device: enforced on every **read** (`parseAdultContent`: `show = ageConfirmed === true && show === true`). Account: DB CHECK `NOT show_mature OR age_confirmed` |
| Expected behavior | A damaged or hand-edited value never shows adult content. The only way to set `ageConfirmed` is a button that says "I'm 18 or older…" |
| Exceptions | There is no real age verification (statement only) — documented limitation |
| Related screens | SCR-MAT-01 |
| Evidence | `adult-content/model/store.ts:29-40`, `adult-content/hooks/use-adult-content.ts:10-13`, `supabase/migrations/20261104001900_user_settings.sql:9-10,28`, `adult-content/adult-content.test.tsx:52,68`, `docs/WBS.md:211` ("chưa có bước kiểm tra tuổi thật") |
| Status | Verified |

### BR-MAT-003 — Changing the choice
| Field | Value |
| --- | --- |
| Description | Three controls change the same device choice |
| Preconditions | — |
| Conditions | (1) Header button "Mature content (18+)" → dialog: hidden → "Keep hidden" / "I'm 18 or older, show 18+ stories"; shown → "Hide 18+ stories again". (2) Gate → "I'm 18 or older, continue". (3) `/settings` switch "Show 18+ stories" → turning on opens "Show adult stories?" confirm; turning off is immediate (OBJ-SET) |
| Expected behavior | `enable()` writes `{ageConfirmed:true, show:true}`; `disable()` writes `{…, show:false}` keeping `ageConfirmed` |
| Exceptions | Although `ageConfirmed` is remembered, every control still asks again when going from hidden to shown (Q-MAT-01) |
| Related screens | SCR-MAT-01, SCR-SET-* |
| Evidence | `adult-content/components/adult-content-button.tsx:23-76`, `adult-content/components/adult-gate.tsx:17-32`, `adult-content/hooks/use-adult-content.ts:10-16`, `packages/features/src/settings/screens/settings-screen.tsx:152-171`, `adult-content/adult-content.test.tsx:113,200,246` |
| Status | Verified |

### BR-MAT-004 — Device persistence
| Field | Value |
| --- | --- |
| Description | The choice is stored per browser, shared by all tabs |
| Preconditions | — |
| Conditions | localStorage `storynest.adult-content` (JSON); `useSyncExternalStore` with same-page listeners and the `storage` event (other tabs); blocked storage → in-memory copy for the page |
| Expected behavior | A change in one tab applies to all open tabs; lists refetch because the flag is part of each query key (BR-MAT-006) |
| Exceptions | — |
| Related screens | All |
| Evidence | `adult-content/model/store.ts:7,16-80`, `adult-content/adult-content.test.tsx:91,100` |
| Status | Verified |

### BR-MAT-005 — Account copy and sync
| Field | Value |
| --- | --- |
| Description | For a signed-in reader the device choice and `user_settings` are reconciled once per sign-in, then every device change is saved |
| Preconditions | `AdultContentSync` mounted in `MainShell`; `auth.status = authenticated` |
| Conditions | Read `user_settings(age_confirmed, show_mature)` (RLS own row). If the account has `age_confirmed = true` → the account wins and overwrites the device. Else, if the device has `ageConfirmed` → device is uploaded. Then each change is upserted 500 ms after it happens, only the two columns, skipped when equal to the last synced value |
| Expected behavior | The choice follows the reader to a new device; a choice made as a guest is kept on sign-in |
| Exceptions | Read/save failures are silent; the device keeps working. A guest's confirmation on a shared device is uploaded to whichever unconfirmed account signs in next; sign-out does not reset the device (F-MAT-03) |
| Related screens | All (shell) |
| Evidence | `adult-content/hooks/use-adult-content-sync.ts:14-70`, `adult-content/api/adult-content.api.ts:1-25`, `shell/components/main-shell.tsx:30`, `supabase/migrations/20261104001900_user_settings.sql:20-44`, `adult-content/adult-content.test.tsx:419-520`, `docs/WBS.md:221` |
| Status | Verified |

### BR-MAT-006 — Every discovery list honours the reader's choice
| Field | Value |
| --- | --- |
| Description | Lists include 18+ stories only when `useShowMature()` is true; the flag is sent to the query **and** included in its key |
| Preconditions | — |
| Conditions | See matrix below |
| Expected behavior | Switching the choice produces a different list (no reuse of the other choice's cache). Shown 18+ stories carry the "18+" badge |
| Exceptions | Library and reading lists (BR-MAT-007); aggregates (BR-MAT-008) |
| Related screens | SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01, SCR-AUTHOR-02, story page (similar) |
| Evidence | Matrix; `adult-content/adult-content.test.tsx:258-390` (8 lists + header suggestions), `discovery/model/story-card.ts:75` |
| Status | Verified |

**Per-list matrix (WBS 5.6 "applied consistently in search/rank/feed")**

| List | Source | 18+ rule | Evidence | Result |
| --- | --- | --- | --- | --- |
| Home feed (incl. category / tag filter) | `listLatestStories` | flag → `.eq("is_mature", false)` when off | `discovery/api/discovery.api.ts:71`, `discovery/hooks/use-latest-stories.ts:23-24`, `discovery/keys.ts:28` | Consistent |
| Search — stories | `search_stories(p_include_mature)` | flag | `20261104001300_search.sql:65,79`, `search/hooks/use-search.ts:29-34` | Consistent |
| Search — authors (story count / eligibility) | `search_authors(p_include_mature)` | flag | `20261104001300_search.sql:89,107`, `use-search.ts:44-49` | Consistent |
| Header search suggestions | `search_stories` (page size = suggestions) | flag | `use-search.ts:69-73` | Consistent |
| Search — tags (counts) | `search_tags` | always excluded | `20261104001300_search.sql:135` | Consistent (stricter) |
| Rankings | `top_stories(p_include_mature)` | flag | `20261104001500_rankings.sql:83,105`, `ranking/hooks/use-ranking.ts:15-26` | Consistent |
| Similar stories (story page) | `similar_stories(p_include_mature)` | flag | `20261104001700_recommendations.sql:24,38`, `recommendations/hooks/use-recommendations.ts:17-21` | Consistent |
| Recommended for you (home) | `recommend_for_me(p_include_mature)` | flag | `20261104001700_recommendations.sql:77,103`, `use-recommendations.ts:29-35` | Consistent |
| Author page — story list | `listLatestStories({authorId})` | flag | `author/screens/author-screen.tsx:61` | Consistent |
| Author page — "N stories" count | `author_profile` | always excluded | `20261104001600_author_follows.sql:43-45` | Consistent (stricter) |
| Following feed `/following` | `list_followed_stories(p_include_mature)` | flag | `20261104001600_author_follows.sql:88,112`, `author/hooks/use-author.ts:52-63` | Consistent |
| Popular tags (home quick filters) | `popular_tags` | always excluded | `20261104001400_tags.sql:115` | Consistent (stricter) |
| Library (reading / saved / following) | `library.api.ts` (`STORY_COLUMNS`) | **not filtered** — by decision | `library/api/library.api.ts:13`, `docs/WBS.md:211` ("Quyết định") | By design |
| Own reading lists | `getList` | **not filtered** — by decision | `lists/api/lists.api.ts:31-48` | By design |
| Other people's public / unlisted lists `/lists/[id]` | `getList` | **not filtered** | `lists/api/lists.api.ts:31-48`, `lists/screens/list-screen.tsx:137` | **Gap** (F-MAT-02) |
| Sitemap | `sitemap-data.ts` | always excluded | `apps/web/src/lib/seo/sitemap-data.ts:29,55` | Consistent |
| Notifications (new chapter of a followed 18+ story) | outbox / notifications | not filtered | — | Unknown (not analysed; follow implies opt-in) |

### BR-MAT-007 — Library and own reading lists keep 18+ stories
| Field | Value |
| --- | --- |
| Description | Stories the user saved, followed, is reading, or put in their own lists are shown even when 18+ is hidden |
| Preconditions | — |
| Conditions | No `is_mature` filter in library/list queries; cards show the "18+" badge |
| Expected behavior | Opening such a story still hits the gate if the choice is "hidden" (BR-MAT-009) |
| Exceptions | The same unfiltered `getList` serves other people's public lists (F-MAT-02) |
| Related screens | SCR-LIB-*, SCR-LIST-* |
| Evidence | `docs/WBS.md:211` ("thư viện … và danh sách đọc của chính người dùng vẫn hiện truyện 18+"), `library/api/library.api.ts:13`, `lists/api/lists.api.ts:31-48`, `discovery/model/story-card.ts:75` |
| Status | Documented + Verified |

### BR-MAT-008 — Aggregates never count 18+ stories
| Field | Value |
| --- | --- |
| Description | Tag counts, popular tags and the author page's story count ignore 18+ stories regardless of the choice |
| Preconditions | — |
| Conditions | Hard-coded `NOT st.is_mature` |
| Expected behavior | A reader with 18+ on may see more stories in an author's list than the header count says |
| Exceptions | `search_authors` count follows the flag |
| Related screens | SCR-HOME-01, SCR-SRCH-01, SCR-AUTHOR-01 |
| Evidence | `20261104001400_tags.sql:115`, `20261104001300_search.sql:135`, `20261104001600_author_follows.sql:43-45`, `docs/WBS.md:211` |
| Status | Verified |

### BR-MAT-009 — Gate in front of an 18+ story and its chapters
| Field | Value |
| --- | --- |
| Description | An 18+ story opened by link shows only an explanation until the reader confirms |
| Preconditions | `story.isMature = true` and choice `show = false` |
| Conditions | `AdultGate` wraps the whole story page and the whole reader. The reader waits for both chapter **and** story queries before rendering anything (skeleton) |
| Expected behavior | Gate: "Mature story" / "The author has marked this story as 18+. Confirm that you are 18 or older to view it." / "Go back" / "I'm 18 or older, continue". Hidden behind it: cover, title, synopsis, read button, report button, chapter text, read tracker, votes, comments. Confirm → content appears in place and the header toggle turns on |
| Exceptions | Server-rendered metadata and dehydrated query data still contain the title, synopsis excerpt, cover (OG image), chapter title, first-paragraph excerpt and chapter blocks (F-MAT-01). "Go back" uses history back only (U-MAT-01) |
| Related screens | SCR-MAT-01 |
| Evidence | `adult-content/components/adult-gate.tsx:12-32`, `story/screens/story-screen.tsx:66,188`, `reader/screens/reader-screen.tsx:45-46,71,128`, `adult-content/strings.en.ts:15-20`, `adult-content/adult-content.test.tsx:221-246` |
| Status | Verified |

### BR-MAT-010 — 18+ stories are not offered to search engines
| Field | Value |
| --- | --- |
| Description | 18+ story and chapter pages are `noindex,nofollow`, carry no JSON-LD and are not in the sitemap |
| Preconditions | — |
| Conditions | `isIndexable = visibility public && !isMature` |
| Expected behavior | As described (policy decision recorded in WBS 6.6) |
| Exceptions | `<title>`, description and Open Graph tags/images are still emitted (F-MAT-01) |
| Related screens | SCR-MAT-01 hosts |
| Evidence | `story/model/story-detail.ts:20-26`, `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:18-38,55-63`, `apps/web/src/lib/seo/sitemap-data.ts:29,55`, `docs/WBS.md:224` |
| Status | Verified |

### BR-MAT-011 — The 18+ mark belongs to the author
| Field | Value |
| --- | --- |
| Description | `stories.is_mature` is set by the owner/co-author in the story form ("Mature content (18+)"); moderators have no "mark as 18+" action |
| Preconditions | — |
| Conditions | Column grant on INSERT/UPDATE for authenticated story managers (OBJ-STM) |
| Expected behavior | Badge "18+" on story page, cards and Studio list |
| Exceptions | A reader can report a story with reason "Sexual content", but the only moderator remedy is removing the whole story (BR-MOD-012) |
| Related screens | SCR-STM-* (form), SCR-MAT-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:203-206`, `studio/screens/story-form-screen.tsx:383`, `studio/strings.en.ts:186-187`, `story/screens/story-screen.tsx:90` |
| Status | Verified |

## 3. Open questions
- **Q-MAT-01** — WBS 5.6 says the confirmation is remembered so "hiding and showing again does not ask twice", but
  every control re-asks (only the wording differs). Intended? Evidence BR-MAT-003, `docs/WBS.md:211`.
- **Q-MAT-02** — Should other people's public reading lists respect the viewer's 18+ choice (F-MAT-02)?
- **Q-MAT-03** — Should sign-out reset the device choice to hidden (shared devices), and should a guest choice be
  uploaded to an account automatically (F-MAT-03)?
- **Q-MAT-04** — Should moderators be able to set or force `is_mature` on a story instead of removing it?
