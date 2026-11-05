# OBJ-DEV — Developer tools: workflows

## WF-DEV-01 — Review shared widgets in the gallery
| Field | Value |
| --- | --- |
| User goal | (Developer) check a primitive/widget in all states before or after changing it |
| Trigger | Open `http://localhost:3000/dev/gallery` while running `next dev` |
| Preconditions | Development build |
| Main flow | 1. Page renders sections (BR-DEV-004). 2. Developer interacts (submit demo form, open dialogs, fire toasts, scroll infinite list). 3. Resizes window for mobile bottom nav; switches OS theme for dark mode |
| Alternative flows | — |
| Exception flows | E1. Production build → 404 (BR-DEV-001) |
| Success criteria | Every widget visible with tokens applied |
| Postconditions | — |
| Affected objects | OBJ-DEV |
| Related screens | SCR-DEV-01 |
| Status | Verified (code) |
