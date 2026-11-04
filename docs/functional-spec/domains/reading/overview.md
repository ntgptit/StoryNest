# D-READING — Reading domain overview

## Purpose

Everything a reader does between finding a story and finishing it: the public story page, the chapter reader with its typography preferences, and the memory of where each reader is (progress), plus deduplicated read counting. This domain **owns the authoritative story and chapter visibility rules** (BR-STORY-002…006, BR-READ-001…002). Discovery, library, community and trust-safety link to these rules instead of redefining them.

## Actors

| Actor | Description | Key capabilities here |
| --- | --- | --- |
| Guest | Not signed in (`anon`) | Read public and unlisted stories and chapters, use reader preferences on the device, counted as reads via an anonymous id. Sent to `/login?next=` for follow, save, vote and report |
| Member | Signed in, `account_status = 'active'` | Everything a guest can, plus saved progress and "Continue reading", account-synced preferences, follow/save/list/vote/comment/report |
| Story team | Owner, `co_author`, `editor` of a story (`story_role()`) | Can open their private or draft story on the public page (noindex). In the public reader they still see only published chapters |
| Moderator | `app_metadata.role = 'moderator'` | Reads any story or chapter (RLS). Can remove stories (`BR-MOD-*`) |
| Crawler / link preview | Anonymous bot | Gets metadata, JSON-LD and OG images only for public, non-mature stories |
| System jobs | pg_cron | `aggregate_reads` (every minute), `purge_read_events` (daily) |

## Business objects

| ID | Name | Folder | Screens | Rules | Workflows |
| --- | --- | --- | --- | --- | --- |
| `OBJ-STORY` | Public story page and visibility | [story/](story/business-rules.md) | [SCR-STORY-01 Story page](story/screens/story-page.md) `/story/[id]/[slug]` | BR-STORY-001…016 | [WF-STORY-01…05](story/workflows.md) |
| `OBJ-READ` | Chapter reader and reader preferences | [chapter-reader/](chapter-reader/business-rules.md) | [SCR-READ-01 Chapter reader](chapter-reader/screens/chapter-reader.md) `/story/[id]/[slug]/[chapterSlug]` | BR-READ-001…018 | [WF-READ-01…06](chapter-reader/workflows.md) |
| `OBJ-PROG` | Reading progress and read counting | [reading-progress/](reading-progress/business-rules.md) | None of its own (SCR-READ-01, SCR-STORY-01, SCR-LIB-01) | BR-PROG-001…015 | [WF-PROG-01…05](reading-progress/workflows.md) |

Related object owned elsewhere but documented by the same analysis: `OBJ-VOTE` → [community/vote](../community/vote/business-rules.md) (button on SCR-READ-01).

## Visibility matrix (authoritative summary)

| Story state | Guest / member (not team) | Team (owner, co_author, editor) | Moderator | Discovery listings | Indexed |
| --- | --- | --- | --- | --- | --- |
| public, status ≠ draft | Story + published chapters | Same | Same | Yes | Yes, unless mature |
| unlisted, status ≠ draft | Story + published chapters (by link) | Same | Same | No | No |
| private | 404 | Story page + published chapters | Same as team | No | No |
| any visibility, status = draft | 404 | Story page + published chapters | Same as team | No | No |
| deleted (`deleted_at`) | 404 | 404 on the public page (studio only) | 404 on the public page | No | No |
| Chapter draft / scheduled / archived / deleted | 404 | 404 in the reader (studio preview only) | 404 in the reader | — | — |

Sources: `supabase/migrations/20261103000100_auth_and_rls.sql:93-112,198-202`, `packages/features/src/story/api/story.api.ts:26-55`, `packages/features/src/reader/api/reader.api.ts:18-36`, `packages/features/src/story/model/story-detail.ts:24-26`.

## Cross-domain dependencies

