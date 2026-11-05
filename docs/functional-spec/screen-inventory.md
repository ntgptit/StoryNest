# Screen Inventory

Every screen, embedded panel and non-screen route found in `apps/web/src/app` (28 `page.tsx`, 1 route handler,
robots, sitemaps, 2 OG image routes). Entry point: [README](README.md).

Access legend: **Guest** = anyone · **Member** = signed in (`requireUser`, proxy redirect to `/login?next=`) ·
**Story team** = owner/co-author/editor, enforced by RLS/RPC (see [BR-TEAM role matrix](domains/studio/collaboration/business-rules.md)) ·
**Moderator** = JWT `app_metadata.role = 'moderator'`.

Runtime column: **R** = opened in a browser as a guest on 2026-11-04 (390 px, some at 1280 px) · **R→login** =
verified redirect to sign-in · **–** = code-only (needs a signed-in session).

## 1. Route screens

| Screen ID | Name | Domain / object | Route | Route file → screen component | Access | Spec | Runtime |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCR-AUTH-01 | Sign in | ACCOUNT / AUTH | `/login` | `(auth)/login/page.tsx` → `features/auth/screens/sign-in-screen.tsx` | Guest only | [sign-in](domains/account/authentication/screens/sign-in.md) | R |
| SCR-AUTH-02 | Sign up | ACCOUNT / AUTH | `/register` | `(auth)/register/page.tsx` → `sign-up-screen.tsx` | Guest only | [sign-up](domains/account/authentication/screens/sign-up.md) | R |
| SCR-AUTH-03 | Forgot password | ACCOUNT / AUTH | `/forgot-password` | `(auth)/forgot-password/page.tsx` → `forgot-password-screen.tsx` | Guest | [forgot-password](domains/account/authentication/screens/forgot-password.md) | R |
| SCR-AUTH-04 | Reset password | ACCOUNT / AUTH | `/reset-password` | `(auth)/reset-password/page.tsx` → `reset-password-screen.tsx` | Recovery session (any session) | [reset-password](domains/account/authentication/screens/reset-password.md) | R (invalid-link state) |
| SCR-PRF-01 | My profile | ACCOUNT / PRF | `/me` | `(main)/me/page.tsx` → `me/me-view.tsx` (web-only) | Member | [my-profile](domains/account/profile/screens/my-profile.md) | R→login |
| SCR-PRF-02 | Edit profile | ACCOUNT / PRF | `/me/edit` | `(main)/me/edit/page.tsx` → `features/profile/screens/edit-profile-screen.tsx` | Member | [edit-profile](domains/account/profile/screens/edit-profile.md) | R→login |
| SCR-SET-01 | Settings | ACCOUNT / SET | `/settings` | `(main)/settings/page.tsx` → `features/settings/screens/settings-screen.tsx` | Member | [settings](domains/account/settings/screens/settings.md) | R→login |
| SCR-HOME-01 | Home / Discover | DISCOVERY / HOME (+TAX, REC) | `/` (`?category=`, `?tag=`) | `(main)/page.tsx` → `features/discovery/screens/discover-screen.tsx` | Guest | [home-discover](domains/discovery/home/screens/home-discover.md) | R |
| SCR-SRCH-01 | Search results (+ header SearchBox) | DISCOVERY / SRCH | `/search?q=&tab=` | `(main)/search/page.tsx` → `features/search/screens/search-screen.tsx` | Guest | [search-results](domains/discovery/search/screens/search-results.md) | R |
| SCR-RANK-01 | Rankings | DISCOVERY / RANK | `/ranking?period=` | `(main)/ranking/page.tsx` → `features/ranking/screens/ranking-screen.tsx` | Guest | [rankings](domains/discovery/ranking/screens/rankings.md) | R |
| SCR-AUTHOR-01 | Author page | DISCOVERY / AUTHOR | `/author/[username]` | `(main)/author/[username]/page.tsx` → `features/author/screens/author-screen.tsx` | Guest | [author-page](domains/discovery/author/screens/author-page.md) | R |
| SCR-AUTHOR-02 | Following feed | DISCOVERY / AUTHOR | `/following` | `(main)/following/page.tsx` → `following-screen.tsx` | Member | [following-feed](domains/discovery/author/screens/following-feed.md) | R→login |
| SCR-STORY-01 | Story page | READING / STORY | `/story/[id]/[slug]` | `(main)/story/[id]/[slug]/page.tsx` → `features/story/screens/story-screen.tsx` | Guest (visibility rules) | [story-page](domains/reading/story/screens/story-page.md) | R |
| SCR-READ-01 | Chapter reader | READING / READ (+PROG, VOTE, CMT) | `/story/[id]/[slug]/[chapterSlug]` | `…/[chapterSlug]/page.tsx` → `features/reader/screens/reader-screen.tsx` | Guest (visibility rules) | [chapter-reader](domains/reading/chapter-reader/screens/chapter-reader.md) | R |
| SCR-NOTI-01 | Notifications (+ header bell) | COMMUNITY / NOTI | `/notifications` | `(main)/notifications/page.tsx` → `features/notifications/screens/notifications-screen.tsx` | Member | [notifications](domains/community/notifications/screens/notifications.md) | R→login |
| SCR-LIB-01 | Library | LIBRARY / LIB (+LIST) | `/library` | `(main)/library/page.tsx` → `features/library/screens/library-screen.tsx` | Member | [library](domains/library/library/screens/library.md) | R→login |
| SCR-LIST-01 | Reading list | LIBRARY / LIST | `/lists/[id]` | `(main)/lists/[id]/page.tsx` → `features/lists/screens/list-screen.tsx` | Guest (list visibility) | [reading-list](domains/library/reading-lists/screens/reading-list.md) | R (not-found state) |
| SCR-STM-01 | Studio home | STUDIO / STM (+TEAM inbox) | `/studio` | `(main)/studio/page.tsx` → `features/studio/screens/studio-screen.tsx` | Member | [studio-home](domains/studio/story-management/screens/studio-home.md) | R→login |
| SCR-STM-02 | Create story | STUDIO / STM | `/studio/new` | `(main)/studio/new/page.tsx` → `story-form-screen.tsx` | Member (active) | [create-story](domains/studio/story-management/screens/create-story.md) | R→login |
| SCR-STM-03 | Edit story | STUDIO / STM | `/studio/story/[id]` | `(main)/studio/story/[id]/page.tsx` → `story-form-screen.tsx` | Story team | [edit-story](domains/studio/story-management/screens/edit-story.md) | – |
| SCR-CHM-01 | Chapter manager | STUDIO / CHM | `/studio/story/[id]/chapters` | `…/chapters/page.tsx` → `chapter-manager-screen.tsx` | Story team | [chapter-manager](domains/studio/chapter-management/screens/chapter-manager.md) | – |
| SCR-EDT-01 | Chapter editor | STUDIO / EDT | `/studio/story/[id]/chapter/[chapterId]` | `…/chapter/[chapterId]/page.tsx` → `features/editor/screens/chapter-editor-screen.tsx` | Story team | [chapter-editor](domains/studio/chapter-editor/screens/chapter-editor.md) | – |
| SCR-HIST-01 | Version history | STUDIO / HIST | `…/chapter/[chapterId]/history` | `…/history/page.tsx` → `features/history/screens/history-screen.tsx` | Story team | [version-history](domains/studio/version-history/screens/version-history.md) | – |
| SCR-HIST-02 | Chapter preview | STUDIO / HIST | `…/chapter/[chapterId]/preview` | `…/preview/page.tsx` → `preview-screen.tsx` | Story team | [chapter-preview](domains/studio/version-history/screens/chapter-preview.md) | – |
| SCR-TEAM-01 | Team | STUDIO / TEAM | `/studio/story/[id]/team` | `…/team/page.tsx` → `features/studio/screens/team-screen.tsx` | Story team (owner manages) | [team](domains/studio/collaboration/screens/team.md) | – |
| SCR-STAT-01 | Story statistics | STUDIO / STAT | `/studio/story/[id]/stats` | `…/stats/page.tsx` → `features/analytics/screens/story-stats-screen.tsx` | Story team | [story-statistics](domains/studio/analytics/screens/story-statistics.md) | – |
| SCR-MOD-01 | Moderation console | TRUST / MOD | `/moderation` | `(main)/moderation/page.tsx` → `features/moderation/screens/moderation-screen.tsx` | Moderator (others: 404) | [moderation-console](domains/trust-safety/moderation/screens/moderation-console.md) | R→login |
| SCR-DEV-01 | Dev gallery | PLATFORM / DEV | `/dev/gallery` | `dev/gallery/page.tsx` → `gallery.tsx` | Development builds only (`notFound()` in production) | [dev-gallery](domains/platform/dev-tools/screens/dev-gallery.md) | R (dev) |

