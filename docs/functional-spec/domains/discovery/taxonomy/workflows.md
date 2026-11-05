# OBJ-TAX — Workflows

### WF-TAX-01 — Browse by category
| Field | Value |
| --- | --- |
| User goal | See stories of one genre |
| Trigger | Category chip on SCR-HOME-01 (the story page shows the category as a plain badge, not a link — U-TAX-01) |
| Preconditions | Categories exist (BR-TAX-002) |
| Main flow | See WF-HOME-02 (category branch): chip → `/?category=slug` → root + direct children listed |
| Alternative flows | URL with a sub-category slug → only that sub-category; no chip highlighted |
| Exception flows | Unknown slug → empty state; tree load failure → error state |
| Success criteria | Every card belongs to the category or a direct child |
| Postconditions | — |
| Affected objects | OBJ-TAX, OBJ-HOME |
| Related screens | SCR-HOME-01 |
| Status | Verified |

### WF-TAX-02 — Browse by tag
| Field | Value |
| --- | --- |
| User goal | See stories sharing a theme |
| Trigger | Popular-tag chip (SCR-HOME-01), tag badge on the story page (`story/screens/story-screen.tsx:153`), tag result in SCR-SRCH-01 Tags tab |
| Preconditions | — |
| Main flow | 1. Link → `/?tag=slug` (story page / search links drop any category; home chips keep it). 2. Feed filtered (BR-HOME-004). |
| Alternative flows | Tag already active on home → chip click clears it |
| Exception flows | No eligible story → "No stories with this tag yet" |
| Success criteria | Every card carries the tag |
| Postconditions | — |
| Affected objects | OBJ-TAX, OBJ-HOME, OBJ-SRCH, OBJ-STORY |
| Related screens | SCR-HOME-01, SCR-SRCH-01, SCR-STORY-01 |
| Status | Verified (`docs/WBS.md:207` browser check) |

### WF-TAX-03 — Author sets a story's tags
| Field | Value |
| --- | --- |
| User goal | Label a story so readers can find it |
| Trigger | Save of the Studio story form with changed tags (UI owned by OBJ-STM) |
| Preconditions | Caller is owner/co-author with active account (BR-TAX-006) |
| Main flow | 1. Client sends the full list of names to `set_story_tags`. 2. DB cleans, slugifies, de-duplicates (BR-TAX-005/007/008). 3. Checks ≤10 per story (BR-TAX-009) and the new-tag quota under locks (BR-TAX-010). 4. Creates unknown tags with `created_by`, replaces `story_tags`. 5. Returns resulting tags; editor shows them as the DB normalised them. |
| Alternative flows | Empty list → all tags removed. Only existing tags → no quota used. |
| Exception flows | 42501 not allowed; 22023 invalid name / >10 tags / NULL list; PT409 quota — the whole call is refused and nothing changes |
| Success criteria | Story's tags equal the returned set; tag immediately usable in `/?tag=` |
| Postconditions | New `tags` rows (if any); `story_tags` replaced; story `updated_at` not bumped by a tags-only change (OBJ-STM) |
| Affected objects | OBJ-TAX, OBJ-STM |
| Related screens | Studio story form (SCR-STM-*) |
| Status | Verified (SQL test `supabase/tests/200_tags.test.sql`) |
