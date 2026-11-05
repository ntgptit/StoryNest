# OBJ-SRCH — Workflows

### WF-SRCH-01 — Quick search from the header
| Field | Value |
| --- | --- |
| User goal | Jump straight to a story by typing part of its title |
| Trigger | Typing in the header SearchBox (desktop / tablet, `sm` and up) on any page |
| Preconditions | — |
| Main flow | 1. Reader types ≥ 3 characters. 2. After 250 ms pause the first 5 matching stories appear (BR-SRCH-009). 3. Reader clicks a title, or arrows to it and presses Enter. 4. Story page `/story/{id}/{slug}` opens; list closes. |
| Alternative flows | 3a. Enter without an active suggestion, or the "See all results" row → `/search?q=<term>` (WF-SRCH-02). 3b. Escape or blur closes the list. |
| Exception flows | Term < 3 chars → no list, Enter ignored. Suggestion request fails → only the "See all" row (silent). |
| Success criteria | Matching story opens in ≤ 2 interactions |
| Postconditions | — |
| Affected objects | OBJ-SRCH, OBJ-STORY |
| Related screens | SCR-SRCH-01-C01 → SCR-STORY-01 or SCR-SRCH-01 |
| Status | Verified (`search/search.test.tsx:415-497`) |

### WF-SRCH-02 — Full results with tabs
| Field | Value |
| --- | --- |
| User goal | Compare all matches for a term among stories, authors or tags |
| Trigger | `/search?q=…` from the header, the mobile search icon (`/search`), or a shared link |
| Preconditions | — |
| Main flow | 1. Page shows the term in the field. 2. If term valid: "Results for “term”", tabs Stories / Authors / Tags, Stories tab default. 3. Results load (skeleton → cards/rows). 4. Reader scrolls / "Load more" (offset paging, BR-SRCH-007). 5. Reader switches tab → URL `tab=` replaced; that tab's query runs. 6. Reader edits the term and presses "Search" → URL replaced, tab kept. |
| Alternative flows | 2a. Term empty/short → hint; too long → length message; no tabs. 5a. Author row → `/author/<username>` (WF-AUTHOR-01). 5b. Tag row → `/?tag=<slug>` (WF-TAX-02). |
| Exception flows | Request fails with nothing shown → "Can't search right now" + "Try again". Later page fails → silent; "Load more" remains (U-SRCH-01). Cap reached → "No more results." though more may exist (F-SRCH-01). |
| Success criteria | Results ranked best-match first; URL reproduces term and tab |
| Postconditions | — |
| Affected objects | OBJ-SRCH, OBJ-AUTHOR, OBJ-TAX, OBJ-HOME |
| Related screens | SCR-SRCH-01 → SCR-STORY-01 / SCR-AUTHOR-01 / SCR-HOME-01 |
| Status | Verified (`search/search.test.tsx:299-413`) |

### WF-SRCH-03 — Search on a narrow screen
| Field | Value |
| --- | --- |
| User goal | Search on a phone |
| Trigger | Tap the search icon in the header (below `sm`) |
| Preconditions | — |
| Main flow | 1. `/search` opens with empty field and hint. 2. Reader taps the field, types, submits. 3. Continues as WF-SRCH-02. |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | Results visible without horizontal scroll (`docs/WBS.md:206` browser check) |
| Postconditions | — |
| Affected objects | OBJ-SRCH |
| Related screens | SCR-SRCH-01 |
| Status | Verified (field not auto-focused, no suggestions on mobile — U-SRCH-02) |
