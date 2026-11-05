# D-PLATFORM — Platform (cross-cutting): overview

## Purpose
Everything every feature relies on but no single feature owns: the app frame and navigation, the language system,
search-engine and sharing metadata, scheduled/background jobs, and developer tooling. It also holds the platform seam
(`PlatformProvider`) that lets the future Capacitor app reuse the web screens (WBS Q1).

## Actors
| Actor | Description |
| --- | --- |
| Guest / Member / Moderator | Use the shell, switch language, follow shared links |
| Crawler / link unfurler | Reads robots, sitemaps, metadata, OG images anonymously |
| pg_cron / `service_role` | Runs scheduled jobs and the outbox worker |
| Operator | Configures env (`NEXT_PUBLIC_*`), re-queues dead letters, watches logs |
| Developer | Uses `/dev/gallery`, `pnpm gate` guards |

## Business objects
| ID | Name | Folder | Screens | Workflows | Rules |
| --- | --- | --- | --- | --- | --- |
| `OBJ-SHELL` | App shell & navigation | [app-shell](app-shell/business-rules.md) | [SCR-SHELL-01 Main shell](app-shell/screens/main-shell.md) (frame of all `(main)` routes) | [WF-SHELL-01..04](app-shell/workflows.md) | BR-SHELL-001..014 |
| `OBJ-I18N` | Language | [i18n](i18n/business-rules.md) | — (controls in SCR-SHELL-01, SCR-SET-01) | [WF-I18N-01..03](i18n/workflows.md) | BR-I18N-001..009 |
| `OBJ-SEO` | SEO & sharing | [seo](seo/business-rules.md) | — | [WF-SEO-01..02](seo/workflows.md) | BR-SEO-001..010 |
| `OBJ-JOB` | Background jobs (outbox, cron) | [background-jobs](background-jobs/business-rules.md) | — | [WF-JOB-01..06](background-jobs/workflows.md) | BR-JOB-001..011 |
| `OBJ-DEV` | Developer tools | [dev-tools](dev-tools/business-rules.md) | [SCR-DEV-01 Dev gallery `/dev/gallery`](dev-tools/screens/dev-gallery.md) | [WF-DEV-01](dev-tools/workflows.md) | BR-DEV-001..004 |

## Scope vs WBS
| WP | WBS status | Observed |
| --- | --- | --- |
| 0.3 Common code incl. error boundary | ✅ | `ErrorBoundary` built but never mounted; no `error.tsx`/`not-found.tsx` (F-SHELL-01) |
| 0.4 / 6.10 i18n | ✅ | Matches; server-rendered texts and `<html lang>` stay Vietnamese (documented limitation, U-I18N-01) |
| 0.5 Widgets, gallery, desktop sidebar | ✅ (sidebar deferred) | No desktop primary navigation (U-SHELL-01) |
| 1.3 Auth-aware shell | ✅ | Bottom nav now has 4 items (WBS note says 2: stale) |
| 6.6 SEO | ✅ | Matches; author pages and suspended-author filter missing (F-SEO-01, F-SEO-02) |
| Outbox + cron (section 0) | ✅ | 7 jobs; no monitoring (F-JOB-02, WP 8.2 ⬜) |
| 7.1–7.5 Mobile (Capacitor) | ⬜ | `apps/mobile` contains only `.gitkeep`; adapter contract ready (`platform`, `isNative`, `openExternal`). README describes it as if present (F-SHELL-03) |
| 8.3 Security headers / CSP | ⬜ | None configured (F-SHELL-02) |

## Configuration (env)
| Variable | Used by | Rule |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | All data access, proxy | Required; missing → dev runs without data, production 500 (BR-AUTH-011, BR-SHELL-013) |
| `NEXT_PUBLIC_SITE_URL` | Canonical, OG, sitemap, robots | Optional; fallback Vercel production URL, then localhost (BR-SEO-001) |
| `VERCEL_PROJECT_PRODUCTION_URL` | Same | Fallback only |
| `NODE_ENV` | Gallery 404, proxy strictness | `production` hides `/dev/gallery` |

Evidence: `apps/web/src/lib/env.ts`, `apps/web/src/lib/site.ts`, `apps/web/.env.example`, `apps/web/src/proxy.ts:9-15`.

## Cross-domain dependencies
| Domain / object | Relationship |
| --- | --- |
| D-ACCOUNT (OBJ-AUTH, OBJ-PRF, OBJ-SET) | User menu, sign-in/out, avatar, language persistence |
| D-DISCOVERY (OBJ-SRCH, OBJ-RANK, OBJ-AUTHOR, OBJ-HOME) | Header search slot; ranking refresh job; `/ranking` and `/following` only linked from home |
| D-COMMUNITY (OBJ-NOTI) | Header bell; outbox event handlers (owned there) |
| D-TRUST (OBJ-MAT, OBJ-MOD) | 18+ button + sync in shell; moderator menu item |
| D-READING (OBJ-STORY, OBJ-READ, OBJ-PROG) | SEO metadata of story/chapter pages; read aggregation job; reader bootstrap script in root layout |
| D-STUDIO (OBJ-EDT) | Scheduled publishing job |

## Domain-level open questions
- Q-SHELL-01 — Desktop primary navigation: sidebar (WBS 0.5) or header links? Which sections (Ranking, Following, Notifications)?
- Q-SEO-01 — Should share images of 18+ stories show the cover/title, given 18+ is hidden from guests by default?
- Q-SEO-02 — Should public reading lists (`/lists/<id>`) be indexable? Today they are `noindex` and disallowed.
- Q-JOB-01 — Scheduled publishing is attributed to the last draft saver (possibly an editor) and has no failure limit: who should be notified when it fails?
- Q-I18N-01 — Is a language cookie (server-rendered language, correct `<html lang>` and titles) wanted before mobile, or is the post-hydration switch accepted?
