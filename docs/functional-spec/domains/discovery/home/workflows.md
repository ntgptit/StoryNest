# OBJ-HOME — Workflows

### WF-HOME-01 — Browse the latest stories
| Field | Value |
| --- | --- |
| User goal | See what was updated recently and keep scrolling |
| Trigger | Open `/` (brand link, bottom-nav "Home") |
| Preconditions | None (guest or member) |
| Main flow | 1. Server prefetches category tree + first page (BR-HOME-007). 2. Page renders hero, (member, unfiltered) "Recommended for you", "Recently updated" heading with shortcuts, category chips, popular-tag bar, 12 cards. 3. Reader scrolls; sentinel or "Load more" fetches the next keyset page (BR-HOME-002). 4. Last page shows "You've seen all the stories." |
| Alternative flows | 2a. Prefetch failed → client fetch shows skeleton grid first. 2b. Reader opted into mature content → client refetches with mature included (BR-MAT-*). |
| Exception flows | 3a. First page fails → full error state "Couldn't load stories" + "Try again". 3b. Later page fails → cards stay, inline error + "Try again". |
| Success criteria | Cards ordered newest-update first, no duplicates or gaps across pages |
| Postconditions | None (read-only) |
| Affected objects | OBJ-HOME, OBJ-TAX (chips), OBJ-REC (For-you block) |
| Related screens | SCR-HOME-01 |
| Status | Verified (`discovery/discovery.test.tsx:296-353`) |

### WF-HOME-02 — Filter by category and/or tag
| Field | Value |
| --- | --- |
| User goal | Narrow the feed to a genre or tag and share it |
| Trigger | Click a category chip, a popular-tag chip, a tag on a story page, or a tag result in search |
| Preconditions | — |
| Main flow | 1. Link navigates to `/?category=…` and/or `/?tag=…` (other filter preserved). 2. "Recommended for you" is hidden (filtered view). 3. Feed refetches with the filter; active chip has `aria-current="page"`; active tag shows "Filtering by tag #name" + "Clear tag filter". 4. Clicking the active tag chip again, or "Clear tag filter", removes the tag (keeps category); "All" removes the category (keeps tag). |
| Alternative flows | 1a. Sub-category slug typed in the URL → filtered to that sub-category; no chip appears active (only roots are chips). |
| Exception flows | 3a. Unknown category → empty "No stories yet". 3b. Unknown tag / no story with tag → "No stories with this tag yet". 3c. Category tree fails while a category is active → error state. |
| Success criteria | Every visible card matches all active filters; URL reproduces the view |
| Postconditions | — |
| Affected objects | OBJ-HOME, OBJ-TAX |
| Related screens | SCR-HOME-01; entry from story page (SCR-STORY-*) and SCR-SRCH-01 |
| Status | Verified (`discovery/discovery-tags.test.tsx:189-236`) |

### WF-HOME-03 — Open a story from a card
| Field | Value |
| --- | --- |
| User goal | Read a story found in a list |
| Trigger | Click/tap anywhere on a story card (any discovery list) |
| Preconditions | — |
| Main flow | 1. Navigate to `/story/{id}/{slug}` (canonical, BR-STORY-*). 2. Story page loads; mature story shows the AdultGate first (BR-MAT-*). |
| Alternative flows | — |
| Exception flows | Story became private/deleted since the list loaded → story page's not-found handling (owned by OBJ-STORY). |
| Success criteria | Correct story opens |
| Postconditions | — |
| Affected objects | OBJ-HOME, OBJ-STORY |
| Related screens | SCR-HOME-01 → SCR-STORY-01 |
| Status | Verified (`discovery/model/story-card.ts:62-68`) |

### WF-HOME-04 — Jump to rankings or the followed-authors feed
| Field | Value |
| --- | --- |
| User goal | Reach popular stories or stories of followed authors |
| Trigger | "See rankings" / "From authors you follow" links next to the "Recently updated" heading |
| Preconditions | "From authors you follow" visible only when signed in |
| Main flow | 1. Click → `/ranking` (WF-RANK-01) or `/following` (WF-AUTHOR-03). |
| Alternative flows | A guest who types `/following` is redirected to `/login?next=%2Ffollowing` (BR-AUTH-*). |
| Exception flows | — |
| Success criteria | Destination opens |
| Postconditions | — |
| Affected objects | OBJ-HOME, OBJ-RANK, OBJ-AUTHOR |
| Related screens | SCR-HOME-01 → SCR-RANK-01 / SCR-AUTHOR-02 |
| Status | Verified (`discovery/screens/discover-screen.tsx:53-62`). These links are the only in-app entry points (U-HOME-01). |
