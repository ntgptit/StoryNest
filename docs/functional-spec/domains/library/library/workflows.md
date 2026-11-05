# OBJ-LIB — Library, story follow & save: workflows

| ID | Name | Status |
| --- | --- | --- |
| WF-LIB-01 | Follow / unfollow a story from its page | Verified |
| WF-LIB-02 | Save / unsave a story from its page | Verified |
| WF-LIB-03 | Continue reading from the library | Verified |
| WF-LIB-04 | Browse the library tabs | Verified |
| WF-LIB-05 | Remove a story from a tab (incl. an unavailable one) | Verified |
| WF-LIB-06 | Guest opens the library or presses Follow/Save | Verified |

### WF-LIB-01 — Follow / unfollow a story from its page
| Field | Value |
| --- | --- |
| User goal | Be told when the story gets a new chapter (or stop) |
| Trigger | "Follow" / "Following" on the story page (OBJ-STORY, `StoryActions`) |
| Preconditions | Signed in; story readable |
| Main flow | 1. Button flips at once, follower count ±1. 2. `set_story_follow(story, !following)`. 3. Server count replaces the guess; toast "Followed. You'll be notified when there are new chapters." / "Unfollowed." 4. From now on, first publishes of chapters notify the reader (WF-NOTI-01). |
| Alternative flows | A1 Repeat request (double click blocked by disabled state; API repeat harmless). |
| Exception flows | E1 Story became private → `42501` → rollback + "You can't follow or save this story." E2 Network → rollback + "No connection…". |
| Success criteria | Follow state and count persist after reload |
| Postconditions | `story_follows` row; `story_stats.followers` moved |
| Affected objects | OBJ-LIB, OBJ-STORY, OBJ-NOTI |
| Related screens | Story page (OBJ-STORY), SCR-LIB-01 (Following tab) |
| Status | Verified — `packages/features/src/story/hooks/use-story-library.ts:32-73`, `supabase/tests/140_follows_saves.test.sql` |

### WF-LIB-02 — Save / unsave a story from its page
| Field | Value |
| --- | --- |
| User goal | Keep the story on my shelf |
| Trigger | "Save to library" / "Saved" |
| Preconditions | As WF-LIB-01 |
| Main flow | 1. Button flips at once. 2. `set_story_save`. 3. Toast "Saved to your library." / "Removed from your library." |
| Alternative flows | — |
| Exception flows | As WF-LIB-01. |
| Success criteria | Story appears in / disappears from the Saved tab |
| Postconditions | `story_saves` row; `story_stats.saves` moved |
| Affected objects | OBJ-LIB |
| Related screens | Story page, SCR-LIB-01 |
| Status | Verified — `packages/features/src/story/hooks/use-story-library.ts:75-94` |

### WF-LIB-03 — Continue reading from the library
| Field | Value |
| --- | --- |
| User goal | Resume the story I was reading |
| Trigger | Library (bottom nav "Library" on mobile, user menu "Library") → Reading tab → "Continue with chapter N" |
| Preconditions | Signed in; a progress row exists (OBJ-PROG) |
| Main flow | 1. `/library` opens on "Reading". 2. Entries ordered by last read. 3. Click → chapter reader at `/story/{id}/{slug}/{chapterSlug}`; reader restores position (OBJ-PROG). |
| Alternative flows | A1 Current chapter unpublished → no continue button; card opens the story page. |
| Exception flows | E1 Story gone → placeholder (WF-LIB-05). |
| Success criteria | One tap to the right chapter |
| Postconditions | Progress updated by the reader |
| Affected objects | OBJ-LIB, OBJ-PROG, OBJ-READ |
| Related screens | SCR-LIB-01 |
| Status | Verified |

### WF-LIB-04 — Browse the library tabs
| Field | Value |
| --- | --- |
| User goal | See my shelf by category |
| Trigger | Tab "Reading" / "Saved" / "Following" / "Lists" |
| Preconditions | Signed in |
| Main flow | 1. Tab content mounts; its query runs (fresh each opening). 2. Skeleton → grid of story cards (2/3/4 columns) with action buttons and a time line, or empty state. 3. "Lists" tab shows My lists (OBJ-LIST). |
| Alternative flows | A1 Empty tab → icon + tab-specific empty text. |
| Exception flows | E1 Load fails → ErrorState "Couldn't load your library" + "Try again" (other tabs unaffected). |
| Success criteria | Up to 50 entries per tab visible |
| Postconditions | — |
| Affected objects | OBJ-LIB, OBJ-LIST |
| Related screens | SCR-LIB-01 |
| Status | Verified |

### WF-LIB-05 — Remove a story from a tab
| Field | Value |
| --- | --- |
| User goal | Tidy my shelf |
| Trigger | "Remove from reading" / "Unsave" / "Unfollow" on an entry (also on a "Story no longer available" placeholder) |
| Preconditions | Signed in |
| Main flow | 1. Request (no confirmation). 2. Toast. 3. Library and story caches refresh; entry disappears. |
| Alternative flows | A1 Placeholder entry: same buttons work although the story is unreadable. |
| Exception flows | E1 Failure → error toast, entry stays. |
| Success criteria | Entry gone after reload |
| Postconditions | Row deleted; counters adjusted (save/follow) |
| Affected objects | OBJ-LIB, OBJ-PROG, OBJ-STORY |
| Related screens | SCR-LIB-01 |
| Status | Verified |

### WF-LIB-06 — Guest opens the library or presses Follow/Save
| Field | Value |
| --- | --- |
| User goal | Use the shelf without being signed in |
| Trigger | `/library` URL, or Follow/Save/Add to list on a story page |
| Preconditions | Guest |
| Main flow | Redirect to `/login?next=<path>`; after sign-in return to the page (the follow/save is not performed automatically). |
| Alternative flows | — |
| Exception flows | — |
| Success criteria | User lands back where they started, signed in |
| Postconditions | — |
| Affected objects | OBJ-AUTH |
| Related screens | SCR-LIB-01, story page |
| Status | Verified — `apps/web/src/lib/auth/route-guard.ts:42-44`, `packages/features/src/story/components/story-actions.tsx:22`, `:32` |
