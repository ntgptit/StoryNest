# OBJ-MAT — Mature (adult, 18+) content — Workflows

### WF-MAT-01 — Turn 18+ stories on or off from the header
| Field | Value |
| --- | --- |
| User goal | Include or exclude adult stories in all lists |
| Trigger | Header icon button "Mature content (18+)" (ShieldAlert when hidden, ShieldCheck when shown) |
| Preconditions | Any visitor (guest included) |
| Main flow | 1. Click the button. 2. Dialog "Mature content": hidden state says "18+ stories are hidden from all lists. Only turn this on if you are 18 or older." + device note. 3. Click "I'm 18 or older, show 18+ stories". 4. Store becomes `{ageConfirmed:true, show:true}`; dialog closes; icon becomes ShieldCheck (`aria-pressed=true`). 5. Every mounted list refetches with `include_mature = true` (new query keys); 18+ cards show "18+". 6. Signed in: the change is saved to `user_settings` after 0.5 s |
| Alternative flows | A1 "Keep hidden" / Esc: nothing changes. A2 Shown state: dialog says "18+ stories are shown in lists." with "Hide 18+ stories again" → `show:false` (confirmation kept), lists refetch without 18+ |
| Exception flows | E1 Storage blocked: choice lives for this page only. E2 Account save fails: ignored; next change retries |
| Success criteria | All lists in BR-MAT-006 change together; other tabs follow |
| Postconditions | Device (and account) choice updated |
| Affected objects | OBJ-MAT, discovery objects, OBJ-SET (`user_settings`) |
| Related screens | SCR-MAT-01 (header toggle part) |
| Status | Verified (`adult-content/components/adult-content-button.tsx:23-76`, `adult-content/adult-content.test.tsx:186-215`) |

### WF-MAT-02 — Open an 18+ story or chapter by link
| Field | Value |
| --- | --- |
| User goal | Read an adult story reached from a shared link, the library or a list |
| Trigger | Navigate to `/story/{id}/{slug}` or a chapter of an `is_mature` story |
| Preconditions | Choice is "hidden" |
| Main flow | 1. Page loads (reader: skeleton until both chapter and story are known). 2. Gate shows "Mature story" + explanation + "Go back" / "I'm 18 or older, continue". 3. Reader clicks continue. 4. `enable()`; gate disappears and the story/chapter renders in place; header toggle shows ShieldCheck; lists now include 18+ |
| Alternative flows | A1 "Go back" → `navigation.back()`. A2 Choice already "shown": no gate |
| Exception flows | E1 Story not found / hidden: the host page's 404 / not-found state, no gate. E2 Opened in a new tab: "Go back" has no history entry (U-MAT-01) |
| Success criteria | No title, cover, text, counters or comments are visible before confirming |
| Postconditions | Device choice = shown (global, not per story) |
| Affected objects | OBJ-MAT, OBJ-STORY, OBJ-READ |
| Related screens | SCR-MAT-01 |
| Status | Verified (`adult-content/components/adult-gate.tsx:17-32`, `reader/screens/reader-screen.tsx:45-46`, `adult-content/adult-content.test.tsx:221-246`); page-source leak noted in F-MAT-01 |

### WF-MAT-03 — The choice follows the account (cross-device)
| Field | Value |
| --- | --- |
| User goal | Set it once, have it on every device |
| Trigger | Sign-in (or app load with a session) |
| Preconditions | `AdultContentSync` mounted (every `(main)` page) |
| Main flow | 1. Read own `user_settings` row. 2a. Account confirmed age → device takes the account's `{ageConfirmed, show}`. 2b. Account not confirmed / no row, device confirmed → device value is upserted to the account. 2c. Neither confirmed → nothing uploaded. 3. From then on every device change is upserted (debounced 0.5 s, only when different) |
| Alternative flows | A1 Account row read fails → device unaffected, no sync this session |
| Exception flows | — |
| Success criteria | New device of a confirmed account shows 18+ according to the account without asking |
| Postconditions | Device and account equal |
| Affected objects | OBJ-MAT, OBJ-SET |
| Related screens | All `(main)` pages |
| Status | Verified (`adult-content/hooks/use-adult-content-sync.ts:22-70`, `adult-content/adult-content.test.tsx:433-520`). Sign-out keeps the device value (F-MAT-03) |

### WF-MAT-04 — Change the choice from Settings
| Field | Value |
| --- | --- |
| User goal | Manage 18+ from the account settings page |
| Trigger | `/settings` → section "Adult content (18+)" → switch "Show 18+ stories" |
| Preconditions | Signed in (protected route) — screen owned by OBJ-SET |
| Main flow | 1. Switch on → confirm dialog "Show adult stories?" / "Only turn this on if you are 18 or older. 18+ stories will appear in the lists." 2. "I am 18 or older, show 18+ stories" → `enable()`. 3. Sync saves to the account (WF-MAT-03 step 3) |
| Alternative flows | A1 "Keep hidden" → switch stays off. A2 Switch off → `disable()` immediately |
| Exception flows | — |
| Success criteria | Same store as the header and gate (one source of truth) |
| Postconditions | As WF-MAT-01 |
| Affected objects | OBJ-MAT, OBJ-SET |
| Related screens | SCR-SET-* (owned by OBJ-SET), SCR-MAT-01 |
| Status | Verified (`packages/features/src/settings/screens/settings-screen.tsx:152-171`, `settings/strings.en.ts:23-31`) |
