# OBJ-RANK — Workflows

### WF-RANK-01 — View the ranking for a period
| Field | Value |
| --- | --- |
| User goal | See the most popular stories for today/week/month/all time |
| Trigger | "See rankings" on SCR-HOME-01, a shared `/ranking?period=` link, or sitemap/search engines (`/ranking` is indexed and in the sitemap) |
| Preconditions | — |
| Main flow | 1. Page opens on the URL period (default "This week"). 2. Skeleton grid, then ranked cards with badge and in-period numbers; "Updated … ago" note. 3. Reader picks another period tab → URL replaced, that period loads (own cache). 4. Scroll / "Load more" continues numbering. 5. Card click → story page. |
| Alternative flows | 1a. Unknown period → week. 2a. No row in `ranking_state` → no note. |
| Exception flows | First page fails → "Couldn't load the ranking" + "Try again". Later page fails → silent (U-SRCH-01). Empty → "No ranking yet / Once people read and vote, stories will appear here." |
| Success criteria | Order matches score; private/deleted/suspended stories never shown |
| Postconditions | — |
| Affected objects | OBJ-RANK, OBJ-STORY |
| Related screens | SCR-RANK-01 → SCR-STORY-01 |
| Status | Verified (`ranking/ranking.test.tsx:239-349`, `docs/WBS.md:208` browser check) |

### WF-RANK-02 — Refresh the ranking snapshot (system)
| Field | Value |
| --- | --- |
| User goal | Keep numbers current without blocking readers |
| Trigger | pg_cron every 5 minutes |
| Preconditions | pg_cron available |
| Main flow | 1. Try advisory lock; 2. `REFRESH … CONCURRENTLY`; 3. update `ranking_state`; 4. return row count. |
| Alternative flows | Lock held → return NULL (skip). |
| Exception flows | pg_cron missing → migration NOTICE; refresh must be run by another runner (BR-JOB-*) |
| Success criteria | Readers never wait on the refresh (verified by a concurrency test, `docs/WBS.md:208`) |
| Postconditions | New snapshot + freshness |
| Affected objects | OBJ-RANK, OBJ-JOB |
| Related screens | SCR-RANK-01 (freshness note) |
| Status | Verified |