| Depends on / used by | Object | What | Rule IDs |
| --- | --- | --- | --- |
| D-TRUST-SAFETY | OBJ-MAT | Adult gate on the story page and reader | `BR-MAT-*` |
| D-TRUST-SAFETY | OBJ-MOD | Report button (story, chapter). Moderator removal = soft delete | `BR-MOD-*` |
| D-LIBRARY | OBJ-LIB | Follow and Save buttons on the story page. Library "Reading" tab reads `user_story_progress` | `BR-LIB-*` |
| D-LIBRARY | OBJ-LIST | Add-to-list button | `BR-LIST-*` |
| D-COMMUNITY | OBJ-VOTE | Vote button in the reader | [BR-VOTE-*](../community/vote/business-rules.md) |
| D-COMMUNITY | OBJ-CMT | Chapter thread and inline paragraph comments in the reader (SCR-CMT-01), anchored on block ids | `BR-CMT-*` |
| D-COMMUNITY | OBJ-NOTI | Notification links into chapters (`#comments`, block anchors) | `BR-NOTI-*` |
| D-DISCOVERY | OBJ-HOME, OBJ-TAX, OBJ-SRCH, OBJ-RANK, OBJ-REC, OBJ-AUTHOR | Apply BR-STORY-007. Tag links, author link, similar stories on the story page. Read events feed rankings and recommendations | `BR-RANK-*`, `BR-REC-*`, … |
| D-STUDIO | OBJ-STM, OBJ-CHM, OBJ-EDT, OBJ-HIST, OBJ-STAT | Edit visibility, status and slug. Archive and rename chapters. Publish snapshots. Preview drafts. Read and vote analytics | `BR-STM-*`, `BR-CHM-*`, `BR-EDT-*`, `BR-STAT-*` |
| D-ACCOUNT | OBJ-AUTH, OBJ-SET | Login with `next=` return. The settings screen hosts the reader preferences sheet and sync | `BR-AUTH-*`, `BR-SET-*` |
| D-PLATFORM | OBJ-SEO, OBJ-JOB, OBJ-I18N | Metadata, JSON-LD, OG images. pg_cron jobs. vi/en strings | — |

## Domain-level open questions

| ID | Question | Why it matters | Evidence |
| --- | --- | --- | --- |
| Q-STORY-01 | Should stories by a suspended or deactivated author stay publicly readable? | Moderation policy. Today they stay readable and the author shows as "Anonymous author" | `supabase/migrations/20261103000100_auth_and_rls.sql:93-101,182-184` |
| Q-READ-01 | Should "Chapter N" be the position among published chapters, or `sort_order` (gaps)? | The numbering readers see. The model comment says "1-based position" | `packages/features/src/story/model/story-detail.ts:40,51` |
| Q-PROG-01 | Should "Continue reading" point at the last opened chapter or the furthest one read? | Re-reading an old chapter moves the pointer back | `supabase/migrations/20261104000000_save_reading_progress.sql:63-66` |
| Q-PROG-02 | Should reads by the author or team count? | Read counts and rankings can be inflated by authors | `supabase/migrations/20261104000100_chapter_reads.sql:55-66` |
| Q-VOTE-01 | (community) Should authors vote for their own chapters, or on unpublished ones? | Rankings weight votes 5× | `supabase/migrations/20261103000100_auth_and_rls.sql:264-265` |

## Notable findings (summary)

| ID | Category | Priority | Title |
| --- | --- | --- | --- |
| F-PROG-01 | A | P2 | Chapter completion is measured over the whole page, comments included |
| U-READ-01 | C | P2 | Next-chapter navigation is buried below the comments; no keyboard shortcuts |
| F-PROG-02 | A | P3 | The story page and the library use different "continue" targets |
| F-PROG-03 | A | P3 | The story-progress cache is not per user and survives sign-out |
| F-PROG-04 | D | P3 | Guests have no local reading progress |
| U-READ-02 | C | P3 | Chapter images have no alt text |
| U-READ-03 | C | P3 | Chapter numbers have gaps (`sort_order`) |
| F-STORY-01 | A | P3 | The Report button is shown to the author on their own content |
| F-STORY-02 | B | P3 | Unbounded chapter list and TOC |
| F-STORY-03 | D | P3 | `/story/{id}` short link and chapter-slug redirects |
| F-STORY-04 | A | P3 | JSON-LD author URL `/author/` for a hidden author |
| U-STORY-01 | C | P3 | Follow/Save and Vote silently vanish on a load error |
| U-STORY-02 | C | P3 | No dates on the story page or chapter list |
