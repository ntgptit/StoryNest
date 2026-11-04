# OBJ-SEO — SEO & sharing: workflows

Rules: [business-rules.md](business-rules.md).

## WF-SEO-01 — Crawler discovers public content
| Field | Value |
| --- | --- |
| User goal | (Search engine) index every public, non-adult story and chapter, nothing else |
| Trigger | Crawler fetches `/robots.txt` |
| Preconditions | Supabase configured; `NEXT_PUBLIC_SITE_URL` set in production |
| Main flow | 1. `robots.txt` (BR-SEO-008) lists sitemap files. 2. Crawler fetches `/sitemap/stories-N.xml`, `/sitemap/chapters-N.xml` (BR-SEO-007). 3. Fetches story/chapter pages: canonical, metadata, JSON-LD (BR-SEO-003..005) |
| Alternative flows | A1. Stale slug → permanent redirect to canonical. A2. Unlisted/18+ page reached via an external link → `noindex,nofollow` |
| Exception flows | E1. Story removed/hidden → 404. E2. DB count fails → robots lists `stories-0` only |
| Success criteria | Only BR-SEO-002-indexable pages are indexed |
| Postconditions | Sitemaps refreshed at most hourly |
| Affected objects | OBJ-SEO, OBJ-STORY |
| Related screens | Story page, reader |
| Status | Verified (code + tests); Lighthouse SEO 100 on dev (`docs/WBS.md:224`) |

## WF-SEO-02 — Share a story or chapter link
| Field | Value |
| --- | --- |
| User goal | Preview with cover, title and author in chat/social apps |
| Trigger | Link pasted into an app that reads Open Graph |
| Preconditions | Story readable anonymously |
| Main flow | 1. Unfurler reads OG tags (title, description, `type`). 2. Fetches `opengraph-image` → PNG card (BR-SEO-006) |
| Alternative flows | A1. Private story → generic "StoryNest" card |
| Exception flows | — |
| Success criteria | Card shows correct title/author/cover |
| Postconditions | — |
| Affected objects | OBJ-SEO |
| Related screens | — |
| Status | Verified (runtime: PNG generated on dev, `docs/WBS.md:224`) |
