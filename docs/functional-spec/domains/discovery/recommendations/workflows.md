# OBJ-REC — Workflows

### WF-REC-01 — Continue from a story to a similar one
| Field | Value |
| --- | --- |
| User goal | After looking at a story, find another like it |
| Trigger | Open a story page (SCR-STORY-01) |
| Preconditions | Source story eligible (BR-REC-003); mature story only after passing AdultGate (BR-MAT-*) |
| Main flow | 1. Story page renders; `similar_stories(story, mature, 6)` runs. 2. If ≥ 1 result, "You might also like" appears at the end with up to 6 cards and reasons. 3. Reader clicks a card → that story page (WF repeats). |
| Alternative flows | 2a. No candidates / loading / error → section absent. |
| Exception flows | — |
| Success criteria | Never the story itself, never ineligible stories |
| Postconditions | — |
| Affected objects | OBJ-REC, OBJ-STORY |
| Related screens | SCR-STORY-01 |
| Status | Verified (`docs/WBS.md:210` browser check, `recommendations/recommendations.test.tsx:198`) |

### WF-REC-02 — Personal suggestions on home
| Field | Value |
| --- | --- |
| User goal | Get stories picked for me |
| Trigger | Signed-in member opens the unfiltered home |
| Preconditions | Authenticated; no category/tag filter |
| Main flow | 1. `recommend_for_me(mature, 8)` runs. 2. "Recommended for you" shows cards with "From an author you follow: …" or "Because you saved or followed “…”". 3. Reader opens one; once reading progress exists (BR-PROG-*) or the story is saved/followed, it is excluded next time, after the 5-minute cache (Inferred). |
| Alternative flows | 1a. Guest or filtered view → block not rendered. 2a. Nothing to suggest (new member with empty library and no follows) → block absent; no onboarding hint. |
| Exception flows | Error → block absent (silent). |
| Success criteria | Suggested stories are unmet and eligible |
| Postconditions | — |
| Affected objects | OBJ-REC, OBJ-LIB, OBJ-AUTHOR, OBJ-PROG |
| Related screens | SCR-HOME-01 |
| Status | Verified |
