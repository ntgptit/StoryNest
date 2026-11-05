# OBJ-READ — Chapter reader & reader preferences: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-READ` |
| Name | Chapter reader and reader preferences |
| Business purpose | Render the currently published version of a chapter in a comfortable, accessible reading column. Move between chapters. Let readers tune typography and background on their device and keep it with their account. |
| User goals | Read a chapter, jump to the next or previous one or any chapter, adjust font size, line spacing, font and theme, and reach comments, vote and report. |
| Actors / roles | Guest, Member, Story team, Moderator, Crawler |
| Related entities | `chapters`, `chapter_versions` (via `published_version_id`, FK `fk_chapter_published_version`), `chapter_version_blocks`, `chapter_blocks`, `user_reader_preferences`; helpers `can_read_chapter()`, `is_live_version()`; localStorage `storynest.readerPreferences` |
| Dependencies | OBJ-STORY (story visibility BR-STORY-002…009, chapter list BR-STORY-010), OBJ-PROG (position, reads), OBJ-VOTE (vote button), OBJ-CMT (comment thread and inline paragraph comments, `BR-CMT-*`, screen SCR-CMT-01), OBJ-MOD (report), OBJ-MAT (adult gate), OBJ-EDT (publish creates the snapshot, `BR-EDT-*`), OBJ-CHM (archive / slug rename, `BR-CHM-*`), OBJ-SET (settings screen reuses the preferences sheet), OBJ-SEO |

### Rule index

