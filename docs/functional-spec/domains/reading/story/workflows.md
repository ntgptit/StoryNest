# OBJ-STORY — Workflows

| ID | Name | Status |
| --- | --- | --- |
| [WF-STORY-01](#wf-story-01--open-a-story-page) | Open a story page | Verified |
| [WF-STORY-02](#wf-story-02--start-or-continue-reading) | Start or continue reading | Verified |
| [WF-STORY-03](#wf-story-03--guest-tries-an-engagement-action) | Guest tries an engagement action | Verified |
| [WF-STORY-04](#wf-story-04--crawler-or-link-preview-fetches-a-story) | Crawler or link preview fetches a story | Verified |
| [WF-STORY-05](#wf-story-05--author-changes-visibility-status-or-slug) | Author changes visibility, status or slug (cross-screen) | Verified / Inferred |

---

### WF-STORY-01 — Open a story page
| Field | Value |
| --- | --- |
| User goal | See what a story is about and decide to read it. |
| Trigger | Opening `/story/{id}/{slug}` from a story card, search result, ranking, author page, library, list, notification or an external link. |
| Preconditions | None (public route; not in `PROTECTED_PREFIXES`, `apps/web/src/lib/auth/route-guard.ts:4-12`). |
| Main flow | 1. Server `loadStory(id)` (React `cache`, so metadata and page share one load) prefetches the story and its published chapters into a per-request query client (`apps/web/src/lib/story/load-story.ts:18-34`, `packages/features/src/story/queries.ts:30-41`). 2. `generateMetadata` builds the title, description, canonical, robots and OG (BR-STORY-008). 3. The slug matches, so the page renders JSON-LD (if indexable) and dehydrates the cache into `StoryView` → `StoryScreen` (`page.tsx:45-68`). 4. The client hydrates and shows the header (cover, title, author, badges, stats, CTA, Follow/Save/Add to list, Report), synopsis, tags, chapter list and "similar stories". 5. Signed in: follow/save state and story progress load after the session is known (`use-story-library.ts:25-30`, `use-progress.ts:24-31`). |
| Alternative flows | A1 Stale slug → 308 to the canonical URL, then the main flow (BR-STORY-001). A2 Mature story → adult gate first. Content only after confirming (BR-STORY-009, `BR-MAT-009`). A3 No published chapters → "This story has no published chapters yet.", no CTA. A4 Viewer is the team or a moderator on a private/draft story → page renders, `noindex`, no JSON-LD (BR-STORY-005). |
| Exception flows | E1 Hidden / missing / non-UUID → HTTP 404 (BR-STORY-006). E2 Server load error / Supabase not configured → `story: undefined`, the page renders without a 404 and the client refetches. If that also fails: "Couldn't load the story" + "Try again" (`load-story.ts:26-33`, `story-screen.tsx:42-51`). E3 The chapter list fails while the story loads → story shown, plus "Couldn't load the chapter list" + "Try again" in the chapters section (`story-screen.tsx:154-159`). |
| Success criteria | Correct HTTP status (200 / 308 / 404). The page shows only what the viewer may see. |
| Postconditions | No data change. |
| Affected objects | OBJ-STORY, OBJ-PROG (read), OBJ-LIB (read), OBJ-REC (read), OBJ-SEO |
| Related screens | SCR-STORY-01 |
| Status | Verified (unit tests `page.test.tsx`, `story.test.tsx`; WBS 2.3 runtime check) |

### WF-STORY-02 — Start or continue reading
| Field | Value |
| --- | --- |
| User goal | Jump into the story at the right chapter. |
| Trigger | Pressing the primary CTA, or a chapter row in the list. |
| Preconditions | ≥ 1 published chapter. |
| Main flow | 1. The CTA label and target are resolved (BR-STORY-012 / [BR-PROG-008](../reading-progress/business-rules.md#br-prog-008--continue-reading-target)). 2. Click → client navigation to `/story/{id}/{slug}/{chapterSlug}`. 3. The reader opens ([WF-READ-01](../chapter-reader/workflows.md#wf-read-01--open-a-chapter)). For a signed-in reader with a saved, unfinished position, the reader restores it ([WF-PROG-02](../reading-progress/workflows.md#wf-prog-02--restore-position-on-reopen)). |
| Alternative flows | A1 Guest or never-read story → "Start reading" → first published chapter. A2 Last chapter finished → no continue target → "Start reading" (BR-PROG-008). A3 Chapter row click → that chapter. |
| Exception flows | E1 The progress query fails → treated as no progress ("Start reading"). |
| Success criteria | The reader lands on the expected chapter. |
| Postconditions | None (progress is written by the reader). |
| Affected objects | OBJ-STORY, OBJ-PROG, OBJ-READ |
| Related screens | SCR-STORY-01 → SCR-READ-01 |
| Status | Verified (`story.test.tsx:329-369`) |

### WF-STORY-03 — Guest tries an engagement action
| Field | Value |
| --- | --- |
| User goal | Follow or save a story without an account yet. |
| Trigger | A guest presses Follow or Save to library. |
| Preconditions | Not signed in (`auth.status = unauthenticated`). |
| Main flow | 1. Instead of mutating, the app pushes `/login?next=<encoded current path>` (`story-actions.tsx:22,32,48`). 2. The guest signs in (D-ACCOUNT, `/login`). 3. The login flow returns to `next` (sanitised by `safeRedirectPath`, owned by `BR-AUTH-*`). 4. The story page loads with the member's follow/save state. The guest presses the button again. |
| Alternative flows | Add to list / Report: same idea, owned by `BR-LIST-*` / `BR-MOD-004…006`. |
| Exception flows | — |
| Success criteria | The guest is back on the same story page after sign-in. |
| Postconditions | None until the member presses the button again (the action is not replayed automatically). |
| Affected objects | OBJ-STORY, OBJ-LIB, OBJ-AUTH |
| Related screens | SCR-STORY-01, SCR-AUTH-01 Sign in (D-ACCOUNT) |
| Status | Verified (`library.test.tsx:145`) |

### WF-STORY-04 — Crawler or link preview fetches a story
| Field | Value |
| --- | --- |
| User goal | A search engine or social app shows a correct, permitted preview. |
| Trigger | A GET of the story URL or `/story/{id}/{slug}/opengraph-image`. |
| Preconditions | Anonymous request. |
| Main flow | 1. Same SSR as WF-STORY-01, as anon. 2. Public + not mature → indexable metadata + `Book` JSON-LD with absolute URLs (`page.tsx:55-63`). 3. The OG image renders the cover, title and author name (`opengraph-image.tsx:13-21`). |
| Alternative flows | Unlisted / mature → `noindex,nofollow`, no JSON-LD. Hidden → 404, and the OG image falls back to the site name. |
| Exception flows | Load error → fallback title, `noindex`. |
| Success criteria | No private data leaks to crawlers. Only public, non-mature stories are indexed. |
| Postconditions | — |
| Affected objects | OBJ-STORY, OBJ-SEO |
| Related screens | SCR-STORY-01 |
| Status | Verified (`page.test.tsx:63-102`) |

### WF-STORY-05 — Author changes visibility, status or slug
| Field | Value |
| --- | --- |
| User goal | The author controls who can read the story and how it is addressed. |
| Trigger | The owner or co-author saves story settings in the studio (OBJ-STM). |
| Preconditions | `story_role IN ('owner','co_author')` (`stories_update` policy). |
| Main flow | 1. The studio updates `visibility` / `status` / `slug` / `is_mature` / `deleted_at`. 2. On next load: the story page obeys BR-STORY-002…004/009. Old-slug links 308 to the new slug (BR-STORY-001). 3. Discovery surfaces include or exclude the story (BR-STORY-007). Rankings follow on their refresh schedule (`BR-RANK-*`). |
| Alternative flows | Moderator removal → `deleted_at` set via `remove_story`; the owner cannot undo it (BR-STORY-004). |
| Exception flows | Readers with a cached page keep seeing old data until the 30 s stale time passes or they reload (Inferred from `_shared/query.ts:24`). |
| Success criteria | Access changes take effect on the next request (RLS is evaluated per query). |
| Postconditions | Followers, saves, list items and progress rows are kept. Whether they are still displayed is up to each owning object (`BR-LIB-*`, `BR-LIST-*`). |
| Affected objects | OBJ-STM, OBJ-STORY, discovery objects, OBJ-LIB |
| Related screens | Studio story edit (D-STUDIO), SCR-STORY-01 |
| Status | Verified (RLS) / Inferred (cache lag) |