## 2. Global frame and embedded panels

| Screen ID | Name | Mounted in | Component | Spec |
| --- | --- | --- | --- | --- |
| SCR-SHELL-01 | Main shell: header (brand, SearchBox, 18+ toggle, language, bell, user menu), bottom nav (Home, Library, Write, Me), loading skeleton | Every `(main)` route | `features/shell/components/main-shell.tsx` | [main-shell](domains/platform/app-shell/screens/main-shell.md) |
| SCR-CMT-01 | Comment thread (chapter + paragraph sheet) | SCR-READ-01 (`#comments`, paragraph sheet) | `features/comments/components/comment-thread.tsx` | [comment-thread](domains/community/comments/screens/comment-thread.md) |
| SCR-MOD-02 | Report button + dialog | SCR-STORY-01, SCR-READ-01, SCR-CMT-01 items, SCR-AUTHOR-01 | `features/moderation/components/report-button.tsx` | [flag-content-dialog](domains/trust-safety/moderation/screens/flag-content-dialog.md) |
| SCR-MAT-01 | 18+ gate + header 18+ dialog | SCR-STORY-01, SCR-READ-01; toggle in SCR-SHELL-01 | `features/adult-content/components/{adult-gate,adult-content-button}.tsx` | [adult-content-gate](domains/trust-safety/mature-content/screens/adult-content-gate.md) |