| ID | Name | Status |
| --- | --- | --- |
| [BR-READ-001](#br-read-001--chapter-readability) | Chapter readability | Verified |
| [BR-READ-002](#br-read-002--unavailable-chapter-is-a-real-404) | Unavailable chapter is a real 404 | Verified |
| [BR-READ-003](#br-read-003--chapter-url-redirects) | Chapter URL redirects | Verified |
| [BR-READ-004](#br-read-004--readers-see-only-the-live-snapshot) | Readers see only the live snapshot | Verified |
| [BR-READ-005](#br-read-005--block-types-and-order) | Block types and order | Verified |
| [BR-READ-006](#br-read-006--inline-marks-and-safe-rendering) | Inline marks and safe rendering | Verified |
| [BR-READ-007](#br-read-007--stable-block-anchors) | Stable block anchors | Verified |
| [BR-READ-008](#br-read-008--previous--next-chapter) | Previous / next chapter | Verified |
| [BR-READ-009](#br-read-009--table-of-contents) | Table of contents | Verified |
| [BR-READ-010](#br-read-010--adult-gate-before-any-text) | Adult gate before any text | Verified |
| [BR-READ-011](#br-read-011--chapter-metadata-and-indexing) | Chapter metadata and indexing | Verified |
| [BR-READ-012](#br-read-012--empty-chapter) | Empty chapter | Verified |
| [BR-READ-013](#br-read-013--reader-preference-values-and-defaults) | Reader preference values and defaults | Verified |
| [BR-READ-014](#br-read-014--device-copy-of-preferences) | Device copy of preferences | Verified |
| [BR-READ-015](#br-read-015--preferences-apply-only-inside-the-reader-no-flash) | Preferences apply only inside the reader, no flash | Verified |
| [BR-READ-016](#br-read-016--account-copy-and-sync) | Account copy and sync | Verified |
| [BR-READ-017](#br-read-017--account-copy-storage-constraints) | Account copy storage constraints | Verified |
| [BR-READ-018](#br-read-018--reading-measure) | Reading measure | Verified |
| [BR-READ-019](#br-read-019--reading-time-left) | Reading time left | Verified (unit + component tests) |
| [BR-READ-020](#br-read-020--focus-mode-is-a-device-only-setting) | Focus mode is a device-only setting | Verified (unit + component tests) |
| [BR-READ-021](#br-read-021--quote-link-and-landing-highlight) | Quote link and landing highlight | Verified (component tests) |
| [BR-READ-022](#br-read-022--long-stories-chapter-ranges) | Long stories: chapter ranges | Verified (unit + component tests) |
| [BR-READ-023](#br-read-023--end-of-a-finished-story) | End of a finished story | Verified (unit + component tests) |
| [BR-READ-024](#br-read-024--read-aloud-uses-the-devices-speech-engine) | Read aloud uses the device's speech engine | Verified (unit + component tests) |

---

### BR-READ-001 — Chapter readability
| Field | Value |
| --- | --- |
| Description | A chapter is readable by the public when it is `published`, not deleted, **and** its story is readable (public/unlisted, not draft, not deleted, BR-STORY-002…004). The story team and moderators can read every chapter of the story through RLS. |
| Preconditions | — |
| Conditions | `can_read_chapter(id)` |
| Expected behavior | The reader query additionally requires `status = 'published'` and `deleted_at IS NULL`, so **in the public reader even the team sees only published chapters**. Drafts are previewed in the studio (OBJ-HIST). |
| Exceptions | `scheduled` chapters become readable only when the publish job flips them to `published` (`BR-EDT-*`). |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261103000100_auth_and_rls.sql:103-112,232`, `packages/features/src/reader/api/reader.api.ts:14-36`, `supabase/migrations/20261103000000_init_schema.sql:101-113`, `supabase/tests/10_rls.test.sql:92,125,141` |
| Status | Verified (SQL test) |

### BR-READ-002 — Unavailable chapter is a real 404
| Field | Value |
| --- | --- |
| Description | Missing, draft, scheduled, archived or soft-deleted chapters, chapters of a hidden story, a non-UUID story id and an empty slug all look the same. |
| Preconditions | — |
| Conditions | `getChapterContent` → `null`, or `getStory` → `null`. |
| Expected behavior | Server: `notFound()` → HTTP 404; metadata = fallback title "Chương", `robots: {index:false}`. Client-rendered: "Chapter not found" / "The chapter doesn't exist, isn't published, or has been removed." (vi `readerText.notFound`). Archiving a chapter takes it off the shelf immediately (published pointer cleared, `BR-CHM-*`). |
| Exceptions | Load error ≠ not found: the server returns `undefined`, the page renders and the client retries, then shows "Couldn't load the chapter" + "Try again". |
| Related screens | SCR-READ-01 |
| Evidence | `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:21,38-47`, `apps/web/src/lib/story/load-chapter.ts:9-27`, `packages/features/src/reader/screens/reader-screen.tsx:66-83`, `packages/features/src/reader/strings.en.ts:59-67`, `supabase/migrations/20261104000400_chapter_management.sql:16-19`, `apps/web/src/lib/story/load-chapter.test.ts:28-33`, `packages/features/src/reader/reader.test.tsx:184,374` |
| Status | Verified |

### BR-READ-003 — Chapter URL redirects
| Field | Value |
| --- | --- |
| Description | The story part of a chapter URL is canonicalised. The chapter slug is not. |
| Preconditions | Chapter and story found. |
| Conditions | URL story slug ≠ current story slug. |
| Expected behavior | 308 to `/story/{id}/{currentSlug}/{chapterSlug}`. Canonical = `/story/{id}/{slug}/{chapter.slug}`. |
| Exceptions | A **renamed chapter slug** has no redirect: the old URL 404s (the studio warns "Old links to this chapter will stop working.", F-STORY-03). |
| Related screens | SCR-READ-01 |
| Evidence | `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:28,47`, `packages/features/src/studio/strings.en.ts:43-44` |
| Status | Verified |

### BR-READ-004 — Readers see only the live snapshot
| Field | Value |
| --- | --- |
| Description | The reader shows the chapter's **currently published version** (title, word count, blocks), never the autosaved draft or an older version. |
| Preconditions | — |
| Conditions | `chapter_versions` / `chapter_version_blocks` are readable by non-editors only when `is_live_version()`. |
| Expected behavior | One query loads the chapter plus `version:chapter_versions!fk_chapter_published_version(title, word_count, blocks:chapter_version_blocks(...))`. Republishing replaces the content on the next load. A chapter row without a version is treated as not readable. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/api/reader.api.ts:7-36`, `supabase/migrations/20261103000100_auth_and_rls.sql:118-128,255-258`, `packages/features/src/reader/reader.test.tsx:164` |
| Status | Verified |

### BR-READ-005 — Block types and order
| Field | Value |
| --- | --- |
| Description | Blocks are rendered in `sort_order`. Supported types: `paragraph`, `heading` (rendered as h2), `image`, `divider` (hr). |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Unknown block types are skipped, so the rest of the chapter still renders. An image block without a storage key is skipped. An image whose URL cannot be resolved renders nothing. Images are lazy-loaded with `alt=""` (U-READ-02). Paragraph text keeps line breaks (`whitespace-pre-line`). |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/model/chapter.ts:61-79`, `packages/features/src/reader/components/block-view.tsx:17-42`, `supabase/migrations/20261103000000_init_schema.sql:156-157`, `packages/features/src/reader/reader.test.tsx:99` |
| Status | Verified |

### BR-READ-006 — Inline marks and safe rendering
| Field | Value |
| --- | --- |
| Description | Inline formatting comes from `rich_text = {"marks":[{type,from,to}]}` with `type ∈ bold/italic/underline/strike` and half-open UTF-16 ranges. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Text is cut at every mark boundary. Marks may overlap. Ranges are clamped to the text, and empty or inverted ranges are ignored. Malformed marks are dropped and the text still renders. Rendering uses React text nodes wrapped in `strong/em/u/s`: **nothing from the database becomes HTML**. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/model/chapter.ts:21-59,93-119`, `packages/features/src/reader/components/rich-text.tsx:4-22`, `packages/features/src/reader/reader.test.tsx:54-96,364` |
| Status | Verified |

### BR-READ-007 — Stable block anchors
| Field | Value |
| --- | --- |
| Description | Every block element has `id="b-{block_id}"`. Block ids are permanent and never recycled. The comments section has `id="comments"`. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | `#b-<id>` deep links scroll to the block (with `scroll-mt-20` below the sticky toolbar). A hash in the URL takes priority over restoring the saved position ([BR-PROG-007](../reading-progress/business-rules.md#br-prog-007--restore-on-open)). Notification links to replies use `#comments` or a block anchor (`BR-NOTI-*`). Inline paragraph comments attach to the same block ids (`BR-CMT-*`). |
| Exceptions | Anchors exist only after the adult gate is passed (Inferred). |
| Related screens | SCR-READ-01, SCR-CMT-01 |
| Evidence | `packages/features/src/reader/model/chapter.ts:133-139`, `packages/features/src/reader/components/block-view.tsx:33`, `packages/features/src/reader/screens/reader-screen.tsx:117-121`, `supabase/migrations/20261103000000_init_schema.sql:115`, `packages/features/src/notifications/model/notification.ts:92-99`, `packages/features/src/reader/reader.test.tsx:123` |
| Status | Verified |

### BR-READ-008 — Previous / next chapter
| Field | Value |
| --- | --- |
| Description | Neighbours come from the chapter's position in the **published** chapter list (BR-STORY-010), so gaps in numbering are skipped. |
| Preconditions | Story and chapter list loaded. |
| Conditions | First chapter → no previous. Last → no next. Slug not in the list → neither. |
| Expected behavior | Links "Previous chapter" (`rel="prev"`) and "Next chapter" (`rel="next"`). A missing neighbour renders a disabled placeholder (`aria-disabled`, 50 % opacity) so the layout does not jump. The nav is at the very end of the article, below the comments (U-READ-01). No keyboard shortcuts. |
| Exceptions | Story query returned nothing → no nav or TOC (defensive; the server already 404s). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/model/chapter.ts:121-131`, `packages/features/src/reader/components/chapter-nav.tsx:9-47`, `packages/features/src/reader/screens/reader-screen.tsx:169`, `packages/features/src/reader/reader.test.tsx:138,331` |
| Status | Verified |

### BR-READ-009 — Table of contents
| Field | Value |
| --- | --- |
| Description | "Contents" opens a right-side sheet listing every published chapter ("Chapter N" + title). The current chapter has `aria-current="page"` and is highlighted. |
| Preconditions | Story loaded. |
| Conditions | — |
| Expected behavior | Choosing a chapter navigates to it. The sheet is a Radix dialog (Esc / overlay closes it, focus is trapped). |
| Exceptions | Unbounded list (F-STORY-02). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/components/toc-sheet.tsx:19-85`, `packages/features/src/reader/strings.en.ts:4` |
| Status | Verified |

### BR-READ-010 — Adult gate before any text
| Field | Value |
| --- | --- |
| Description | Whether a story is adult comes from the story, so no chapter text may show before the story is known. |
| Preconditions | — |
| Conditions | `chapter.isPending || story.isPending` → skeleton. `story.isMature` → `AdultGate`. |
| Expected behavior | Skeleton until both are loaded. Mature + not opted in → gate only (`BR-MAT-009`). Also never indexed (BR-STORY-008). |
| Exceptions | If the story resolves to `null` while the chapter exists, the gate defaults to not mature (Inferred edge; the server 404s first). |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/screens/reader-screen.tsx:64-65,86,101`, `packages/features/src/reader/reader.test.tsx:283-328` |
| Status | Verified |

### BR-READ-011 — Chapter metadata and indexing
| Field | Value |
| --- | --- |
| Description | Page title "{chapter} · {story}". Description = excerpt (160) of the first paragraph block. Canonical as in BR-READ-003. OG type `article`. |
| Preconditions | Found. |
| Conditions | Indexable iff the story is indexable (BR-STORY-008). |
| Expected behavior | Indexable → `Chapter` JSON-LD (`position` = chapter number, `isPartOf` Book). Otherwise → `noindex,nofollow`, no JSON-LD. The OG image shows the chapter title plus "story · author". |
| Exceptions | Server metadata is Vietnamese-only by design (`apps/web/src/lib/strings.ts:1-2`). |
| Related screens | SCR-READ-01 |
| Evidence | `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:18-36,52-61`, `.../[chapterSlug]/opengraph-image.tsx:12-26`, `apps/web/src/app/(main)/story/[id]/[slug]/page.test.tsx:105-135` |
| Status | Verified |

### BR-READ-012 — Empty chapter
| Field | Value |
| --- | --- |
| Description | A published chapter with zero renderable blocks shows "This chapter has no content yet." (vi "Chương này chưa có nội dung."). The end marker, vote, report, comments and nav still render. |
| Preconditions | — |
| Conditions | `blocks.length === 0` (after unknown or invalid blocks are dropped) |
| Expected behavior | As described |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/screens/reader-screen.tsx:102-108`, `packages/features/src/reader/strings.en.ts:58` |
| Status | Verified |

### BR-READ-013 — Reader preference values and defaults
| Field | Value |
| --- | --- |
| Description | Four settings, each from a closed list. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | **Font size** `s / m / l / xl` = Small 1rem / Medium 1.125rem / Large 1.3125rem / Extra large 1.5rem (default **m**), changed by −/+ steps that stop at the ends (buttons disabled there). **Line spacing** `compact 1.5 / normal 1.75 / relaxed 2` (default **normal**). **Font** `sans / serif` (default **sans**). **Background** `site` (follows the app theme) / `light` / `sepia` / `dark` (default **site**). Any missing or invalid field falls back to its default on its own; unknown keys are dropped. |
| Exceptions | — |
| Related screens | SCR-READ-01 (settings sheet); settings screen (OBJ-SET) |
| Evidence | `packages/validation/src/reader-preferences.ts:6-52`, `packages/features/src/reader/model/preferences.ts:33-41`, `packages/design-tokens/src/tokens.css:95-128`, `packages/features/src/reader/strings.en.ts:28-41`, `packages/features/src/reader/preferences.test.tsx:42,125,197,327` |
| Status | Verified |

### BR-READ-014 — Device copy of preferences
| Field | Value |
| --- | --- |
| Description | The device copy (localStorage key `storynest.readerPreferences`) is the working copy. It works for guests. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Every change is written at once and applied at once (external store + listeners). Other tabs follow through the `storage` event. Corrupt JSON → defaults. Storage blocked → kept in memory for the page only. |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/model/preferences-store.ts:4-67`, `packages/features/src/reader/hooks/use-reader-preferences.ts:16-27`, `packages/features/src/reader/preferences.test.tsx:115-145` |
| Status | Verified |

### BR-READ-015 — Preferences apply only inside the reader, no flash
| Field | Value |
| --- | --- |
| Description | Preferences are applied as `data-reader-size / -leading / -font / -theme` attributes on `<html>`, only while a chapter page is open. |
| Preconditions | — |
| Conditions | Full page load of a path matching `CHAPTER_PATH_PATTERN` (`/story/x/y/z`), or `ReaderScreen` mounted. |
| Expected behavior | An inline bootstrap script in the root layout `<head>` applies the stored, validated values before first paint (no flash of the wrong background). The reader then keeps them in sync through a layout effect and **removes them on unmount**, so the site look returns. The theme reskins the whole page, header and nav included. Size, spacing and font apply to `.reader-text`. |
| Exceptions | Bootstrap failures are swallowed (try/catch); the defaults apply. |
| Related screens | SCR-READ-01 |
| Evidence | `apps/web/src/app/layout.tsx:35-41`, `apps/web/src/lib/routes.ts:1-5`, `packages/features/src/reader/model/preferences.ts:14-31,51-73`, `packages/features/src/reader/hooks/use-reader-preferences.ts:29-45`, `packages/design-tokens/src/tokens.css:84-88,143-146`, `packages/features/src/reader/preferences.test.tsx:54,66-112,148` |
| Status | Verified (WBS 2.7 runtime check incl. JS blocked) |

### BR-READ-016 — Account copy and sync
| Field | Value |
| --- | --- |
| Description | A signed-in reader's preferences follow them across devices. |
| Preconditions | Authenticated. The sync hook is mounted (reader screen or settings screen). |
| Conditions | The account row has ≥ 1 valid setting (`hasReaderPreferences`). |
| Expected behavior | 1. When the account copy exists, it **wins** and replaces the device copy. 2. Otherwise, a customised (non-default) device copy is uploaded. 3. After that, every device change is upserted 1.5 s after the last change (debounced), and flushed when leaving. Saves are best effort: failures are ignored and the next change retries. Guests: nothing. |
| Exceptions | Guest customisation is overwritten on sign-in when the account already has a copy. Concurrent devices: last write wins (Inferred). |
| Related screens | SCR-READ-01, settings screen (OBJ-SET) |
| Evidence | `packages/features/src/reader/hooks/use-reader-preferences-sync.ts:16-71`, `packages/features/src/reader/api/preferences.api.ts:5-19`, `packages/features/src/settings/screens/settings-screen.tsx:117`, `packages/features/src/reader/preferences.test.tsx:257-324` |
| Status | Verified (WBS 2.7 cross-device runtime check) |

### BR-READ-017 — Account copy storage constraints
| Field | Value |
| --- | --- |
| Description | `user_reader_preferences`: one row per user (PK `user_id`), `preferences` must be a JSON object ≤ 512 bytes, RLS own-row only for every operation, and no anon access. `{}` means "nothing saved". |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Upsert `onConflict user_id`. Moving a row to another user is blocked by RLS. The row is deleted with the account (cascade). |
| Exceptions | — |
| Related screens | — |
| Evidence | `supabase/migrations/20261104000200_reader_preferences.sql:1-31`, `supabase/tests/80_reader_preferences.test.sql:1-20` |
| Status | Verified (SQL test) |

### BR-READ-018 — Reading measure
| Field | Value |
| --- | --- |
| Description | The text column is `max-width: var(--reader-measure)` = 66ch, so it scales with the chosen font size. |
| Preconditions | — |
| Conditions | — |
| Expected behavior | About 66 characters per line at any size (WBS 2.4 acceptance). |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/design-tokens/src/tokens.css:69-71`, `packages/features/src/reader/screens/reader-screen.tsx:127` |
| Status | Verified |

### BR-READ-019 — Reading time left
| Field | Value |
| --- | --- |
| Description | The reader toolbar shows how long the rest of the chapter takes to read ("N phút còn lại" / "N min left"; "N phút" on phones), with a ring that fills and turns into a check at the end. |
| Preconditions | — |
| Conditions | Reading speed `READING_WORDS_PER_MINUTE` = **200 words per minute**, words counted like the chapter's `word_count` (whitespace-separated, so a Vietnamese syllable is one word). |
| Expected behavior | Minutes left = ceil(`word_count` × (1 − share read) / 200), at least 1 until finished. The share read is the page scroll measured up to the **end of the chapter text** (not the comments after it): 0 at the top, 1 once the end of the text is in view; ≥ 98.5 % counts as finished ("Đã đọc hết" / "Finished"). A chapter with 0 words shows finished. Not a live region (it changes while scrolling). |
| Exceptions | It is an estimate for display only; nothing is stored. |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/model/reading-time.ts`, `packages/features/src/reader/screens/reader-screen.tsx` (`TimeLeft`), `packages/ui/src/widgets/reading-time-left.tsx`, `packages/ui/src/widgets/reading-progress.tsx` (`useScrollProgress`), `packages/features/src/reader/reader.test.tsx` ("timeLeft", "reading tools") |
| Status | Verified (unit + component tests) |

### BR-READ-020 — Focus mode is a device-only setting
| Field | Value |
| --- | --- |
| Description | Optional "Focus mode" in the Reading options sheet dims every block except the one at the reading line (40 % of the viewport height). Off by default. |
| Preconditions | — |
| Conditions | localStorage key `storynest.readerFocus` = `"1"` means on; missing or anything else means off. |
| Expected behavior | It is **not** one of the four reader preferences: it is never written to `user_reader_preferences` (BR-READ-016/017, fixed keys) and does not follow the account to other devices. While on, the focused block follows the page scroll (touch included) and ↑/↓ move one block and glide it to the reading line (not while typing, with a modifier key, or while a dialog has focus). Dividers are skipped. Blocked storage keeps the choice for the page only. |
| Exceptions | — |
| Related screens | SCR-READ-01 (settings sheet), and wherever the sheet is reused (preview, settings) |
| Evidence | `packages/features/src/reader/model/focus-mode.ts`, `packages/features/src/reader/hooks/use-reader-focus.ts`, `packages/features/src/reader/components/reader-settings-sheet.tsx`, `packages/features/src/reader/reader.test.tsx` ("focus mode") |
| Status | Verified (unit + component tests) |

### BR-READ-021 — Quote link and landing highlight
| Field | Value |
| --- | --- |
| Description | Selecting text inside one paragraph or heading shows quote tools: "Copy quote" puts `“quote”`, `— story, Chapter N` and the absolute link to that block (`chapterHref` + `#b-{id}` on the platform's share origin, as the Share dialog) on the clipboard; "Comment on paragraph" opens that block's comment sheet. A selection across blocks shows nothing. No highlight is stored. |
| Preconditions | The story is known (the link needs its slug). |
| Conditions | — |
| Expected behavior | When the reader lands on a block, by a `#b-{id}` deep link (the block is scrolled into view if it is not) or by the restored reading position (BR-PROG), its text gets a one-time highlighter sweep (2.8 s; a static tint under reduced motion). |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/components/reader-blocks.tsx`, `packages/features/src/reader/screens/reader-screen.tsx` (`quoteText`), `packages/features/src/progress/hooks/use-reading-tracker.ts` (`onRestored`), `packages/ui/src/widgets/selection-toolbar.tsx`, `packages/ui/src/widgets/highlight-sweep.tsx`, `packages/features/src/reader/reader.test.tsx` |
| Status | Verified (component tests) |

### BR-READ-022 — Long stories: chapter ranges
| Field | Value |
| --- | --- |
| Description | A story with more than 50 published chapters is "long". Its chapters are cut, in reading order (by position, not number), into ranges of 50, or of the smallest multiple of 50 that keeps the count at 20 ranges or fewer. |
| Preconditions | The published chapter list is loaded. |
| Conditions | — |
| Expected behavior | The story page shows the ranges as an accordion ("Chapters 1–50", one open at a time; until the reader picks one, the range of the continue chapter, else the first). The reader's contents sheet adds a scrub rail with the first chapter number of each range. Stories of 50 chapters or fewer keep the plain list. |
| Exceptions | — |
| Related screens | SCR-STORY-01, SCR-READ-01 |
| Evidence | `packages/features/src/story/model/chapter-ranges.ts`, `packages/features/src/story/screens/story-screen.tsx` (`ChapterRangeList`), `packages/features/src/reader/components/toc-sheet.tsx`, `packages/features/src/story/story.test.tsx` |
| Status | Verified (unit + component tests) |

### BR-READ-023 — End of a finished story
| Field | Value |
| --- | --- |
| Description | The reader is at the end of the whole story only on the last published chapter of a story whose status is `completed` (the latest chapter of an ongoing or paused story is not an end). There it is congratulated ("You finished the story!", Add to list) and offered similar stories. |
| Preconditions | Story and chapter list loaded. |
| Conditions | — |
| Expected behavior | The celebration plays once, when the reader scrolls the card into view; never on page load. Nothing is stored (no streak or goal: that would need backend). |
| Exceptions | — |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/model/chapter.ts` (`isStoryFinished`), `packages/features/src/reader/components/story-finished.tsx`, `packages/features/src/reader/reader.test.tsx` |
| Status | Verified (unit + component tests) |

### BR-READ-024 — Read aloud uses the device's speech engine
| Field | Value |
| --- | --- |
| Description | "Read this chapter aloud" speaks the chapter's paragraphs and headings with the browser's Web Speech API, in the app language (`vi-VN` / `en-US`), one block per utterance. Nothing is sent to a server; voices are those of the device. |
| Preconditions | `speechSynthesis` exists (the button is hidden otherwise, e.g. some Android WebViews) and the chapter has text. |
| Conditions | — |
| Expected behavior | Play starts at the first block whose bottom is below the reader bar, or at the block where the last pause stopped. Pause cancels speech. Leaving the chapter stops it. |
| Exceptions | A device without a voice for the language reads with its default voice. |
| Related screens | SCR-READ-01 |
| Evidence | `packages/features/src/reader/hooks/use-read-aloud.ts`, `packages/features/src/reader/model/read-aloud.ts`, `packages/features/src/reader/reader.test.tsx` |
| Status | Verified (unit + component tests) |

### BR-READ-025 — Personal highlights (hand-drawn marks, batch 4 · community4, Lucian 392)
| Field | Value |
| --- | --- |
| Description | A signed-in reader selects words inside one paragraph or heading and marks them with a pen: underline, circle, box or strike. Marks are private (RLS: own rows only; guests have no grant) and drawn over the text, stroke by stroke when made. |
| Preconditions | Active account; the chapter is readable; the block is a paragraph/heading of the CURRENT published version. |
| Conditions | Keyed by chapter + block + range `[start, end)` in UTF-16 code units of the block text (the unit of `marks`); ≤ 2000 units; at most `abuse_limits.highlights_per_chapter` (500) per reader and chapter. The same range again only changes the style (`add_chapter_highlight` returns the same id). |
| Expected behavior | **Re-publish rule**: the server stores md5 of the block text at creation. A highlight is live while the current published version has that block with identical text (formatting, moving the paragraph and edits elsewhere keep it); otherwise `list_my_highlights` marks it `stale`: it is not drawn but kept, and becomes live again if the identical text returns. The reader sees "N old marks no longer match…" with "Delete old marks". "Remove mark" in the selection toolbar deletes the marks under the selection (direct DELETE of own rows). |
| Exceptions | 42501 not signed in / not active; PT404 chapter not readable; 22023 unknown or non-text block, range outside the text, unknown style, limit (HINT highlight_limit). Rollback: see the migration header. |
| Related screens | SCR-READ-01 |
| Evidence | `supabase/migrations/20261106010200_chapter_highlights.sql`, `supabase/tests/370_chapter_highlights.test.sql`, `packages/ui/src/widgets/hand-drawn-marks.tsx`, `packages/features/src/reader/components/reader-blocks.tsx`, `packages/features/src/reader/highlights.test.tsx` |
| Status | Verified (SQL + unit tests); the toolbar integration in the reader is not covered by a component test |
