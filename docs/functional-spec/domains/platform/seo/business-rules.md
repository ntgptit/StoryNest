# OBJ-SEO — SEO & sharing: business rules

## 1. Overview

| Field | Value |
| --- | --- |
| Object ID | `OBJ-SEO` |
| Name | Search-engine visibility (canonical, robots/noindex, sitemaps, JSON-LD) and link sharing (Open Graph images) |
| Business purpose | Bring readers from search and social links to public stories while keeping unlisted, private, 18+ and personal pages out of search engines |
| User goals | Find StoryNest stories via search; share a story/chapter link with an attractive preview |
| Actors / roles | Crawler (anonymous), Sharer/recipient (any), Operator (sets `NEXT_PUBLIC_SITE_URL`) |
| Related entities | `stories` (`visibility`, `status`, `deleted_at`, `is_mature`, `slug`, `updated_at`), `chapters` (`status`, `slug`) read with an anonymous client |
| Code | `apps/web/src/app/{robots,sitemap}.ts`, `apps/web/src/lib/seo/{sitemap,sitemap-data,json-ld,og-card}.ts(x)`, `apps/web/src/lib/site.ts`, `apps/web/src/app/_components/json-ld.tsx`, `apps/web/src/app/(main)/story/[id]/[slug]/{page,opengraph-image}.tsx`, `.../[chapterSlug]/{page,opengraph-image}.tsx`, `packages/features/src/story/model/story-detail.ts` |
| Dependencies | OBJ-STORY (visibility rules, slug redirect — BR-STORY-*), OBJ-READ (chapter loading), OBJ-MAT (18+ policy) |
| WBS | 6.6 ✅ (author sitemap, hreflang, Search Console, production Lighthouse not done) (`docs/WBS.md:224`) |

No screen.

## 2. Rules

### BR-SEO-001 — Site address
| Field | Value |
| --- | --- |
| Description | Absolute URLs (canonical, OG, sitemap, robots) use `NEXT_PUBLIC_SITE_URL`, else `VERCEL_PROJECT_PRODUCTION_URL`, else `http://localhost:3000`; set as `metadataBase` |
| Preconditions | — |
| Conditions | A bare host gets `https://`; non-http(s) values (e.g. `ftp://`) are ignored; only the origin is kept |
| Expected behavior | — |
| Exceptions | Email links (auth) use the browser origin, not this value (BR-AUTH-006) |
| Related screens | — |
| Evidence | `apps/web/src/lib/site.ts:1-31`, `apps/web/src/lib/site.test.ts`, `apps/web/src/app/layout.tsx:13-18` |
| Status | Verified |

### BR-SEO-002 — Indexable story
| Field | Value |
| --- | --- |
| Description | A story (and its chapters) is indexable only if `visibility = 'public'` and not 18+ |
| Preconditions | Story page or chapter page metadata |
| Conditions | Not indexable → `robots: { index: false, follow: false }` and no JSON-LD. Unlisted stories still open by link (BR-STORY-*) |
| Expected behavior | 18+ exclusion is a policy choice recorded in WBS 6.6 |
| Exceptions | Owner account status is not considered (F-SEO-01) |
| Related screens | Story page, reader (D-READING) |
| Evidence | `packages/features/src/story/model/story-detail.ts:21-27`, `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:29,54`, `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:29,52`, `docs/WBS.md:224` |
| Status | Verified |

### BR-SEO-003 — Canonical URLs
| Field | Value |
| --- | --- |
| Description | Story: `/story/{id}/{slug}`; chapter: `/story/{id}/{slug}/{chapterSlug}` (decision Q2) |
| Preconditions | Story/chapter loaded |
| Conditions | Wrong/stale story slug → permanent redirect to the canonical URL (owned by BR-STORY-*) |
| Expected behavior | `alternates.canonical` relative, made absolute by `metadataBase` |
| Exceptions | Missing/hidden story or chapter → real 404 (`notFound()`) and fallback title "Truyện"/"Chương" with `index: false` |
| Related screens | Story page, reader |
| Evidence | `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:18-28,45-50`, `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:18-28,42-47`, `docs/WBS.md:282` |
| Status | Verified |

### BR-SEO-004 — Page metadata content
| Field | Value |
| --- | --- |
| Description | Title template `"%s · StoryNest"`, default "StoryNest", description "Đọc và đăng truyện trực tuyến." Story: title, description = synopsis excerpt 160, OG `type: book` with author and cover. Chapter: title "<chapter> · <story>", description = first paragraph excerpt 160, OG `type: article` |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Always Vietnamese (BR-I18N-007) |
| Exceptions | Author page: static title "Tác giả", no description/canonical (F-SEO-02); ranking: title only |
| Related screens | — |
| Evidence | `apps/web/src/app/layout.tsx:13-18`, `apps/web/src/lib/strings.ts:5-38`, `apps/web/src/app/(main)/story/[id]/[slug]/page.tsx:18-39`, `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/page.tsx:18-36`, `apps/web/src/app/(main)/author/[username]/page.tsx:8` |
| Status | Verified |