Other dialogs/sheets documented as components inside the screen that owns them: reader settings sheet and TOC sheet
(SCR-READ-01), add-to-list sheet `SCR-LIST-01-C09` (mounted on SCR-STORY-01), list form dialog `SCR-LIST-01-C07`
and My lists `SCR-LIST-01-C08` (SCR-LIB-01 Lists tab), rename-slug dialog (SCR-STM-03, SCR-CHM-01), cover editor
and tag editor (SCR-STM-02/03), avatar editor (SCR-PRF-02), publish panel (SCR-EDT-01), MyInvitations (SCR-STM-01),
confirm dialogs (shared widget).

## 3. Non-screen routes

| Route | File | Purpose | Spec |
| --- | --- | --- | --- |
| `GET /auth/callback` | `app/auth/callback/route.ts` | Exchange email-link `code` for a session, redirect to safe `next` | [WF-AUTH-02](domains/account/authentication/workflows.md) |
| `/robots.txt` | `app/robots.ts` | Disallow private/auth/search/lists paths; list sitemaps | [OBJ-SEO](domains/platform/seo/business-rules.md) |
| `/sitemap/stories-N.xml`, `/sitemap/chapters-N.xml` | `app/sitemap.ts`, `lib/seo/*` | Public, indexable stories/chapters (`/sitemap.xml` itself returns 404 — robots lists the split files) | [OBJ-SEO](domains/platform/seo/business-rules.md) |
| `…/[slug]/opengraph-image`, `…/[chapterSlug]/opengraph-image` | `opengraph-image.tsx` ×2 | Share cards | [OBJ-SEO](domains/platform/seo/business-rules.md) |

## 4. Navigation reachability (summary)

| Screen | Bottom nav (mobile) | Header / user menu | Other entry points |
| --- | --- | --- | --- |
| Home | ✓ | brand link | — |
| Search | — | SearchBox (desktop field, mobile icon) | — |
| Rankings | — | — | Only a link on Home ("Xem xếp hạng") → U-HOME-01 |
| Following feed | — | — | Only a link on Home (members) → U-HOME-01 |
| Library | ✓ | user menu | — |
| Studio | ✓ ("Viết") | user menu | — |
| Me | ✓ | user menu | — |
| Settings | — | user menu only | — (U-PRF-01) |
| Notifications | — | bell | — |
| Moderation | — | user menu (moderators) | — |
| Story stats | — | — | Studio row only (U-STAT-01) |

Desktop (≥ md) has no primary navigation at all: the bottom nav is hidden and the header has no section links
(U-SHELL-01). Details: [main-shell](domains/platform/app-shell/screens/main-shell.md).

## 5. Counts

28 route screens + 4 global/embedded panel specs = **32 screen specifications**, plus 4 non-screen route groups.
