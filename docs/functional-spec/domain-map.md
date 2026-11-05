# Domain Map

Business domains → business objects → screens, with data ownership and dependencies. Domain names come from the
feature modules in `packages/features/src`, the migrations and the WBS phases — not from table names alone.
Entry point: [README](README.md). ID registry: [CONVENTIONS §3](CONVENTIONS.md#3-identifiers).

## 1. Hierarchy

| Domain | Object | Purpose | Main data (tables / RPCs) | Screens | Rules · Workflows |
| --- | --- | --- | --- | --- | --- |
| [D-ACCOUNT](domains/account/overview.md) | [OBJ-AUTH](domains/account/authentication/business-rules.md) | Sign-up, sign-in, password recovery, session, route guard | `auth.users`, `app_users` (trigger `handle_new_user`), `account_status` | SCR-AUTH-01…04 | 22 · 8 |
| | [OBJ-PRF](domains/account/profile/business-rules.md) | Public identity: username, display name, bio, avatar | `app_users`, bucket `avatars` | SCR-PRF-01, SCR-PRF-02 | 13 · 4 |
| | [OBJ-SET](domains/account/settings/business-rules.md) | Language, notification switches, 18+ choice on the server | `user_settings` | SCR-SET-01 | 9 · 4 |
| [D-DISCOVERY](domains/discovery/overview.md) | [OBJ-HOME](domains/discovery/home/business-rules.md) | Latest-updated feed with filters | `stories` (`idx_stories_discover`) | SCR-HOME-01 | 12 · 4 |
| | [OBJ-TAX](domains/discovery/taxonomy/business-rules.md) | Categories (tree) and controlled tags | `categories`, `tags`, `story_tags`, `set_story_tags` | — (filter of SCR-HOME-01) | 12 · 3 |
| | [OBJ-SRCH](domains/discovery/search/business-rules.md) | Diacritic-insensitive search for stories/authors/tags | `search_*` RPCs, `unaccent` + trigram | SCR-SRCH-01 | 11 · 3 |
| | [OBJ-RANK](domains/discovery/ranking/business-rules.md) | Top stories by period | materialized view `story_rankings`, `ranking_state` | SCR-RANK-01 | 8 · 2 |
| | [OBJ-REC](domains/discovery/recommendations/business-rules.md) | "Why recommended" suggestions | recommendation RPCs | embedded (home, story page) | 8 · 2 |
| | [OBJ-AUTHOR](domains/discovery/author/business-rules.md) | Author page, follow author, followed-authors feed | `user_follows`, `author_profile` | SCR-AUTHOR-01, SCR-AUTHOR-02 | 12 · 3 |
| [D-READING](domains/reading/overview.md) | [OBJ-STORY](domains/reading/story/business-rules.md) | Public story page; **authoritative visibility rules** | `stories`, `chapters`, `story_stats`, `can_read_*` | SCR-STORY-01 | 16 · 5 |
| | [OBJ-READ](domains/reading/chapter-reader/business-rules.md) | Chapter rendering, navigation, reader preferences | `chapter_versions`, `chapter_version_blocks`, `user_reader_preferences` | SCR-READ-01 | 18 · 6 |
| | [OBJ-PROG](domains/reading/reading-progress/business-rules.md) | Progress, continue reading, deduplicated read counting | `user_chapter_progress`, `user_story_progress`, `chapter_read_events` | embedded (reader, story, library) | 15 · 5 |
| [D-COMMUNITY](domains/community/overview.md) | [OBJ-VOTE](domains/community/vote/business-rules.md) | Chapter votes | `chapter_votes`, `set_chapter_vote` | embedded (reader) | 12 · 3 |
| | [OBJ-CMT](domains/community/comments/business-rules.md) | Chapter and paragraph comments, replies, likes, author hide | `comments`, `comment_likes`, `comment_hides` | SCR-CMT-01 (embedded) | 21 · 10 |
| | [OBJ-NOTI](domains/community/notifications/business-rules.md) | In-app notifications, realtime bell | `notifications`, outbox handlers | SCR-NOTI-01 | 17 · 8 |
| [D-LIBRARY](domains/library/overview.md) | [OBJ-LIB](domains/library/library/business-rules.md) | Follow/save stories; reading / saved / following tabs | `story_follows`, `story_saves`, progress | SCR-LIB-01 | 12 · 6 |
| | [OBJ-LIST](domains/library/reading-lists/business-rules.md) | Reading lists (private / unlisted / public) | `reading_lists`, `reading_list_items` | SCR-LIST-01 | 14 · 9 |
| [D-STUDIO](domains/studio/overview.md) | [OBJ-STM](domains/studio/story-management/business-rules.md) | Story CRUD, cover, tags, slug, soft-delete | `stories`, bucket `covers` | SCR-STM-01…03 | 25 · 7 |
| | [OBJ-CHM](domains/studio/chapter-management/business-rules.md) | Chapter list, add, reorder, archive, delete, slug | `chapters`, reorder/archive RPCs | SCR-CHM-01 | 15 · 6 |
| | [OBJ-EDT](domains/studio/chapter-editor/business-rules.md) | Tiptap editor, autosave, conflicts, images, publish/schedule/unpublish | `chapter_drafts`, `publish_chapter`, bucket `chapter-images` | SCR-EDT-01 | 28 · 10 |
| | [OBJ-HIST](domains/studio/version-history/business-rules.md) | Immutable versions, compare, restore, preview | `chapter_versions` | SCR-HIST-01, SCR-HIST-02 | 9 · 4 |
| | [OBJ-TEAM](domains/studio/collaboration/business-rules.md) | Invitations, roles, **role-permission matrix** (BR-TEAM-010) | `story_collaborators`, `story_invitations`, `story_role` | SCR-TEAM-01 (+ inbox on SCR-STM-01) | 13 · 4 |
| | [OBJ-STAT](domains/studio/analytics/business-rules.md) | Reads/votes/comments per chapter and per day | stats RPCs | SCR-STAT-01 | 10 · 2 |
| [D-TRUST](domains/trust-safety/overview.md) | [OBJ-MOD](domains/trust-safety/moderation/business-rules.md) | Reports, queue, actions, audit log | `content_reports`, `moderation_actions`, moderation RPCs | SCR-MOD-01, SCR-MOD-02 | 21 · 6 |
| | [OBJ-MAT](domains/trust-safety/mature-content/business-rules.md) | 18+ opt-in, age confirmation, gate, filtering matrix | `user_settings`, local store | SCR-MAT-01 (embedded) | 11 · 4 |
| | [OBJ-ABU](domains/trust-safety/abuse-limits/business-rules.md) | Rate limits and spam filter | `abuse_limits`, `enforce_rate_limit` | — | 9 · 3 |
| [D-PLATFORM](domains/platform/overview.md) | [OBJ-SHELL](domains/platform/app-shell/business-rules.md) | Header, bottom nav, loading, errors, toasts | — | SCR-SHELL-01 | 14 · 4 |
| | [OBJ-I18N](domains/platform/i18n/business-rules.md) | vi/en strings, switcher, account sync | `user_settings.language` | — (header control) | 9 · 3 |
| | [OBJ-SEO](domains/platform/seo/business-rules.md) | Metadata, canonical, robots, sitemaps, OG, JSON-LD | — | — | 10 · 2 |
| | [OBJ-JOB](domains/platform/background-jobs/business-rules.md) | Outbox, scheduled publish, reads, rankings, counters, purges (7 `pg_cron` jobs) | `outbox_events`, `ranking_state` | — | 11 · 6 |
| | [OBJ-DEV](domains/platform/dev-tools/business-rules.md) | Component gallery | — | SCR-DEV-01 | 4 · 1 |

Totals: 8 domains · 31 business objects · 412 business rules · 144 workflows · 32 screen specs.

## 2. Dependencies

```text
                    ┌──────────── D-PLATFORM (shell, i18n, SEO, jobs) ────────────┐
                    │                                                             │
D-ACCOUNT ──identity/role──► every write (RLS auth.uid(), is_active_account())    │
    │                                                                              │
    ▼                                                                              │
D-STUDIO ──publish (RPC)──► D-READING ◄──eligibility── D-DISCOVERY                 │
    │   └─outbox event─► OBJ-JOB ─► D-COMMUNITY/OBJ-NOTI ◄── comments/replies       │
    │                                     ▲                                        │
    └─invitations──────────────────────────┘                                       │
D-READING ──progress/follow/save──► D-LIBRARY                                      │
D-TRUST ──filters/actions──► D-DISCOVERY, D-READING, D-COMMUNITY, D-STUDIO ────────┘
```

| From → To | Dependency | Owning rule |
| --- | --- | --- |
| STUDIO → READING | Only published versions are readable; story becomes `ongoing` on first publish | BR-EDT-*, BR-STORY-* |
| STUDIO → NOTI (via JOB) | `chapter.published` outbox event → followers notified once per chapter | BR-NOTI-*, BR-JOB-* |
| READING → DISCOVERY | Visibility / status / deleted rules reused by every list | BR-STORY-* (owner) |
| TRUST → all lists | Mature opt-in filter and suspended-owner filter | BR-MAT-*, BR-MOD-* |
| ACCOUNT → all writes | `is_active_account()` gate (applied inconsistently — see F-STM-05, F-CMT-02) | BR-AUTH-*, BR-MOD-* |
| SET → NOTI | Switched-off types are dropped at insert | BR-SET-006 |
| TEAM → STM/CHM/EDT/STAT | Role matrix | BR-TEAM-010 |

## 3. Cross-cutting rule owners (single source)

| Concern | Owner | Referenced by |
| --- | --- | --- |
| Story visibility (public / unlisted / private, draft, deleted) | [OBJ-STORY](domains/reading/story/business-rules.md) + matrix in [reading overview](domains/reading/overview.md) | HOME, SRCH, RANK, REC, AUTHOR, LIB, LIST, SEO |
| Discovery eligibility consistency check | [discovery overview](domains/discovery/overview.md) | MAT, MOD |
| 18+ filtering per list | [OBJ-MAT](domains/trust-safety/mature-content/business-rules.md) | all lists |
| Role-permission matrix | [BR-TEAM-010](domains/studio/collaboration/business-rules.md) | STM, CHM, EDT, HIST, STAT, CMT |
| Event → notification table | [OBJ-NOTI](domains/community/notifications/business-rules.md) | JOB, CMT, TEAM |
| Rate limits | [OBJ-ABU](domains/trust-safety/abuse-limits/business-rules.md) | CMT, MOD |
| Error contract (SQLSTATE → `AppError.kind`) | [OBJ-SHELL](domains/platform/app-shell/business-rules.md) | all screens |