### BR-SEO-005 — Structured data
| Field | Value |
| --- | --- |
| Description | Indexable story page: schema.org `Book` (url, name, description ≤ 300, inLanguage, image, genre, keywords from tags, dateModified, isAccessibleForFree, author Person with author-page URL). Chapter page: `Chapter` (name, position, inLanguage, author, `isPartOf` Book) |
| Preconditions | BR-SEO-002 true |
| Conditions | Empty/undefined fields dropped |
| Expected behavior | JSON escapes `<`, `>`, `&`, U+2028/2029 so DB text cannot close the script tag |
| Exceptions | — |
| Related screens | — |
| Evidence | `apps/web/src/lib/seo/json-ld.ts:1-77`, `apps/web/src/app/_components/json-ld.tsx:1-6`, `apps/web/src/lib/seo/json-ld.test.ts` |
| Status | Verified |

### BR-SEO-006 — Share images (Open Graph)
| Field | Value |
| --- | --- |
| Description | 1200×630 PNG: story = cover (if any) + "StoryNest" + title + author; chapter = cover + chapter title + "story · author" |
| Preconditions | Request to the route's `opengraph-image` |
| Conditions | Loaded with the requester's session (crawlers: anonymous) |
| Expected behavior | Hidden/missing story → generic card with the site name |
| Exceptions | Generated for 18+ public stories too (cover visible in previews, Q-SEO-01); default font only (no real bold) |
| Related screens | — |
| Evidence | `apps/web/src/lib/seo/og-card.tsx:1-41`, `apps/web/src/app/(main)/story/[id]/[slug]/opengraph-image.tsx:1-21`, `apps/web/src/app/(main)/story/[id]/[slug]/[chapterSlug]/opengraph-image.tsx:8-26` |
| Status | Verified |

### BR-SEO-007 — Sitemap contents
| Field | Value |
| --- | --- |
| Description | Files `/sitemap/stories-N.xml` and `/sitemap/chapters-N.xml`, 5000 URLs each, built per request from the DB with an anonymous client, revalidated hourly |
| Preconditions | Supabase configured (otherwise only `stories-0` with the fixed pages) |
| Conditions | `stories-0` also lists `/` and `/ranking`. Stories: `visibility = public`, `deleted_at IS NULL`, `status <> draft`, `is_mature = false`, ordered by id, `lastModified = updated_at`. Chapters: `status = published`, not deleted, of such stories |
| Expected behavior | Unknown id → empty file; chapter without readable story skipped |
| Exceptions | Owner account status not filtered (F-SEO-01); author pages not listed (F-SEO-02) |
| Related screens | — |
| Evidence | `apps/web/src/app/sitemap.ts:1-29`, `apps/web/src/lib/seo/sitemap.ts:1-74`, `apps/web/src/lib/seo/sitemap-data.ts:9-70`, `apps/web/src/lib/seo/sitemap.test.ts`, `apps/web/src/app/sitemap.test.ts` |
| Status | Verified |

### BR-SEO-008 — robots.txt
| Field | Value |
| --- | --- |
| Description | `User-agent: *`, `Allow: /`, `Disallow:` `/studio`, `/me`, `/library`, `/lists`, `/settings`, `/notifications`, `/following`, `/moderation`, `/search`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth`, `/dev`; one `Sitemap:` line per sitemap file (Next writes no sitemap index) |
| Preconditions | — |
| Conditions | Counting fails → error logged, only `stories-0` listed |
| Expected behavior | Dynamic (`force-dynamic`) |
| Exceptions | `/lists` (public reading lists) disallowed — Q-SEO-02 |
| Related screens | — |
| Evidence | `apps/web/src/app/robots.ts:8-44` |
| Status | Verified |

### BR-SEO-009 — noindex on personal and technical pages
| Field | Value |
| --- | --- |
| Description | `robots: { index: false }` on credential pages, `/me`, `/me/edit`, `/settings`, `/library`, `/lists/[id]`, `/search`, `/following`, `/notifications`, `/moderation`, all `/studio/**`; `/dev/gallery` also `follow: false` |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Indexable: `/`, `/ranking`, `/author/[username]`, indexable story/chapter pages |
| Exceptions | — |
| Related screens | All |
| Evidence | `metadata` exports in `apps/web/src/app/(main)/**/page.tsx`, `apps/web/src/app/(auth)/**/page.tsx`, `apps/web/src/app/dev/gallery/page.tsx:5` |
| Status | Verified |

### BR-SEO-010 — Not yet covered (documented)
| Field | Value |
| --- | --- |
| Description | Author-page sitemap, `hreflang`/per-language URLs, Search Console, Lighthouse on production (dev measured 100/100 for story and chapter) |
| Preconditions | — |
| Conditions | — |
| Expected behavior | Not implemented |
| Exceptions | — |
| Related screens | — |
| Evidence | `docs/WBS.md:224` |
| Status | Documented |
