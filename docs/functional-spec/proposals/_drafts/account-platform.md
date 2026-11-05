# Draft account-platform

Phase 2 specialist draft: **Account lifecycle across roles (JRN-ACC-\*)**, capability areas **ACCT** and **PLAT**,
screens SCR-AUTH-01…04, SCR-PRF-01/02, SCR-SET-01, SCR-SHELL-01, SCR-DEV-01, and the **app-wide visual consistency
audit** (section 7.2). Reserved FP range: FP-035…FP-039 (all five used).

Evidence base and limits:

- Code read at the working tree of 2026-11-05 (`packages/design-tokens`, `packages/ui`, `packages/features/src/{auth,profile,settings,shell,_shared}`, `apps/web/src/app/**`, `supabase/migrations/*`).
- Runtime evidence = guest only, dev data, 2026-11-05: screenshots `rt2/shots/{m,t,d}-*.png` (390 / 768 / 1280 px) and `rt2/metrics.json`; Phase 1 notes RT-01…RT-15. **No signed-in flow was run at runtime** (DEC-011): everything about `/me`, `/me/edit`, `/settings`, the user menu, sign-out, the callback with a real email, and dark mode is code-only. Where I say "Verified (Runtime)" it is something visible in those guest screenshots.
- `metrics.json` "controls < 44 px" counts every visible `a`/`button` by `min(width, height)`, so inline text links are included. It **over-states** touch-target failures; I use it only as a density signal and back each target claim with code.
- Contrast figures below were computed from the `oklch()` token values (`tokens.css:30-52`) with the WCAG relative-luminance formula. Tagged **Inferred** (calculation), not measured in a browser.
- Benchmark references (BM-xx) point to `proposals/_drafts/benchmark.md`.

---

## 1. Journeys

### JRN-ACC-01 — First visit → sign-up → confirm email → first session (onboarding and activation)

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-01 |
| User goal | "I found a story I like. I want an account so I can save it, vote and come back, and I want the app to feel like mine quickly." |
| Current workflow | 1. Guest reads (no sign-up prompt on Home: U-HOME-02). 2. A member-only action ("Sign in to vote", Library/Write/Me in the bottom nav) sends them to `/login?next=…` (BR-AUTH-008), or the header "Sign in" sends them to `/login` **without** `next` (U-SHELL-04). 3. "Sign up" → `/register` with email, password, optional username, optional display name (SCR-AUTH-02). 4. "Check your email" card (SCR-AUTH-02-C09). 5. Email link → `/auth/callback` → session → redirect to `next` (default `/`) (`apps/web/src/app/auth/callback/route.ts:11-22`). 6. The member lands on Home or the original page. Nothing marks it as the first session: no welcome, no identity check, no starting point. |
| Friction points | **Confirmed:** (a) Sign-up form has 4 fields + no Google option (F-AUTH-02; `m-register.png` shows the form filling the first screen at 390 px). Verified (Runtime). (b) No language switch on auth pages (U-AUTH-01; `m-login.png`, `m-register.png`). Verified (Runtime). (c) The username the person typed can be silently changed (lower-cased, cut to 20, suffixed) by `handle_new_user` (`supabase/migrations/20261103000100_auth_and_rls.sql:33-46`, F-AUTH-01). Verified (Code). (d) No resend of the confirmation email (F-AUTH-03). Verified (Code). (e) A link opened on another device fails with "invalid or expired" (F-AUTH-04). Inferred. (f) New members have an empty library, so "Recommended for you" renders nothing (BR-REC-005: hidden when empty; `apps/web/src/app/(main)/discover-home.tsx:9-13`). Verified (Code). (g) No onboarding or welcome code at all (search for "onboard\|welcome" finds only the sign-in subtitle). Verified (Code). **Hypothesised:** (h) people who wanted to vote or save lose that intent after the email round-trip, because nothing reminds them what they were doing (Inferred). (i) No terms/privacy reference at sign-up (WBS 6.9 ⬜) may block launch legally (Inferred, Q-X-02). |
| Missing capabilities | CAP-ACCT-02 social sign-in, CAP-ACCT-03 resend / cross-device confirmation, CAP-ACCT-04 first-run welcome + activation checklist, CAP-ACCT-19 legal consent reference. |
| Proposed improvement | (1) Shorter sign-up: "Continue with Google" + email + password; username/display name move to the welcome step, where availability is shown (FP-009 amendment, BRC-AUTH-01). (2) Check-email card with resend + cooldown, "wrong address? change it", spam hint (FP-009). (3) **First-run welcome** `/welcome` (3 skippable steps: identity + avatar, reading interests + language, starter stories with one-tap Save) shown once, and only when it does not interrupt a pending intent; then an **activation checklist** on `/me` and Home (FP-035). (4) Terms/Privacy line under the sign-up button (FP-039). |
| Expected value | Fewer abandoned sign-ups (shorter form, Google), a first session that already has a personal library (seeds BR-REC-004 `library_similar` recommendations), fewer "who is user_3f2a…?" profiles. Measured with existing tables (saves, follows, `chapter_reads`, stories) through an operator query; no analytics service needed. |
| Affected screens | SCR-AUTH-02, SCR-AUTH-01, `/auth/callback`, new SCR-PRF-03 Welcome [Proposed], SCR-PRF-01, SCR-HOME-01 (checklist card; discovery agent owns the screen), SCR-SHELL-01 |
| Dependencies | FP-009 (Google, resend, username policy), FP-019 (`/me` hub hosts the checklist), FP-032 (guest CTA leads into sign-up), FP-021 (language), FP-039 (legal links), Q-AUTH-04, Q-X-02 |
| Evidence | Code refs above; runtime `m-register.png`, `t-register.png`, `m-login.png`; benchmark BM-33 (Wattpad genre picks at sign-up seed the feed; make them editable). |

### JRN-ACC-02 — Returning member (same device, new device, after a break)

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-02 |
| User goal | "Get back to what I was reading or writing, on whatever device I have now." |
| Current workflow | Same device: session cookie persists; header shows the avatar; Home looks like the guest Home plus "Recommended for you" / "From authors you follow" when non-empty (BR-HOME-008). New device: header "Sign in" → `/login` (no `next`) → `/` → `LanguageSync` applies the account language (BR-SET-004) → the reader must find their story through Library (bottom nav on mobile; user menu on tablet/desktop). |
| Friction points | **Confirmed:** (a) At 768 px and 1280 px there is no primary navigation: the bottom nav is hidden from `md` (`packages/ui/src/widgets/bottom-nav.tsx:47`) and the header has no section links (`packages/features/src/shell/components/site-header.tsx:13-22`). `t-home.png` and `d-home.png` show only brand, search, 18+, "VI" and "Sign in". Verified (Runtime) for guests; for members the user menu is the only path (Verified (Code), `user-menu.tsx:50-80`). (b) Header "Sign in" drops the current page (`user-menu.tsx:32-33`, U-SHELL-04). Verified (Code). (c) `/me` is not an account hub (no avatar, public page, Settings, Sign out; `apps/web/src/app/(main)/me/me-view.tsx:16-43`, U-PRF-01). Verified (Code). (d) Server-rendered pages flash Vietnamese before switching to English (RT-08, U-I18N-01). Verified (Runtime). **Hypothesised:** (e) Home has no "Continue reading" row for members, so the way back to the current story is Library → tab → card (Inferred from `discover-home.tsx:9-13`; owned by discovery/library agents). (f) Sign-out is global (BR-AUTH-017), so signing out of a shared computer also signs the person out of their phone, which they discover on return (Inferred, Q-AUTH-01). |
| Missing capabilities | CAP-PLAT-01 navigation at every width, CAP-PLAT-02 return to context, CAP-ACCT-06 account hub, CAP-ACCT-13 per-device sign-out. |
| Proposed improvement | FP-019 amendment: bottom nav kept up to `lg` (tablets), header section links from `lg`; all sign-in links carry `next` (incl. the auth layout "Back" link); `/me` becomes the hub. FP-009 amendment: "Sign out" = this device, plus "Sign out of all devices" in Settings → Account (needs Q-AUTH-01). FP-021: server-side language. Reading "Continue" row: referred to the discovery/library agents (section 7.1). |
| Expected value | Every section reachable in one tap/click at 390/768/1280; signing in never loses the page; fewer accidental global sign-outs. |
| Affected screens | SCR-SHELL-01, SCR-AUTH-01, SCR-PRF-01, SCR-SET-01, SCR-HOME-01 (reference only) |
| Dependencies | Q-SHELL-01, Q-SHELL-02, Q-AUTH-01, FP-019, FP-021, FP-012 (correct "Continue" target) |
| Evidence | `t-home.png`, `d-home.png`, `d-story.png` (no nav); code refs above; RT-08. |

### JRN-ACC-03 — Password recovery

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-03 |
| User goal | "I forgot my password. Let me back in and take me back to where I was." |
| Current workflow | SCR-AUTH-01 "Forgot password?" → `/forgot-password` (the `next` is dropped, SCR-AUTH-01-A04) → email → neutral "Instructions sent" (BR-AUTH-014) → email link → `/auth/callback?next=/reset-password` → recovery session → SCR-AUTH-04 new password + confirmation → toast "Password changed." → `/` signed in (WF-AUTH-04). |
| Friction points | **Confirmed:** (a) The original page is lost twice: sign-in → forgot drops `next`, and reset always lands on `/` (`reset-password-screen.tsx:28-40`). Verified (Code). (b) No "send again" or cooldown hint after the sent card (SCR-AUTH-03 D, AC05 [Proposed]). Verified (Code). (c) Any signed-in session can set a new password at `/reset-password` without the current one (F-AUTH-05; `apps/web/src/lib/auth/route-guard.ts:14-15`). Verified (Code). (d) Invalid-link card at `/reset-password` (`m-reset.png`) offers one text link and no explanation of why (expired vs. opened on another device). Verified (Runtime). **Hypothesised:** (e) A link opened in a different browser (e.g. mail app's in-app browser) fails because of PKCE (F-AUTH-04) and sends the user to `/login?error=callback` instead of back to "request a new link" (Inferred). (f) Other sessions stay signed in after a reset, so a person resetting because of a compromise is not protected (Unknown: depends on Supabase project settings, Q-AUTH-02). |
| Missing capabilities | CAP-ACCT-03 cross-device links, CAP-ACCT-11 reauthenticated password change, CAP-ACCT-13 "sign out other devices" after reset. |
| Proposed improvement | FP-009 amendment: carry `next` through forgot → email → reset → back to `next`; resend with 60 s cooldown; `token_hash` + `verifyOtp` callback (cross-device); recovery vs. normal session distinction; checkbox "Sign out of other devices" (default on) after reset (Q-AUTH-06); invalid-link card explains the two common causes and pre-fills the email when known. |
| Expected value | Recovery that ends where the person started; fewer support requests; a real security remedy for compromised accounts. |
| Affected screens | SCR-AUTH-01, SCR-AUTH-03, SCR-AUTH-04, `/auth/callback` |
| Dependencies | FP-009, Q-AUTH-01, Q-AUTH-02, Q-AUTH-06 |
| Evidence | `m-forgot.png`, `m-reset.png`; WF-AUTH-04; F-AUTH-04, F-AUTH-05. |

### JRN-ACC-04 — Account lifecycle: change email/password, deactivate, delete (anonymise), export

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-04 |
| User goal | "Keep my account secure and up to date; take a break; leave for good; take my data with me." |
| Current workflow | None. Settings has Language, Notifications, Reading, Adult content only (SCR-SET-01 B). No change email, no in-app change password, no deactivate, no delete, no export (F-AUTH-07, BR-AUTH-022, WBS 6.4 ⬜). The schema already has `account_status IN ('active','suspended','deactivated')` and `app_users.deleted_at` (`supabase/migrations/20261103000000_init_schema.sql:19-23`) but nothing writes `deactivated` or `deleted_at`. |
| Friction points | **Confirmed:** (a) A member who wants to leave has no self-service path (Verified (Code)). (b) Changing password requires the "forgot password" detour (Verified (Code)). (c) WBS Q7 decided "delete = anonymise, keep content" but the legal retention policy is still open (Q-X-01), and WBS §4 notes that followed stories and authors who want to take their stories down need a policy first (Documented). **Hypothesised:** (d) authors leaving with co-authored stories or pending invitations will leave teams in an inconsistent state (Inferred from BR-TEAM, Q-TEAM-03). (e) Without an export, a Vietnamese/EU-style data-access request must be handled by hand (Inferred; legal scope Unknown). |
| Missing capabilities | CAP-ACCT-11, CAP-ACCT-12, CAP-ACCT-14, CAP-ACCT-15, CAP-ACCT-16. |
| Proposed improvement | FP-008 amendment: a **Settings → Account** section (email + change, password + change, sign-out everywhere) and a **Settings → Privacy & data** section (export, deactivate, delete) with re-authentication, consequences listed in plain language, a pre-delete choice per owned story (keep under "Deleted user" / unpublish first, per WBS Q7 note), and a proposed 14-day grace period (Q-AUTH-05, new BR text, needs approval). |
| Expected value | Launch compliance (WBS 6.4 is MVP), trust, fewer manual support operations. |
| Affected screens | SCR-SET-01, SCR-PRF-01, SCR-AUTH-01 (reactivation notice on sign-in), SCR-AUTHOR-01 ("Deleted user" rendering, discovery agent), SCR-TEAM-01 (studio agent) |
| Dependencies | Q-X-01 (legal), Q-AUTH-05, FP-002 (non-active accounts everywhere), FP-016 (team lifecycle), Q-AUTH-02 (secure email change setting) |
| Evidence | Code refs above; WBS 6.4 and §4 Q7. |

### JRN-ACC-05 — Language and accessibility preferences (guest and member)

| Field | Value |
| --- | --- |
| Journey ID | JRN-ACC-05 |
| User goal | "Use StoryNest in my language, comfortably (dark at night, larger controls, no motion), on every device." |
| Current workflow | Language: header "VI/EN" button on `(main)` pages (BR-I18N-006), stored on the device, synced to the account for members (BR-SET-004); Settings select. Reading comfort: reader settings sheet (font size, line spacing, font, background) on chapter pages and from Settings → Reading (WP 2.7). App theme: follows the OS only (`packages/design-tokens/src/tokens.css:6-7`); nothing sets the supported `.light`/`.dark` classes (`tokens.css:76-81`). Motion: no `prefers-reduced-motion` handling anywhere (search: no match). |
| Friction points | **Confirmed:** (a) No language switch on the auth pages (U-AUTH-01, `m-login.png`). Verified (Runtime). (b) Server HTML is always Vietnamese with `lang="vi"` (`apps/web/src/app/layout.tsx:34`, RT-08). Verified (Runtime). (c) Account language save fails silently (U-SET-01). Verified (Code). (d) The language button shows "VI" but is named "Switch to English" (`packages/features/src/shell/components/language-switcher.tsx:17-20`), so the visible label is not part of the accessible name (WCAG 2.5.3 Label in Name). Verified (Code). (e) No app-wide dark mode choice: a night reader whose OS is light can darken only the chapter (reader theme), while Home, story pages, Library and Settings stay light (Verified (Code); visual not observed: all screenshots are light). (f) Switching language remounts forms and discards input (U-I18N-02). Verified (Code). **Hypothesised:** (g) Users sensitive to motion get dialog/sheet animations (tw-animate-css) with no way to reduce them (Inferred). |
| Missing capabilities | CAP-ACCT-09 app theme, CAP-ACCT-10 accessibility preferences, CAP-PLAT-17 server-side language. |
| Proposed improvement | FP-036 (app theme System/Light/Dark + reduce motion, device + account, no-flash bootstrap); FP-021 amendment (switcher in auth layout and footer, label in name, sign-up sends language); FP-022 amendment (label-in-name, reduced motion base rule, focus ring); FP-037 (tokens). |
| Expected value | Comfortable long reading sessions (core use case), WCAG 2.1 AA progress (WBS 8.5), language parity from the first page. |
| Affected screens | SCR-SET-01, SCR-SHELL-01, SCR-AUTH-01…04, SCR-READ-01 (reader theme "site" follows the app theme; reading agent) |
| Dependencies | Q-SET-01, Q-I18N-01, FP-021, FP-022 |
| Evidence | Code refs above; RT-08; benchmark BM-02 (Wattpad keeps reader theme separate from app dark mode and has no web dark mode: anti-pattern for a web-first product). |

---

## 2. Capability rows

| Capability ID | Capability | Current StoryNest | Evidence | User value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| CAP-ACCT-01 | Email + password sign-up with email confirmation | Implemented | Verified (Code) WF-AUTH-01/02, `auth.api.ts:19-35`; SMTP end-to-end not run (WBS 1.1) | Account creation | none (gaps under FP-009) |
| CAP-ACCT-02 | Social sign-in (Google, approved Q6) | Missing | F-AUTH-02; WBS 1.1 🟡 | Faster sign-up, no password to forget | FP-009 |
| CAP-ACCT-03 | Resend confirmation, cross-device email links | Missing | F-AUTH-03, F-AUTH-04 | Fewer dead ends after sign-up/reset | FP-009 |
| CAP-ACCT-04 | First-run welcome (identity, interests, starter stories) + activation checklist | Missing | Verified (Code): no onboarding code; callback goes straight to `next` (`route.ts:16-21`) | Cold start solved, member feels at home | **FP-035** |
| CAP-ACCT-05 | Public identity: display name, username, bio, avatar | Implemented | BR-PRF-001…012 | Recognisable author/reader | none (rename redirect FP-011) |
| CAP-ACCT-06 | Account hub (`/me`: avatar, public page, Settings, Sign out, own counts) | Partial | U-PRF-01; `me-view.tsx:16-43` | One place to manage "me" | FP-019 (amended) |
| CAP-ACCT-07 | Interface language, synced across devices | Implemented (silent save failure; SSR always vi) | BR-SET-004, U-SET-01, RT-08 | Language parity | FP-021 (amended) |
| CAP-ACCT-08 | Notification preferences | Partial (in-app only, 3 types) | BR-SET-005/006; F-SET-01 | Control noise | FP-026 (community agent) |
| CAP-ACCT-09 | Reading preferences (size, spacing, font, background) | Implemented (synced) | WBS 2.7; BR-READ-* | Comfortable reading | none |
| CAP-ACCT-10 | App-wide display and accessibility preferences (theme, reduced motion) | Missing | `tokens.css:6-7,76-81` (classes supported, never set); no `prefers-reduced-motion` rule | Night reading, motion sensitivity | **FP-036** |
| CAP-ACCT-11 | Change password while signed in (reauthenticated) | Missing | F-AUTH-05 | Security hygiene | FP-009 (amended) |
| CAP-ACCT-12 | Change email | Missing | F-AUTH-07 | Keep access when an address changes | FP-008 (amended) |
| CAP-ACCT-13 | Session control (this device vs. all devices) | Partial (global only) | BR-AUTH-017, Q-AUTH-01 | Shared-device safety without logging out the phone | FP-009 (amended) |
| CAP-ACCT-14 | Deactivate / reactivate | Missing (status value exists in schema) | `init_schema.sql:19-20` | Take a break without losing the account | FP-008 (amended) |
| CAP-ACCT-15 | Delete = anonymise, keep content (Q7) | Missing | BR-AUTH-022, WBS 6.4 ⬜ | Right to leave; legal | FP-008 (amended) |
| CAP-ACCT-16 | Personal data export | Missing | WBS 6.4 | Portability; legal | FP-008 (amended) |
| CAP-ACCT-17 | Privacy controls: block/mute users, hide follow lists, opt out of personalised recommendations | Missing | BR-REC-008 (no opt-out); no block/mute tables (Verified (Code): no migration defines them) | Safety, control over exposure | none here: block/mute → trust-safety agent (BM-29/30); recommendation opt-out → FP-029 (discovery). See 7.1 |
| CAP-ACCT-18 | Suspended member is told what happened and what still works | Missing | F-MOD-06 (alias F-AUTH-08) | Fairness, fewer confused retries | FP-006 (trust-safety); shell banner slot noted in SE-SHELL-01 |
| CAP-ACCT-19 | Terms/Privacy reference at sign-up | Missing | SCR-AUTH-02 B note; WBS 6.9 ⬜ | Legal launch requirement | **FP-039** |
| CAP-ACCT-20 | Sign-up abuse protection (captcha, rate limit, leaked-password check) | Missing | F-ABU-02, WBS 6.8 🟡 | Spam-free community | FP-009 |
| CAP-PLAT-01 | Primary navigation at every width (390 / 768 / 1280) | Partial (mobile only) | Verified (Runtime) `t-home.png`, `d-home.png`; `bottom-nav.tsx:47`, `site-header.tsx:13-22` | Reach every section | FP-019 (amended) |
| CAP-PLAT-02 | Return to context after sign-in / sign-up / reset | Partial | U-SHELL-04, U-CMT-02, SCR-AUTH-01-A04 | Intent preserved | FP-019 + FP-009 (amended) |
| CAP-PLAT-03 | Branded, translated not-found / error pages with correct status | Missing | RT-01; Verified (Runtime) `m-notfound.png`, `d-notfound.png` (English "404 This page could not be found." on a white panel inside the cream shell) | Recovery, SEO | FP-004 (amended) |
| CAP-PLAT-04 | One loading / error / load-more pattern | Partial | FP-020 findings | Predictable states | FP-020 (amended) |
| CAP-PLAT-05 | Page-shaped loading skeletons | Partial (one grid skeleton for every route) | U-SHELL-03; `page-skeleton.tsx` | Less layout jump | FP-020 (amended) + FP-037 |
| CAP-PLAT-06 | Performance budget (LCP/INP/bundle) on production | Unverified | WBS 8.4 not started; dev Lighthouse 100 documented for story/chapter (BR-SEO-010) | Fast first read on mobile networks | none (WBS 8.4) |
| CAP-PLAT-07 | Page metadata: home/ranking/author canonical + share image; hreflang | Partial (story/chapter only) | Verified (Code): only `story/[id]/[slug]/page.tsx:28-31` and `…/[chapterSlug]/page.tsx:28-30` set `alternates`/`openGraph`; BR-SEO-010 | Link previews, SEO | FP-039 (defaults), FP-004 (author), FP-021 (language) |
| CAP-PLAT-08 | Site identity: favicon, app icons, web manifest, default share card | Missing | Verified (Code): no `icon.*`, `apple-icon.*`, `manifest.*`, `opengraph-image` at app root; no `apps/web/public` | Recognisable tab/bookmark/home-screen icon; input to WBS 7.5 | **FP-039** |
| CAP-PLAT-09 | Footer with About / Terms / Privacy / Copyright / language | Missing | Verified (Runtime) no footer on any `d-*.png`; WBS 6.9 ⬜ | Trust, legal, SEO internal links | **FP-039** |
| CAP-PLAT-10 | Skip link and landmarks | Partial (landmarks yes, skip link no) | RT-09 | Keyboard efficiency | FP-022 |
| CAP-PLAT-11 | Connectivity awareness on the web (offline banner, paused writes explained) | Missing | SCR-SHELL-01 D "Offline: Missing"; TanStack v5 default `networkMode: 'online'` not overridden (`packages/features/src/_shared/query.ts:17-32`) | No endless spinners on trains/lifts | **FP-038** |
| CAP-PLAT-12 | Offline reading of downloaded chapters | Missing (planned for the Capacitor app) | WBS 7.4 ⬜ | Reading without a connection | none (WBS 7.4; FP-038 prepares the adapter seam) |
| CAP-PLAT-13 | Native mobile shell (Capacitor) | Missing | `apps/mobile/.gitkeep` only; WBS 7.1–7.5 ⬜ | App-store presence | none (WBS Phase 7) |
| CAP-PLAT-14 | Design-system consistency (card/grid/chip/surface primitives, type scale, control sizing) | Partial | Section 7.2 | Coherent, denser, cheaper UI | **FP-037** |
| CAP-PLAT-15 | Visible focus and non-text contrast (WCAG 1.4.11, 2.4.7) | Partial | Focus ring effective 25 % alpha (computed 1.25:1 light); input border 1.31:1 (section 7.2 DS-05) | Keyboard and low-vision users | FP-037 + FP-022 (amended) |
| CAP-PLAT-16 | Security headers / CSP | Missing | F-SHELL-02 | Security | FP-023 (amended) |
| CAP-PLAT-17 | Server-rendered language | Missing | U-I18N-01, RT-08 | No flash, correct `lang` | FP-021 |
| CAP-PLAT-18 | Shell-less reading route (WBS §1.2 `(reader)` group) | Missing | Orchestrator observation; reader is under `(main)` | Immersive reading | none here: reading agent (section 7.1) |
| CAP-PLAT-19 | Unsaved-changes guard | Missing | FP-003 | No lost text | FP-003 |
| CAP-PLAT-20 | Living component reference (gallery covers every widget, both themes) | Partial | U-DEV-01; gallery subtitle claims "light and dark" | Faster, consistent UI work | FP-037 (gallery part) |

---

## 3. Screen enhancements

### SE-AUTH-01 — Sign in (SCR-AUTH-01)

**Current experience** — Centred card (`max-w-sm`) under a plain "StoryNest" brand link, outside the main shell
(`apps/web/src/app/(auth)/layout.tsx:5-13`, `packages/features/src/auth/components/auth-card.tsx:16`). Email, password
with show/hide, "Forgot password?", primary "Sign in", footer "Sign up". Error banner per BR-AUTH-013; `?error=callback`
notice. Known limitations: no Google (F-AUTH-02), no resend on "email not confirmed" (F-AUTH-03), no language switch
(U-AUTH-01), forgot link drops `next` (SCR-AUTH-01-A04), header entry has no `next` (U-SHELL-04).

**Identified opportunities**
- Missing functionality: Google button; resend confirmation inline on the "not confirmed" error; language switch. Verified (Code).
- UX/UI: all 5 interactive elements are under 44 px at every width (`metrics.json` login m/t/d: 5/5). Code confirms the primary button and inputs are `h-9` = 36 px (`packages/ui/src/components/button.tsx:22`, `input.tsx:10`) and the eye toggle is `size-9` inside the field. Verified (Runtime) + Verified (Code).
- UX/UI: at 1280 the card floats in a blank page with no way back except the brand (`d-login.png`); a reader who came from a chapter has no "Back to the story". Verified (Runtime).
- Workflow: `next` is lost on "Forgot password?" and when entering from the header. Verified (Code).
- IA: footer link "Sign up" is low-contrast muted text + primary link; acceptable. Contrast of primary on card computed 4.95:1 (passes AA). Inferred.

**Proposed experience**
- Layout: auth layout gets a top bar: left "← Back" (to `next` when it is a safe content path, otherwise Home), centre brand, right compact language menu (FP-021). Card unchanged in width (`max-w-sm`).
- Card content order: "Continue with Google" (outline, full width, 44 px) → divider "or" → email → password (+ "Forgot password?" right-aligned, now carries `next`) → primary "Sign in" (full width, 44 px) → footer "New to StoryNest? Create an account" (keeps `next`).
- "Email not confirmed" error banner gains an inline "Resend confirmation email" button with a 60 s cooldown and a neutral success text (FP-009).
- 390: card loses its border and shadow and becomes the page (edge-to-edge sections with 16 px gutters), so the form starts higher and the keyboard covers less; 768/1280: bordered card as today, vertically centred.
- Density: controls use the coarse-pointer control height (FP-037 `--size-control` = 44 px on touch, 40 px on fine pointers); the password toggle keeps a 44 px hit area.
- Already-signed-in-in-another-tab: listen to the auth broadcast and redirect to `next` (closes the Inferred "Missing" state in SCR-AUTH-01 D).

**Acceptance criteria**
- SE-AUTH-01-AC01 [Proposed] Given a guest on `/story/x/y` who clicks the header "Sign in", When they sign in successfully, Then they land on `/story/x/y`.
- SE-AUTH-01-AC02 [Proposed] Given `/login?next=%2Flibrary`, When the user follows "Forgot password?", completes the reset from the email link, Then they end on `/library`.
- SE-AUTH-01-AC03 [Proposed] Given the "email not confirmed" error, When the user presses "Resend confirmation email", Then a new email is requested, the button is disabled with a countdown for 60 s, and the same neutral message shows whether or not the account exists.
- SE-AUTH-01-AC04 [Proposed] Given a 390 px touch viewport, When the sign-in page renders, Then the email and password fields, the toggle, "Forgot password?" and "Sign in" each have a hit area of at least 44 × 44 px.
- SE-AUTH-01-AC05 [Proposed] Given the sign-in page in Vietnamese, When the user opens the language menu and chooses English, Then all card texts switch without reload and typed values are kept.
- SE-AUTH-01-AC06 [Proposed] Given `next` is a safe content path, When the page renders, Then a "Back" control returns to that path without signing in.

**Impact** — Frontend: auth layout, `SignInScreen`, `AuthCard` variant. Backend/API: none (resend uses `auth.resend`). Database: none. Shared components: `Button`/`Input` sizing via FP-037; `LanguageSwitcher` reused. Business rules: BR-AUTH-007 unchanged (all `next` still pass `safeRedirectPath`). Other screens: SCR-SHELL-01 (header link with `next`), SCR-AUTH-03/04.

**Related** — FP-009, FP-019, FP-021, FP-037; F-AUTH-02, F-AUTH-03, U-AUTH-01, U-SHELL-04.

**Priority** — P2: conversion and return-to-context for every member; nothing here blocks launch on its own, but Google sign-in (approved Q6) does sit in the M1 scope.

### SE-AUTH-02 — Sign up (SCR-AUTH-02)

**Current experience** — Card with email, password (+hint), optional username (+hint), optional display name, "Sign up",
footer "Sign in"; success → "Check your email" card with the address and a "Sign in" link (SCR-AUTH-02-C09). No captcha,
no terms reference, no Google.

**Identified opportunities**
- Missing functionality: Google (F-AUTH-02), captcha (F-ABU-02), resend on the check-email card (F-AUTH-03), Terms/Privacy reference (WBS 6.9). Verified (Code).
- UX/UI: four fields + two multi-line hints put the button at y≈557 of 844 px at 390 px (`m-register.png`); with the on-screen keyboard open (roughly the lower 40 % of the screen) the button and the later fields are hidden while typing (Inferred). The two optional fields are also the ones that cause silent username changes (F-AUTH-01). Verified (Runtime) + Verified (Code).
- Workflow: the check-email card's "Sign in" link invites people to sign in before confirming, which then fails with "email not confirmed". Inferred.
- Workflow: the language chosen on the device is not sent with sign-up, so confirmation emails cannot be localised (`auth.api.ts:24-31` sends only username/display name; email templates are not in the repo: Unknown).

**Proposed experience**
- Form: "Continue with Google" → divider → email → password (strength hint stays one line) → primary "Create account" → one line of small text "By creating an account you agree to the Terms and the Privacy Policy" with links (FP-039; checkbox only if legal requires it, Q-X-02) → footer "Already have an account? Sign in".
- Username and display name leave the form and move to the first-run welcome (FP-035) where availability is checked live (BRC-AUTH-01). If BRC-AUTH-01 is rejected: keep the fields but show a live preview of the final handle ("Your address will be storynest…/author/myname_2026") and availability (FP-009 AC).
- Captcha: invisible Turnstile/hCaptcha, challenge shown only when needed (FP-009).
- Sign-up sends `data.locale = <current language>` so Supabase templates can branch on it (FP-021 amendment).
- Check-email card: address in bold, "Open your email and tap the link. It may take a minute; check Spam/Promotions." Actions: "Resend" (60 s cooldown), "Use a different email" (back to the form with the email pre-filled), and the sign-in link renamed "I've confirmed, sign in".
- 390 vs 768/1280: same as SE-AUTH-01 (borderless on phone).

**Acceptance criteria**
- SE-AUTH-02-AC01 [Proposed] Given BRC-AUTH-01 is approved, When the sign-up form renders, Then it shows "Continue with Google", email and password only, and the identity fields appear in the welcome flow after confirmation.
- SE-AUTH-02-AC02 [Proposed] Given the check-email card, When the user presses "Resend", Then a new confirmation email is requested and the button shows a 60 s countdown.
- SE-AUTH-02-AC03 [Proposed] Given the check-email card, When the user presses "Use a different email", Then the form reappears with the previous email selected for editing.
- SE-AUTH-02-AC04 [Proposed] Given the interface is English, When the user signs up, Then the request carries `locale = "en"` in user metadata.
- SE-AUTH-02-AC05 [Proposed] Given the Terms and Privacy pages exist, When the sign-up form renders, Then both are linked under the submit button and open in the same tab with a way back.

**Impact** — Frontend: `SignUpScreen`, check-email card. Backend/API: `signUp` metadata (`locale`), `auth.resend`. Database: none (trigger unchanged unless FP-009 aligns username rules). Shared components: FP-037 sizing. Business rules: BRC-AUTH-01 (BR-AUTH-003). Other screens: SCR-PRF-03 Welcome [Proposed].

**Related** — FP-009, FP-035, FP-039, FP-021; F-AUTH-01…04, F-ABU-02.

**Priority** — P2: conversion-critical; legal line becomes P1 once Q-X-02 delivers content (tracked in FP-039).

### SE-AUTH-03 — Forgot password (SCR-AUTH-03)

**Current experience** — Card: heading, description, email, "Send link", "Back to sign in"; on success a neutral
"Instructions sent" status card replaces the form (BR-AUTH-014). `m-forgot.png` matches.

**Identified opportunities**
- Missing: resend/cooldown after the sent card (SCR-AUTH-03-AC05 [Proposed] already); `next` is not carried in. Verified (Code).
- UX: the sent card does not repeat the address, so a typo goes unnoticed. Verified (Code) (`forgot-password-screen.tsx` shows only the generic text).
- Workflow: the email link opened on another device ends on `/login?error=callback`, not on "request a new link" (F-AUTH-04). Inferred.

**Proposed experience** — Accept `?next=` and pass it into `redirectTo` (`/auth/callback?next=/reset-password?next=<next>`);
pre-fill the email when arriving from the sign-in form; sent card shows "We sent a link to **a@b.c** if it has an account",
"Resend" (60 s), "Use a different email", "Back to sign in". No layout change beyond SE-AUTH-01's auth frame.

**Acceptance criteria**
- SE-AUTH-03-AC01 [Proposed] Given the user typed an email on SCR-AUTH-01, When they follow "Forgot password?", Then the email field is pre-filled.
- SE-AUTH-03-AC02 [Proposed] Given the sent card, Then it shows the address the link was sent to and the neutral wording of BR-AUTH-014.
- SE-AUTH-03-AC03 [Proposed] Given `/forgot-password?next=%2Fstudio`, When the reset completes, Then the user lands on `/studio`.

**Impact** — Frontend: `ForgotPasswordScreen`, `withNext`. Backend/API: none. Database: none. Shared components: none. Business rules: BR-AUTH-014 unchanged. Other screens: SCR-AUTH-01, SCR-AUTH-04.

**Related** — FP-009; F-AUTH-04; SCR-AUTH-03-AC05.

**Priority** — P3: small convenience on a low-frequency path.

### SE-AUTH-04 — Reset password (SCR-AUTH-04)

**Current experience** — With a session: new password + confirmation, "Change password" → toast → `/`. Without a session:
"This link is invalid or has expired" + "Request a new link" (`m-reset.png`). Any normal session can use the form
without the current password (F-AUTH-05).

**Identified opportunities**
- Security: recovery vs. normal session not distinguished (F-AUTH-05). Verified (Code).
- Workflow: always lands on `/`; other sessions are not ended by the app (WF-AUTH-04 postconditions; Unknown in Supabase). Verified (Code) / Unknown.
- UX: the invalid-link card is a heading + one link (`m-reset.png`); it does not say the two usual causes (older link, opened in another browser/app). Verified (Runtime).

**Proposed experience** — The form is only offered for a **recovery** session (detected from the callback, e.g. a short-lived
`recovery` flag set by the callback after `verifyOtp({ type: 'recovery' })`); a normal signed-in user visiting
`/reset-password` is sent to Settings → Account → Change password (reauthentication, FP-009). Form adds
"Sign out of other devices" (checked by default; Q-AUTH-06). Success → toast "Password changed. You're signed in."
→ `next` (default `/`). Invalid-link card: explanation of both causes, "Request a new link" as a primary button (not a text
link), and "Back to sign in".

**Acceptance criteria**
- SE-AUTH-04-AC01 [Proposed] Given a normal (non-recovery) session, When `/reset-password` is opened, Then the user is redirected to the Settings change-password flow that requires the current password or a reauthentication code.
- SE-AUTH-04-AC02 [Proposed] Given a recovery session and "Sign out of other devices" checked, When the password is changed, Then all other sessions of the account are ended and this one stays signed in.
- SE-AUTH-04-AC03 [Proposed] Given the reset started from `/login?next=%2Flibrary`, When the password is changed, Then the user lands on `/library`.
- SE-AUTH-04-AC04 [Proposed] Given no session, When the page opens, Then a primary "Request a new link" button and a one-sentence explanation of the usual causes are shown.

**Impact** — Frontend: `ResetPasswordScreen`, route guard. Backend/API: callback (`verifyOtp`, recovery flag), `signOut({ scope: 'others' })`. Database: none. Shared components: none. Business rules: BR-AUTH-015 refined (recovery session only) — part of FP-009, needs approval. Other screens: SCR-SET-01 (Account section).

**Related** — FP-009; F-AUTH-04, F-AUTH-05; Q-AUTH-01, Q-AUTH-02, Q-AUTH-06.

**Priority** — P2: closes a security gap (F-AUTH-05) already rated P2.

### SE-PRF-01 — My profile (SCR-PRF-01)

**Current experience** — `PageHeader` "Your profile" + outline "Edit profile"; a definition list (display name, `@username`,
email, bio) in a `bg-card p-5` box (`apps/web/src/app/(main)/me/me-view.tsx:16-43`). Entry: bottom-nav "Me" (mobile) and
user menu "Profile". Web-only component (not a `packages/features` screen). Load errors show "No profile was found"
(F-PRF-01). No avatar, public page link, Settings or Sign out (U-PRF-01).

**Identified opportunities**
- IA: "Me" in the bottom nav leads to a read-only data sheet; Settings, Sign out and the public page live only in the avatar menu (U-PRF-01). Verified (Code).
- Missing: an activation checklist for new members (FP-035), own counts (stories, followers, following, lists) that already exist in other RPCs (author page header). Verified (Code) for absence.
- Architecture: web-only view breaks the WBS Q1 pattern; mobile will need a copy. Verified (Code).
- States: error shown as missing profile (F-PRF-01). Verified (Code).

**Proposed experience** — Turn `/me` into the **account hub** (move to `packages/features/src/profile/screens/me-screen.tsx`):
1. Identity header: 72 px avatar, display name (`text-title`), `@username`, one-line bio (expandable), primary "Edit profile", secondary "View public page" (`/author/<username>`).
2. Counts row (StatPill): stories, followers, following, reading lists (each a link: own author page, followers list later, Library → Following, Library → Lists).
3. Activation checklist card (FP-035) while incomplete and not dismissed.
4. Navigation list (row style, 56 px rows on touch): Library, Studio, Notifications, Settings, Moderation (moderators), Help/Terms (FP-039), "Sign out".
5. Email is shown under Settings → Account, not here (it is private data; the hub is visible on shared screens).
- 390: single column, rows full width. 768: same, `max-w-2xl`. 1280: two columns: identity + counts left (`max-w-sm`), checklist + navigation list right; or a single `max-w-3xl` column if the desktop header nav (FP-019) already covers Library/Studio.
- Error state: `ErrorState` with "Try again" (FP-020).

**Acceptance criteria**
- SE-PRF-01-AC01 [Proposed] Given a signed-in member on `/me`, Then their avatar, display name, `@username`, "Edit profile", "View public page", Settings and "Sign out" are visible without opening the user menu.
- SE-PRF-01-AC02 [Proposed] Given the profile query fails, Then an error state with "Try again" is shown and no "No profile was found" text.
- SE-PRF-01-AC03 [Proposed] Given a member who joined less than 14 days ago with an incomplete checklist, When `/me` opens, Then the checklist card shows the completed and remaining items; When they dismiss it, Then it does not show again on any device.
- SE-PRF-01-AC04 [Proposed] Given a 390 px touch viewport, Then each navigation row is at least 44 px tall and the whole row is the hit area.

**Impact** — Frontend: new shared `MeScreen`, web route uses it. Backend/API: reuse author-page counts RPC; `my_activation_status()` (FP-035). Database: `user_settings.checklist_dismissed_at` (FP-035). Shared components: `StatPill`, `Surface`, row list (FP-037). Business rules: BR-PRF-013 ("My profile content") rewritten — part of FP-019 approval. Other screens: SCR-SHELL-01 (user menu can shrink), SCR-SET-01.

**Related** — FP-019 (amended), FP-020, FP-035; F-PRF-01, U-PRF-01.

**Priority** — P2: it is the bottom-nav destination for every mobile member; today it dead-ends.

### SE-PRF-02 — Edit profile (SCR-PRF-02)

**Current experience** — Own `h1` (not `PageHeader`), avatar editor (80 px preview, add/change/remove), display name,
username (+hint), bio (5 rows, "Up to 1000 characters"), "Save changes" (disabled until dirty), "Cancel"
(`packages/features/src/profile/screens/edit-profile-screen.tsx:90-155`). No unsaved-changes guard (U-PRF-02), username
availability only on save (SCR-PRF-02-AC10 [Proposed]), rename breaks old links (U-PRF-03).

**Identified opportunities**
- UX: no live bio counter; picture removal has no confirmation or undo. Verified (Code).
- UX: username change consequences ("your address changes; old links stop working") are in a hint only. Verified (Code).
- Consistency: own heading markup and own error banner duplicate `PageHeader` and `FormError` (`edit-profile-screen.tsx:91-103` vs `auth-card.tsx:28-37`). Verified (Code).
- Missing: preview of how the profile looks publicly. Inferred value.

**Proposed experience** — `PageHeader` with back to `/me`; sections as `Surface`s: "Picture" (avatar editor; "Remove"
asks for confirmation via `ConfirmDialog` or offers an "Undo" toast), "Public details" (display name; username with live
availability + the resulting address `/author/<name>`; a warning row when the username differs from the saved one:
"Links to your old address will stop working" until FP-011 adds redirects), "About" (bio with live counter `n / 1000`).
Sticky save bar on 390 (bottom, above the bottom nav) once the form is dirty; inline buttons at 768/1280. Unsaved-changes
guard per FP-003. "Preview public page" opens `/author/<username>` in the same tab after save.

**Acceptance criteria**
- SE-PRF-02-AC01 [Proposed] Given the user types a username taken by someone else (any case), When they pause typing for 400 ms, Then "This username is already taken." appears before saving.
- SE-PRF-02-AC02 [Proposed] Given the bio has 990 characters, Then the counter shows "990 / 1000" and turns to the warning colour from 950.
- SE-PRF-02-AC03 [Proposed] Given a picture is set, When the user presses "Remove picture", Then they can confirm or undo, and the picture is not deleted from Storage until confirmed or the undo period ends.
- SE-PRF-02-AC04 [Proposed] Given unsaved edits on a 390 px screen, Then a sticky bar with "Save changes" and "Discard" stays visible above the bottom navigation.

**Impact** — Frontend: `EditProfileScreen`, `AvatarEditor`. Backend/API: `is_username_available(text)` SECURITY DEFINER RPC (shared with FP-035). Database: none. Shared components: `PageHeader`, `FormAlert` (moved `FormError`), `Surface`. Business rules: BR-PRF-010 ordering unchanged if removal is confirmed first. Other screens: SCR-PRF-03 Welcome reuses the identity form.

**Related** — FP-003, FP-011, FP-035, FP-037; U-PRF-02, U-PRF-03.

**Priority** — P3: low-frequency screen; the availability RPC is shared with FP-035, so build them together.

### SE-SET-01 — Settings (SCR-SET-01)

**Current experience** — `PageHeader` "Settings — Saved in your account, used on every device." then four bordered
sections (`settings-screen.tsx:29-38`, no `bg-card`): Language (select), Notifications (3 switches), Reading (opens the
reader settings sheet), Adult content (switch + age dialog). Entry only from the user menu. No account, security,
privacy or data management (F-AUTH-07); language save failure silent (U-SET-01); switches have no pending state (U-SET-02).

**Identified opportunities**
- Missing functionality: Account (email, password, sessions), Privacy & data (export, deactivate, delete), Display (app theme, reduced motion), reading interests (FP-035). Verified (Code).
- IA: the header copy "Saved in your account, used on every device" is not true for every section (reading preferences sync, language may fail silently, 18+ has device copy). Verified (Code).
- UX/UI: `Switch` is `h-[1.15rem] w-8` (≈ 18 × 32 px) (`packages/ui/src/components/switch.tsx`); the label is clickable via `htmlFor`, but the row itself is not, so on touch the reliable target is small. Verified (Code).
- Consistency: sections are transparent bordered boxes while `/me` uses `bg-card` boxes and auth uses `bg-card shadow-xs` (section 7.2 DS-03). Verified (Code).

**Proposed experience** — Group by user intent, in this order (each a `Surface` with an `h2` `text-section`):
1. **Account** — email (masked) + "Change" (FP-008), password + "Change" (reauth, FP-009), "Sign out of all devices" (FP-009), connected Google account when FP-009 ships.
2. **Language & display** — interface language (segmented VI/EN), theme System/Light/Dark, Reduce motion (FP-036).
3. **Reading** — inline summary of current reader preferences ("Medium text · Relaxed spacing · Serif · Sepia") + "Change" (sheet), reading interests chips (FP-035).
4. **Notifications** — existing switches, each disabled while saving (U-SET-02); room for email/push columns (FP-026, community agent).
5. **Content** — Adult content (18+) as today (OBJ-MAT, trust-safety agent owns rules).
6. **Privacy & data** — "Download my data", "Deactivate account", "Delete account" (FP-008), danger styling only on the last two.
- Whole switch rows become the hit area (`<label>` wraps the row; ≥ 44 px on touch).
- Save feedback: inline "Saved" status text per section (polite live region) instead of silence; language failure → "Saved on this device only. Retry" (U-SET-01).
- 390: one column, sections stacked. 768: same, `max-w-2xl`. 1280: two-column layout with a sticky section index on the left (`lg:grid-cols-[12rem_1fr]`) so the long page is navigable; anchors `#account`, `#display`… are linkable from `/me` and the welcome flow.
- Page description becomes "Your account, display, reading and notification settings."

**Acceptance criteria**
- SE-SET-01-AC01 [Proposed] Given a member on `/settings` at 1280 px, Then a section index lists Account, Language & display, Reading, Notifications, Content and Privacy & data, and selecting one scrolls to it and updates the URL hash.
- SE-SET-01-AC02 [Proposed] Given a notification switch save is pending, Then that switch is disabled and the row shows a pending indicator until it settles (U-SET-02).
- SE-SET-01-AC03 [Proposed] Given a 390 px touch screen, When the user taps anywhere on a switch row, Then the switch toggles.
- SE-SET-01-AC04 [Proposed] Given the language could not be saved to the account, Then the Language section shows "Saved on this device only" with "Retry".
- SE-SET-01-AC05 [Proposed] Given the Privacy & data section, When the member presses "Delete account", Then the FP-008 flow starts with reauthentication and a list of consequences; no data changes before final confirmation.

**Impact** — Frontend: `SettingsScreen` restructure, `SwitchRow`. Backend/API: FP-008 RPCs, FP-009 auth calls, FP-036 settings columns. Database: `user_settings` new columns (FP-035/FP-036). Shared components: `Surface`, segmented control (Tabs `line` variant or ToggleGroup — add to ui), row-as-label pattern. Business rules: BR-SET-007 save semantics extended (per-section status). Other screens: SCR-PRF-01 links into anchors.

**Related** — FP-008, FP-009, FP-021, FP-026, FP-035, FP-036, FP-037; F-AUTH-07, F-SET-01, U-SET-01, U-SET-02.

**Priority** — P1: it is the home of FP-008 (P1, MVP, WBS 6.4); restructuring before adding sections avoids a second redesign. The display and interests parts alone would be P3.

### SE-SHELL-01 — Main shell (SCR-SHELL-01)

**Current experience** — `AppShell`: sticky 56 px header (`max-w-5xl`), content column `max-w-5xl px-4 py-6`, mobile bottom
nav (Home, Library, Write, Me) hidden from `md`, generic grid skeleton, sonner toaster, no footer
(`packages/ui/src/widgets/app-shell.tsx:22-34`, `bottom-nav.tsx:47`, `main-shell.tsx:13-18`). Header right side: SearchBox
(icon < `sm`, field ≥ `sm`), 18+ button, "VI/EN", bell (members), user menu or "Sign in" (`site-header.tsx:13-22`).
Missing: desktop nav (U-SHELL-01), `next` on sign-in (U-SHELL-04), not-found/error pages (F-SHELL-01), skip link (RT-09),
offline state, footer.

**Identified opportunities**
- **Desktop navigation (1280)**: header has brand + controls only; Rankings, Following, Library, Studio are reachable only via Home links or the avatar menu. Verified (Runtime) `d-home.png`, `d-story.png`; Verified (Code).
- **Tablet 768**: the bottom nav is hidden at exactly 768 px (`md:hidden`), and the header has no links, so a tablet in portrait has **no** primary navigation; for guests only the brand link leads anywhere. Verified (Runtime) `t-home.png`, `t-story.png`.
- **Header density (390)**: guest header = brand + search icon + 18+ icon + "VI" + filled "Sign in" (`m-home.png`); a member adds bell and avatar = 6 controls in 358 px. The 18+ shield icon has no visible text. The language button's visible text "VI" is not in its accessible name "Switch to English" (WCAG 2.5.3). Verified (Runtime) + Verified (Code) `language-switcher.tsx:17-20`.
- Header targets under 44 px: language `size="sm"` 32 px, icons 36 px (U-SHELL-02). Verified (Code).
- **Footer absence**: no footer at any width; no About/Terms/Privacy/Copyright; nothing at the end of long pages (`d-home.png` ends with "You've seen all the stories"). Verified (Runtime).
- **Skip link**: none; first tab stop is the brand (RT-09). Verified (Runtime, Phase 1).
- **Loading**: one card-grid `PageSkeleton` for every route (U-SHELL-03) including forms, story page and reader. Verified (Code).
- **Error / 404**: Next default English page; at runtime it renders a white panel inside the cream shell (`m-notfound.png`, `d-notfound.png`) with HTTP 200 for missing stories (RT-01). Verified (Runtime).
- **Toasts**: sonner with default position (bottom-right; full-width bottom on small screens) while the bottom nav is fixed at the bottom with `z-40` (`providers.tsx:41`, `sonner.tsx`). Toasts may cover the nav on phones. Inferred (not observed).
- **Content width**: one `max-w-5xl` (1024 px) for every page; browse grids get 4 columns of 232 px cards that are 511 px tall at 1280 (`metrics.json` d-home), while forms (`max-w-xl`) sit left-aligned in the same column. Verified (Runtime) + Verified (Code).
- **Reader inside the shell**: chapter pages render with header + bottom nav (WBS §1.2 planned a shell-less `(reader)` group). Verified (Runtime) `m-reader.png`; the reading agent owns the decision; the shell must support a "chromeless" variant.
- **Offline**: no indicator; with TanStack v5 defaults, offline requests pause rather than fail (FP-038). Inferred.

**Proposed experience**
- **Breakpoints** (BRC-SHELL-01): bottom nav visible below `lg` (1024 px) instead of below `md`; from `lg` the header shows section links. Rationale: 768–1023 px devices are mostly touch tablets in portrait, where a bottom bar is the expected pattern and the header has no room for links plus a search field.
- **Header ≥ lg (1280)**: `[Brand] [Home] [Rankings] [Library] [Write]  ……  [Search field] [Bell] [Avatar]`. Active link `aria-current="page"` with a 2 px primary underline. "Following" becomes a Library tab or a Home section (FP-019; discovery agent). Language and theme move to the user menu and the footer; 18+ toggle placement per Q-SHELL-02 (trust-safety agent): proposed in the user menu for members and in the guest "⋯" menu, keeping the gate itself unchanged.
- **Header < lg (390/768)**: `[Brand] …… [Search icon] [Bell] [Avatar | Sign in]`; guests get a compact "⋯" menu (Language, 18+, Theme, About). Every control 44 × 44 on touch (FP-037 tokens). "Sign in" becomes an outline/ghost button so the page's own primary CTA is the only filled button above the fold.
- **Bottom nav** labels stay "Home / Library / Write / Me"; the user menu shows the same icons next to "Library / Studio / Profile" so both read as the same destinations (label unification is left to FP-019).
- **Footer** (FP-039): end-of-page footer on every `(main)` page; on < lg placed above the bottom-nav padding (not fixed).
- **Skip link**: first focusable element "Skip to content" → `<main id="content" tabindex="-1">` (FP-022).
- **Status slot**: a banner region under the header for: offline (FP-038), suspended account (FP-006), email not confirmed (if confirmation becomes optional later). One component, one queue, polite live region.
- **Loading**: `PageSkeleton` variants `grid | detail | list | form | reader` chosen per route segment via route-level `loading.tsx` files (FP-020/FP-037).
- **Errors**: `not-found.tsx`, `error.tsx` inside the shell, `global-error.tsx` with its own minimal styles (FP-004).
- **Toasts**: `position="top-center"` below `lg`, `bottom-right` from `lg`; or keep bottom with `mobileOffset` = bottom-nav height + safe area.
- **Content width tokens**: `AppShell` gets `width: "browse" | "default" | "narrow" | "reading"` → `max-w-6xl` (browse grids, 5 columns at `xl`), `max-w-5xl` (default), `max-w-2xl` centred (forms/settings), `--reader-measure` (reader). Fixes the left-aligned forms and the over-tall 4-column cards at 1280.
- **Chromeless variant** for the reader route (decision by the reading agent): `AppShell` prop `chrome="none"` hides header/bottom nav, keeping safe areas and the status slot.

**Acceptance criteria**
- SE-SHELL-01-AC01 [Proposed] Given a 768 × 1024 viewport on any `(main)` page, Then the bottom navigation is visible and Home, Library, Write and Me are one tap away.
- SE-SHELL-01-AC02 [Proposed] Given a 1280 px viewport, Then Home, Rankings, Library and Write links are visible in the header and the current section is marked `aria-current="page"`.
- SE-SHELL-01-AC03 [Proposed] Given keyboard focus at the top of any `(main)` page, When Tab is pressed once, Then "Skip to content" is focused and visible; When Enter is pressed, Then focus moves to the main content.
- SE-SHELL-01-AC04 [Proposed] Given a 390 px touch viewport, Then every header control has a hit area of at least 44 × 44 px and the header contains at most four controls besides the brand.
- SE-SHELL-01-AC05 [Proposed] Given the language control, Then its accessible name contains its visible text (e.g. visible "VI", name "Ngôn ngữ: VI — Tiếng Việt").
- SE-SHELL-01-AC06 [Proposed] Given any `(main)` page scrolled to the end, Then a footer with About, Terms, Privacy, Copyright and the language choice is shown, above the bottom navigation on phones.
- SE-SHELL-01-AC07 [Proposed] Given a toast is shown on a 390 px screen, Then it does not overlap the bottom navigation.
- SE-SHELL-01-AC08 [Proposed] Given the user navigates to `/settings`, Then the loading placeholder has the shape of a form (heading + sections), not a card grid.
- SE-SHELL-01-AC09 [Proposed] Given a missing story id, Then the response is 404 and the translated not-found page is rendered inside the shell with the same background as other pages (FP-004).

**Impact** — Frontend: `AppShell` (width, chrome, footer, status slot), `BottomNav` breakpoint, `SiteHeader` composition, `UserMenu`, route `loading.tsx` per segment, `not-found`/`error` files. Backend/API: none. Database: none. Shared components: `AppShell`, `BottomNav`, `PageSkeleton`, new `SiteFooter`, `StatusBanner`. Business rules: BR-SHELL-002 and BR-SHELL-004 (BRC-SHELL-01), BR-I18N-006 (BRC-I18N-01). Other screens: every `(main)` screen (width prop), SCR-READ-01 (chromeless), SCR-MAT-01 (18+ toggle placement).

**Related** — FP-004, FP-019, FP-020, FP-022, FP-037, FP-038, FP-039, FP-006; U-SHELL-01…04, F-SHELL-01, RT-01, RT-09.

**Priority** — P1: tablet portrait has zero navigation (runtime-confirmed) and missing/error pages are already P1 (FP-004); the density and footer parts are P2.

### SE-DEV-01 — Dev gallery (SCR-DEV-01)

**Current experience** — Development-only page with its own `AppShell` + `BottomNav` (Home, Gallery, Library, Me);
sections Buttons, Form controls, Display, Navigation/overlays, States, Infinite list (`apps/web/src/app/dev/gallery/gallery.tsx`).
Subtitle says "Every shared primitive and widget, light and dark" but there is no theme switch and StoryCard, StoryCover,
ReadingProgress, PageSkeleton are missing (U-DEV-01, BR-DEV-004).

**Identified opportunities**
- The gallery is the only place where the design system is visible, yet it omits the most-used widget (StoryCard, 8 call sites) and cannot show dark mode. Verified (Code) + Verified (Runtime, Phase 1 `mobile-dev-gallery.png`).
- No density/pointer simulation, so 36 px controls look fine on a desktop monitor. Inferred.
- Copy overclaims ("light and dark"). Verified (Code).

**Proposed experience** — Toolbar: Theme (System/Light/Dark/Sepia reader), Pointer (fine/coarse → toggles a
`data-pointer="coarse"` attribute mirroring the media query so `--size-control` can be previewed), Language (VI/EN, also
proves no hard-coded text). New sections: "Tokens" (colour swatches with computed contrast pairs, radius, type scale,
spacing), "Story" (StoryCard `grid`/`row`/`rail` with and without cover, long Vietnamese title, 18+ badge, rank leading
slot, progress slot; StoryCover placeholder), "Page states" (PageSkeleton variants, EmptyState with action, ErrorState),
"Shell" (header at 390/768/1280 via iframes or container queries). Keep it dev-only (BR-DEV-001).

**Acceptance criteria**
- SE-DEV-01-AC01 [Proposed] Given the gallery, When "Dark" is chosen, Then every section renders with the dark tokens without reload.
- SE-DEV-01-AC02 [Proposed] Given the gallery, Then StoryCard is shown in all variants with and without a cover image and with a 2-line Vietnamese title.
- SE-DEV-01-AC03 [Proposed] Given "Pointer: coarse", Then buttons, inputs and icon buttons render at the coarse control size (44 px).
- SE-DEV-01-AC04 [Proposed] Given any build, Then `/dev/gallery` remains 404 in production and `noindex,nofollow` (BR-DEV-001/002 unchanged).

**Impact** — Frontend: `gallery.tsx` only. Backend/API: none. Database: none. Shared components: consumes FP-037 variants. Business rules: BR-DEV-004 coverage updated. Other screens: none.

**Related** — FP-037, FP-036; U-DEV-01.

**Priority** — P3: developer-facing, but cheap and it is the acceptance surface for FP-037.

---

## 4. New feature proposals

### FP-035 — First-run welcome and activation checklist

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-ACCOUNT · OBJ-PRF (+ OBJ-SET, uses OBJ-LIB, OBJ-TAX) · new SCR-PRF-03 Welcome `/welcome` [Proposed], SCR-PRF-01, SCR-AUTH-02, SCR-HOME-01 (checklist card), SCR-SET-01 (interests) |
| User problem | After confirming their email a new member lands on `next` (default `/`) and sees the guest home: a username they never chose, no picture, an empty library, so "Recommended for you" shows nothing and nothing suggests a first step (read, save, follow, write). |
| Evidence / hypothesis | Verified (Code): callback redirects straight to `next` (`apps/web/src/app/auth/callback/route.ts:16-21`); username derived/suffixed by `handle_new_user` (`20261103000100_auth_and_rls.sql:33-46`); "Recommended for you" hidden when empty (BR-REC-005, `discover-home.tsx:9-13`) and needs follows/saves (BR-REC-004); no onboarding code. Signed-in runtime not observed. Hypothesis (Inferred): activation drop-off after the email round-trip. Benchmark BM-33 (Wattpad genre picks at sign-up seed the feed; StoryNest should make them editable). |
| Current limitation | No first-session state, no username availability feedback before save, no starter content, no "what next" checklist. |
| Proposed solution | **A. Welcome flow** `/welcome?next=…` (protected, `packages/features/src/profile/screens/welcome-screen.tsx`), 3 steps with a progress indicator, each skippable, "Skip all" always visible: (1) *Your public identity* — avatar (reuse `AvatarEditor`), display name, username with live availability and the resulting address; (2) *What do you like to read?* — top-level categories as chips (0–5) + interface language confirmation; (3) *Start here* — 6–8 stories from the chosen categories (existing feed/ranking RPCs filtered by category; mature excluded unless the account already opted in) with one-tap "Save" (existing save API), and a "Start writing" card → `/studio/new`. Finish → `next`. **B. Entry rule**: shown once per account (`user_settings.onboarded_at IS NULL`); the callback (and Google first sign-in, FP-009) redirects to `/welcome?next=<next>` only when `next` is `/` or a non-content page; when `next` is a content page (story, chapter, author, list) the member goes there directly and gets a one-time toast "Welcome! Finish setting up your profile" linking to `/welcome?next=<current>`. **C. Activation checklist** on `/me` and as a dismissible card on Home for 14 days: Add a picture · Save a story · Follow an author · Read a chapter · (optional) Write your first story. Computed from existing data by `my_activation_status()`; dismissal stored in `user_settings.checklist_dismissed_at`. **D. Interests** stored as `user_settings.preferred_category_ids uuid[]` (≤ 5), editable in Settings → Reading; consumers: step 3 ordering now, cold-start recommendations later (discovery agent, see 7.1). |
| Expected benefit | First session ends with a personal library (seeds `library_similar` recommendations immediately), chosen identity instead of `user_xxxx`, clear next steps. Measurable from existing tables (operator SQL: % of new members with ≥ 1 save/follow/read within 7 days). |
| Scenarios & main flow | 1. Guest signs up from Home (no `next`). 2. Confirms email → callback → `/welcome?next=%2F`. 3. Step 1: keeps suggested display name, changes username, sees "available". 4. Step 2: picks Romance and Fantasy; language stays VI. 5. Step 3: saves two stories. 6. "Done" → `/` shows "Recommended for you" based on the saves and the checklist card (2 of 5 done). |
| Alternative / error flows | A1. Sign-up came from "Sign in to vote" on a chapter: callback goes to the chapter; toast offers the welcome later. A2. "Skip all" → `onboarded_at` set, `next`. A3. Leaving mid-flow (tab closed): `onboarded_at` stays NULL; next sign-in on `/` shows the flow again once, then sets it. E1. Username taken between check and save → field error, stays on step 1. E2. Avatar upload fails → inline error, can continue. E3. Starter list empty (no stories in chosen categories) → falls back to top stories overall. E4. Suspended account → flow not shown (FP-002 policy). |
| Business rules to add/modify | New (Proposed, owned by OBJ-PRF): **BR-PRF-014** "The welcome flow is offered once per account, never blocks a content destination, and every step can be skipped." **BR-PRF-015** "Activation checklist items are derived from existing data, shown for 14 days after sign-up or until dismissed; dismissal is per account." New (OBJ-SET): **BR-SET-010** "`preferred_category_ids` holds at most 5 active top-level categories; it never filters what a reader can see." **BRC-AUTH-01** (move identity fields out of sign-up) — requires approval. |
| UI behaviour & validation | Step indicator "1 of 3"; primary "Continue", secondary "Skip"; username validation = BR-PRF-001 + live `is_username_available` (debounced 400 ms); categories as `Chip` (FP-037), max 5 with a counter; starter stories as StoryCard `row` variant with a Save toggle; all controls ≥ 44 px on touch; focus moves to the step heading on each step; works at 390 (single column) and 768/1280 (`max-w-2xl` centred). |
| Technical impact | Frontend: welcome screen + web route `(main)/welcome/page.tsx`; checklist card component; Settings interests chips. Shared components: `Chip`, StoryCard `row`, `Surface` (FP-037). API/RPC: `is_username_available(p_username text) returns boolean` (SECURITY DEFINER, case-insensitive, ignores own row), `my_activation_status() returns jsonb`. Database: `user_settings` add `onboarded_at timestamptz`, `checklist_dismissed_at timestamptz`, `preferred_category_ids uuid[]` (+ column grants, CHECK cardinality ≤ 5). RLS: own row (existing policy). Jobs: none. Callback route: one extra settings read for first sign-in. |
| Dependencies · Risks | FP-009 (Google first sign-in path, username policy F-AUTH-01), FP-019 (`/me` hub), FP-037 (Chip, row card), FP-032 (guest CTA). Risks: interrupting intent (mitigated by entry rule B); users with ad blockers or tab closure re-shown once; `is_username_available` can be used to enumerate usernames — acceptable because usernames are public on author pages, but rate-limit via `enforce_rate_limit` (FP-007). |
| Priority · Complexity · Class | P2 · M · Maturity |
| Decision required | Q-AUTH-04 (blocked until approved: mandatory vs. optional, identity fields at sign-up or in welcome) |

Acceptance criteria [Proposed]:
- Given a member signs in for the first time with `next=/`, When the callback completes, Then they land on `/welcome?next=%2F` and every step has a visible "Skip".
- Given a member signs up from a chapter page (`next=/story/a/b/c`), When the callback completes, Then they land on that chapter and a one-time toast links to the welcome flow.
- Given step 1, When the member types a username that another account holds in any letter case, Then "This username is already taken." appears before "Continue" is pressed.
- Given step 3 and two stories saved, When the member finishes, Then those stories are in Library → Saved and the Home "Recommended for you" block is not empty.
- Given the welcome flow was completed or skipped, When the member signs in on another device, Then it is not shown again.
- Given a checklist with all items done or dismissed, Then the Home card is not rendered.

### FP-036 — Appearance and motion preferences (app theme, reduced motion)

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-ACCOUNT · OBJ-SET (+ OBJ-SHELL, OBJ-READ) · SCR-SET-01, SCR-SHELL-01 (user menu, guest "⋯" menu, footer), SCR-READ-01 (reader theme "site") |
| User problem | Night readers cannot make the whole app dark unless their OS is dark; people who want a light app on a dark OS cannot either; people sensitive to motion get dialog and sheet animations with no way to reduce them. |
| Evidence / hypothesis | Verified (Code): tokens support forcing `.light`/`.dark` on `<html>` (`packages/design-tokens/src/tokens.css:6-7,76-81`) but no code sets them; Sonner uses `theme="system"` (`packages/ui/src/components/sonner.tsx`); no `prefers-reduced-motion` rule anywhere; `tw-animate-css` imported (`tokens.css:11`). Reader theme exists only on chapter pages (WBS 2.7). Benchmark BM-02 (Wattpad: no web dark mode, reader theme separate — anti-pattern for a web-first app). Dark mode itself not runtime-checked. |
| Current limitation | Theme = OS only; motion = always on; no Display section in Settings. |
| Proposed solution | Settings → "Language & display": Theme (System / Light / Dark), Reduce motion (System / On). Stored on the device (`storynest.theme`, `storynest.motion`) and, for members, in `user_settings.theme`, `user_settings.reduce_motion`, synced with the same rules as language (BR-SET-004 pattern). Applied before first paint by extending the existing inline bootstrap script (`apps/web/src/app/layout.tsx:37`) to set `class="dark|light"` and `data-motion="reduce"` on `<html>` and update `<meta name="theme-color">`. Reader theme "site" follows the app theme. Quick access: user menu (members), guest "⋯" menu and footer (FP-039). Token rule in `tokens.css`: `@media (prefers-reduced-motion: reduce)` and `:root[data-motion="reduce"]` shorten animations/transitions to ~0 and disable smooth scrolling. |
| Expected benefit | Comfortable night reading across the whole app (core use case); WCAG 2.3.3-friendly motion control; dark tokens finally reachable for testing. |
| Scenarios & main flow | 1. Member opens Settings → Theme → Dark. 2. Whole app turns dark immediately (no reload). 3. On another device after sign-in, the app is dark. 4. Opening a chapter with reader theme "site" shows dark reading. |
| Alternative / error flows | A1. Guest picks Dark in the footer → stored on device only. A2. Account value differs from the device after sign-in → account wins unless changed during load (BR-SET-004 rule). E1. Save to account fails → "Saved on this device only. Retry". |
| Business rules to add/modify | New **BR-SET-011** (Proposed): "Theme ∈ {system, light, dark}; reduce_motion ∈ {system, on}; defaults system; device value applies before first paint; account value follows the language sync rules." Reader BR (reading agent): reader theme `site` resolves to the app theme. |
| UI behaviour & validation | Segmented controls with visible labels; change applies instantly; live region "Theme: Dark"; no confirmation. |
| Technical impact | Frontend: settings section, menu items, bootstrap script, small `useAppearance` hook in `features/_shared`. Shared components: segmented control (ToggleGroup) in `packages/ui`; reduced-motion token rule. API/RPC: none (table upsert like language). Database: `user_settings` add `theme varchar(8) CHECK (theme IN ('system','light','dark')) DEFAULT 'system'`, `reduce_motion varchar(8) CHECK (... IN ('system','on')) DEFAULT 'system'` + grants. RLS: existing own-row policy. Jobs: none. CSP: bootstrap script needs the nonce (FP-023). |
| Dependencies · Risks | FP-023 (nonce), FP-037 (tokens), Q-SET-01. Risk: flash of wrong theme if the script fails → fall back to system (today's behaviour). Dark mode visual QA has never been done at runtime: budget a pass through every screen. |
| Priority · Complexity · Class | P3 · S · Maturity |
| Decision required | Q-SET-01 (device-only vs. synced) |

Acceptance criteria [Proposed]:
- Given a device with a light OS theme, When the member chooses "Dark", Then every page including header, bottom nav, dialogs and toasts renders with dark tokens without reload and without a light flash on the next page load.
- Given "Reduce motion: On", When a dialog or sheet opens, Then it appears without a sliding/zoom animation.
- Given a member chose "Dark" on device A, When they sign in on device B (no local choice), Then device B shows the dark theme after sign-in.
- Given the reader theme "site" and app theme "Dark", When a chapter opens, Then the chapter uses the dark tokens.

### FP-037 — Design-system consistency: StoryCard variants, layout primitives and accessible control tokens

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-PLATFORM · OBJ-SHELL (shared widgets), OBJ-DEV · all list screens (SCR-HOME-01, SCR-SRCH-01, SCR-RANK-01, SCR-AUTHOR-01/02, SCR-LIB-01, SCR-LIST-01, SCR-STORY-01 recommendations), every form, SCR-DEV-01 |
| User problem | Browsing is slow and visually monotonous: a story card is 451 px tall at 390 px and 511 px at 1280 px, so a phone shows about one row per screen and the first Home screen shows no complete card; covers without images are grey boxes with one letter; ranking/recommendation captions hang outside the cards; most buttons and inputs are 32–36 px on touch screens; keyboard focus is nearly invisible in light mode. |
| Evidence / hypothesis | Verified (Runtime): `metrics.json` card heights (m 451, t 507–535, d 511–539), `m-home.png` (first card starts at y≈413, ends below the 844 px fold behind the bottom nav), `d-story.png` (one full-height recommendation), `d-ranking.png` (captions under cards). Verified (Code): `story-card.tsx:56-92`, `story-cover.tsx:22-28`, `GRID` duplicated in 8 files, `size="touch"` used in 0 feature files vs. `size="sm"` 58 times, `--ring` already 50 % alpha + `ring-ring/50` (`tokens.css:52`, `button.tsx:8`). Inferred (calculation): focus ring 1.25:1, input border 1.31:1, placeholder cover 1.14:1. Full audit: section 7.2. |
| Current limitation | One StoryCard shape for every context; no shared grid, surface, chip, form-alert or type-scale primitives; control sizes tuned for mouse; focus and input borders below 3:1. |
| Proposed solution | Three parts, each shippable alone. **A. Tokens (S)** in `tokens.css`: opaque `--ring` + 2 px ring with offset; `--input` darkened to ≥ 3:1; `--size-control` / `--size-control-sm` that grow on `(pointer: coarse)`; semantic type utilities (`text-display`, `text-title`, `text-section`, `text-card-title`, `text-meta`, `text-caption` ≥ 12 px); `--space-section`; content width tokens; reduced-motion rule (shared with FP-036). **B. Widgets (M)** in `packages/ui`: StoryCard `variant: "grid" | "row" | "rail"` with `leading` (rank), `meta` (period stats, reason, "new chapter") and `footer` (progress, actions) slots; `StoryGrid` / `StoryList` / `StoryRail` containers; illustrated `StoryCover` placeholder; `Surface` (card) primitive; `Chip` (filter/tag); `FormAlert` (moved from auth); `PageSkeleton` variants; gallery coverage. **C. Adoption (per screen, by owning agents)** following the variant matrix in 7.2 DS-06. |
| Expected benefit | ~2× more stories per phone screen in lists (row variant 112 px vs. 451 px), aligned rows, recognisable placeholder covers, 44 px targets on touch without bloating desktop, visible focus, one place to tune density. |
| Scenarios & main flow | 1. Reader opens Rankings on a phone → sees 5–6 ranked rows per screen with rank numbers in a leading column and "this week" stats inside each row. 2. Opens a story → "You may also like" is a horizontal rail of 6 covers. 3. Tabs through the page → every focused control shows a clearly visible ring. |
| Alternative / error flows | A1. Story without cover → illustrated placeholder (title + author on a tinted background derived from the category). A2. Long Vietnamese titles → 2-line clamp with fixed title block height so rows align. E1. Cover image fails to load → same placeholder (onError). |
| Business rules to add/modify | BR-SHELL-010 (shared widget contracts) extended: "List screens choose a StoryCard variant from the matrix; captions belong inside the card (meta slot)". BR-HOME-009 (card content, discovery agent) adjusted for the compact grid variant (no synopsis below `sm`). Both need approval by their owners; no data rules change. |
| UI behaviour & validation | Row: whole row is one link; secondary actions (Save, remove) are separate buttons outside the link with their own 44 px targets. Rail: horizontal scroll-snap with visible next-item peek, arrow buttons on fine pointers, `aria-roledescription="carousel"` not needed (plain list). Grid: equal-height rows (title block min height 2 lines, meta 1 line). |
| Technical impact | Frontend: all list screens (adoption), forms (control sizing). Shared components: `packages/ui` widgets listed above, `tokens.css`. API/RPC: none (row/rail use the same data). Database: none. RLS: none. Jobs: none. Tests: widget tests updated; `check:tokens` extended to forbid `text-[…]` arbitrary font sizes. |
| Dependencies · Risks | FP-022 (a11y pass uses the tokens), FP-020 (skeleton variants), owning agents for adoption. Risks: visual churn across many screens (mitigate: ship tokens first, then one variant per PR); darker input borders change the look (validate in the gallery, SE-DEV-01). |
| Priority · Complexity · Class | P2 · M (A: S, B: M, C: S per screen) · Maturity |
| Decision required | none for A/B; per-screen variant choice confirmed during consolidation (7.2 DS-06) |

Acceptance criteria [Proposed]:
- Given a story list on a 390 × 844 screen using the `row` variant, Then each row is at most 120 px tall and at least five rows are visible below the page heading.
- Given the `grid` variant at 390 px, Then each card is at most 360 px tall and all cards in a row have aligned title, meta and counter lines.
- Given any focusable control in the light theme, When it receives keyboard focus, Then the focus indicator has at least 3:1 contrast against the adjacent background.
- Given a coarse pointer, Then default buttons, inputs, select triggers and icon buttons are at least 44 px tall; given a fine pointer they keep the desktop size (36–40 px).
- Given a story without a cover, Then the placeholder shows the title (and author in grid/rail) on a tinted background whose text contrast is at least 4.5:1.
- Given the repository, Then the duplicated `GRID` constants and local `CHIP` constants are replaced by the shared widgets and `check:tokens` rejects arbitrary `text-[…]` sizes.

### FP-038 — Connectivity awareness on the web (offline banner, paused requests explained)

| Field | Value |
| --- | --- |
| Type | Enhancement |
| Domain · object · screens | D-PLATFORM · OBJ-SHELL (+ `_shared` query layer, PlatformProvider) · SCR-SHELL-01 and every screen with a form or list |
| User problem | On a train or in a lift the app either keeps spinning ("Signing in…", "Sending…", skeletons) or silently does nothing; the person does not know whether their vote, comment or saved chapter went through. |
| Evidence / hypothesis | Verified (Code): QueryClient keeps TanStack Query v5 defaults (`networkMode: 'online'`, `packages/features/src/_shared/query.ts:17-32`; version 5.105.3 in `packages/features/package.json`), so when the browser reports offline, queries and mutations **pause** instead of failing; screens then never reach the "No connection…" message they implement (BR-AUTH-013, SCR-*-D "Offline: Implemented" rows assume a failed request). SCR-SHELL-01 D lists "Offline: Missing". Behaviour not observed at runtime (Inferred from library defaults) — verify with DevTools offline before building. |
| Current limitation | No shell-level connectivity state; paused mutations are indistinguishable from slow ones; no explanation that they will be retried. |
| Proposed solution | `ConnectivityBanner` in the shell status slot (SE-SHELL-01) subscribed to `onlineManager` (web) / the platform adapter (Capacitor Network plugin later; add `subscribeOnline` to the `PlatformProvider` contract): "You're offline. Things you do now will be sent when you're back online." Shared submit buttons read `mutation.isPaused` → label "Waiting for connection…" + "Cancel". Queries use `networkMode: 'offlineFirst'` so cached pages (e.g. the chapter already open) keep rendering with the banner instead of a skeleton. On reconnect: banner "Back online" (3 s) and paused mutations resume (existing TanStack behaviour). No service worker and no offline storage (that is WBS 7.4 for the app). |
| Expected benefit | Trust in writes on flaky mobile networks; no endless spinners; seam ready for Capacitor (WBS 7.1/7.4). |
| Scenarios & main flow | 1. Reader votes while offline → button shows "Waiting for connection…" and the banner appears. 2. Connection returns → vote is sent, button shows the voted state, "Back online" appears briefly. |
| Alternative / error flows | A1. Reader cancels a paused comment → draft text kept in the field. E1. Mutation fails after reconnect (e.g. rate limit) → normal error message (BR-SHELL-007). E2. Auth mutations (sign in) while offline → show "You're offline" immediately instead of pausing (auth must not fire later unexpectedly): set `networkMode: 'always'` for auth mutations so they fail fast with the network message. |
| Business rules to add/modify | BR-SHELL-007 extended (Proposed): "Queries render cached data while offline; non-auth mutations pause and resume on reconnect with a visible waiting state; auth mutations fail immediately when offline." |
| UI behaviour & validation | Banner is a polite live region, dismissible, not covering the bottom nav; respects reduced motion. |
| Technical impact | Frontend: shell banner, shared mutation-button helper. Shared components: `StatusBanner` (shared with FP-006 suspension notice). API/RPC: none. Database: none. RLS: none. Jobs: none. Platform: adapter contract `subscribeOnline`. |
| Dependencies · Risks | FP-020 (state pattern), SE-SHELL-01 status slot. Risk: resumed mutations after a long time may conflict (e.g. comment on a now-hidden chapter) → server errors already handled. |
| Priority · Complexity · Class | P3 · S · Maturity |
| Decision required | none |

Acceptance criteria [Proposed]:
- Given the browser goes offline on any `(main)` page, Then a banner "You're offline…" appears within 1 s and is announced politely.
- Given the reader presses "Vote" while offline, Then the button shows "Waiting for connection…" and, When the connection returns, Then the vote is sent once and the button shows the voted state.
- Given the sign-in form is submitted while offline, Then "No connection. Check your network and try again." is shown immediately and nothing is sent later.
- Given a chapter already loaded, When the connection drops and the reader navigates back to it, Then the cached chapter renders with the banner instead of a skeleton.

### FP-039 — Public site frame: footer, legal links, app icons and default share metadata

| Field | Value |
| --- | --- |
| Type | New Feature |
| Domain · object · screens | D-PLATFORM · OBJ-SHELL, OBJ-SEO (+ OBJ-AUTH consent line) · SCR-SHELL-01, SCR-AUTH-02, static legal pages under the WBS §1.2 `(marketing)` route group (screen IDs to register on approval) |
| User problem | There is no footer, no About/Terms/Privacy/Copyright page and no way to report copyright infringement; sign-up references no terms; the site has no favicon or app icon, so tabs, bookmarks and "Add to Home Screen" show a generic icon; sharing the home or ranking link produces no preview. |
| Evidence / hypothesis | Verified (Runtime): no footer on any `d-*.png`/`t-*.png`. Verified (Code): no `icon.*`, `apple-icon.*`, `manifest.*`, root `opengraph-image.*` in `apps/web/src/app`, no `apps/web/public`; only story and chapter routes set `alternates`/`openGraph` (`story/[id]/[slug]/page.tsx:28-31`, `…/[chapterSlug]/page.tsx:28-30`). Documented: WBS 6.9 legal pages ⬜ "needs legal content"; WBS 7.5 needs icons/splash anyway. |
| Current limitation | No legal surface, no brand assets, no site-wide share defaults. |
| Proposed solution | **Footer** (`SiteFooter` in `AppShell`): About StoryNest · Terms · Privacy · Copyright/DMCA report · Contact · language choice · theme (FP-036) · ©. End-of-page on every `(main)` page; on < `lg` placed above the bottom-nav padding; slim (2 rows max at 390). Auth layout gets a one-line version (Terms · Privacy · language). **Legal pages** in `(marketing)/{about,terms,privacy,copyright}` as static, translated, indexable pages (content from Q-X-02). **Sign-up line** "By creating an account you agree to …" (SE-AUTH-02). **App identity**: `app/icon.svg` + `icon.png` (32/192/512), `apple-icon.png` (180), `app/manifest.ts` (name, short_name, `theme_color`/`background_color` = the literals already mirrored in `layout.tsx:25-28`, `display: "standalone"`, `lang: "vi"`). **Default metadata**: root `openGraph` + `twitter: summary_large_image` with a branded `app/opengraph-image.tsx`; `alternates.canonical` for `/` and `/ranking`. |
| Expected benefit | Launch-ready legal surface and copyright route (UGC platform), recognisable brand in tabs/search results/home screen, attractive link previews for the most shared URLs. |
| Scenarios & main flow | 1. Visitor scrolls to the end of Home → footer → "Terms" → reads → back. 2. Sharing `https://…/` in a chat shows the StoryNest card. 3. Adding the site to the iOS home screen shows the StoryNest icon. |
| Alternative / error flows | A1. Legal content not yet approved → footer hides those links (feature flag per link) rather than linking to empty pages. A2. Copyright report: link to a mailto/contact form until a structured flow exists (trust-safety agent may extend SCR-MOD-02). |
| Business rules to add/modify | BR-SEO-004/006 extended (Proposed): default share card for pages without their own; canonical for home and ranking. New BR-SHELL-015 (Proposed): "Every `(main)` and `(auth)` page links to Terms and Privacy." |
| UI behaviour & validation | Footer links ≥ 44 px tall on touch (row spacing), `<footer>` landmark with `aria-label`, current language marked. |
| Technical impact | Frontend: `SiteFooter`, auth layout line, static pages. Shared components: `AppShell` `footer` slot. API/RPC: none. Database: none. RLS: none. Jobs: none. SEO: sitemap adds the static pages; robots unchanged. |
| Dependencies · Risks | Q-X-02 (legal content, owner), Q-SHELL-03 (brand assets), FP-036 (theme control), FP-021 (language). Risk: shipping placeholder legal text — forbidden; links stay hidden until content is approved. |
| Priority · Complexity · Class | P2 · S · MVP (legal links and copyright route are launch requirements; icons are trivial) |
| Decision required | Q-X-02 (content, blocks the legal pages only), Q-SHELL-03 (brand assets) |

Acceptance criteria [Proposed]:
- Given any `(main)` page scrolled to the end, Then a footer with About, Terms, Privacy and Copyright links and a language choice is visible, and on a phone it sits above the bottom navigation.
- Given the browser requests `/manifest.webmanifest` (or the Next default path), Then it returns name "StoryNest", icons of 192 and 512 px and the theme colours.
- Given the home URL is shared to a link-preview service, Then the preview shows the StoryNest title, description and default image.
- Given the Terms page is not yet approved, Then no link to it is rendered anywhere.

---

## 5. Amendments to existing FPs

**FP-004 — Real not-found and error pages** (add):
- Runtime adds a visual defect: the default 404 renders a white panel inside the cream shell (`m-notfound.png`, `d-notfound.png`), so the fix must render inside `(main)` with the token background, not only translate text.
- Every page-level `EmptyState` used as a "not found" (list missing `d-list-missing.png`, author missing) must offer at least one exit action (Home, Search) — today the list-missing state is a dead end (Verified (Runtime)).
- `global-error.tsx` cannot rely on the providers; give it its own minimal markup using `tokens.css` and a bilingual message.
- New AC: Given `/lists/<unknown>`, Then the not-found state shows "Go to Library" (members) or "Go to Home" (guests).

**FP-008 — Account lifecycle (WBS 6.4 / Q7)** (add flows, keep blocked on Q-X-01):
- Location: Settings → "Account" (change email) and "Privacy & data" (export, deactivate, delete) (SE-SET-01).
- Deactivate: sets `account_status = 'deactivated'` (value already allowed, `init_schema.sql:19-20`); public profile and stories hidden like a suspended account per the FP-002 policy; signing in again offers "Reactivate" (Proposed rule, Q-AUTH-05).
- Delete: reauthentication → consequences list (what is anonymised, what stays) → per owned story choice "keep under 'Deleted user'" or "unpublish first" (WBS §4 Q7 note) → co-authorship and pending invitations closed (FP-016) → typed confirmation → **14-day grace period** during which signing in cancels deletion (Proposed, BR text below, Q-AUTH-05) → anonymisation job (pg_cron via existing outbox pattern).
- Export: `export_my_data()` RPC returning JSON (profile, settings, library, follows, lists, comments, votes, reading progress); stories/chapters of authors exported separately as text/Markdown later (size). Download through the platform adapter (works in Capacitor).
- Change email: `updateUser({ email })` with Supabase "secure email change" (confirmation on both addresses; Q-AUTH-02 must confirm the setting).
- Proposed BR text (needs approval): "A deletion request is reversible for 14 days by signing in; after that the account is anonymised irreversibly." "A deactivated account is hidden like a suspended one but can reactivate itself by signing in."
- Additional AC: Given a member with a pending deletion signs in within 14 days, Then they are asked to cancel the deletion and the account returns to active when they confirm.

**FP-009 — Complete sign-up and sign-in** (add):
- Google button placement and order on SCR-AUTH-01/02 (top, outline, full width); first Google sign-in also enters FP-035's welcome rule.
- `next` carried through forgot → email → reset → destination; reset lands on `next` (SE-AUTH-03/04).
- Recovery-session detection; normal sessions go to Settings → Account → Change password (reauth) (SE-AUTH-04).
- "Sign out" in the menu = this device (`scope: 'local'`); "Sign out of all devices" in Settings → Account; "Sign out of other devices" checkbox after reset — all conditional on Q-AUTH-01 / Q-AUTH-06.
- Check-email card: resend (60 s), "Use a different email", spam hint; resend also on the "not confirmed" sign-in error.
- Sign-up sends `locale` in user metadata so email templates can be localised (templates must be versioned with the Q-AUTH-02 settings checklist).
- If BRC-AUTH-01 is rejected: show the final username before submit (live preview + availability via the FP-035 RPC).
- AC: Given "Sign out" from the user menu on device A, Then device B stays signed in (if Q-AUTH-01 chooses per-device).

**FP-019 — Navigation and information architecture** (add):
- Tablet: bottom nav visible below `lg` (BRC-SHELL-01); header section links from `lg` (Discover, Rankings, Library, Write). Runtime evidence `t-home.png` (no nav at 768).
- Header density: language → user menu/footer (BRC-I18N-01), 18+ toggle → menu (Q-SHELL-02, trust-safety agent), guest "⋯" menu; "Sign in" not filled.
- `/me` hub content as specified in SE-PRF-01 (avatar, public page, counts, checklist, navigation list, Sign out); move `MeView` into `packages/features` (WBS Q1).
- Auth layout "Back" link to a safe `next`.
- AC: Given a 768 px viewport, Then the bottom navigation is visible on every `(main)` page.

**FP-020 — One pattern for loading / error / load-more** (add):
- `PageSkeleton` variants `grid | detail | list | form | reader` and per-segment `loading.tsx` (U-SHELL-03), so `/settings`, `/me`, story and reader pages do not flash a card grid.
- `/me` error state (F-PRF-01) moves here explicitly with SE-PRF-01-AC02.
- Shared "section saved / saved on this device only" status pattern for auto-saving settings (SE-SET-01).

**FP-021 — Server-side language** (add):
- Language control in the auth layout and in the footer (FP-039), not only in the `(main)` header.
- Visible text must be part of the accessible name (WCAG 2.5.3): e.g. a menu button "VI" named "Ngôn ngữ / Language: Tiếng Việt" with the two options listed by their own names.
- Sign-up passes `locale` (FP-009) and the cookie decided in Q-I18N-01 is also read by the `/auth/callback` redirect target.

**FP-022 — Accessibility pass on core screens** (add):
- Focus indicator contrast: effective ring alpha is 25 % (`--ring` already 50 % at `tokens.css:52` and components use `ring-ring/50`, e.g. `button.tsx:8`) → computed 1.25:1 in light theme, 2.56:1 dark (Inferred). Fix in FP-037 tokens; FP-022 verifies.
- Input borders 1.31:1 against the page (`--input`, `tokens.css:51`) fail WCAG 1.4.11 for the field boundary (Inferred calc).
- Label-in-name failure on the language button (Verified (Code)).
- Switch rows: make the whole row the label; switch visual is ≈ 18 × 32 px.
- `prefers-reduced-motion` base rule (shared with FP-036).
- Touch sizing via `--size-control` instead of per-component `touch-target` (outside `packages/ui` only the two Home chip rows and the gallery use it today).

**FP-023 — Security headers and CSP** (add):
- The nonce must also cover the theme/motion bootstrap (FP-036) and allow Google OAuth redirects plus the captcha script/frame origin (FP-009).

---

## 6. BR change proposals and open questions

### BR change proposals (each requires approval; the current BR stays in force until then)

| ID | Current rule | Proposed change | Why | Blocks |
| --- | --- | --- | --- | --- |
| BRC-AUTH-01 | BR-AUTH-003: username and display name are optional fields on the sign-up form, sent as metadata | Remove them from the sign-up form; collect them in the welcome step (FP-035) where availability is checked. The trigger keeps deriving defaults (BR-AUTH-004 unchanged). | Shorter form, no silent username changes at sign-up (F-AUTH-01) | FP-035, FP-009 |
| BRC-SHELL-01 | BR-SHELL-004: bottom nav shown below `md` (768 px) | Show it below `lg` (1024 px); header section links from `lg` | Tablet portrait has no navigation today (runtime) | FP-019 |
| BRC-I18N-01 | BR-I18N-006: language button in the main header for everyone | Move it into the user menu (members), guest "⋯" menu, footer and auth layout; Settings keeps the full control | Header density at 390 px; label-in-name fix | FP-019, FP-021 |

### New open questions

| ID | Question | Why it matters | Blocks | Raised in |
| --- | --- | --- | --- | --- |
| Q-AUTH-04 | Should the first-run welcome be offered to every new member (skippable) and should username/display name move from sign-up into it? | Conversion vs. identity quality; changes BR-AUTH-003 | FP-035, BRC-AUTH-01 | JRN-ACC-01 |
| Q-AUTH-05 | Deactivation and deletion semantics: is a deactivated account hidden like a suspended one, can it reactivate by signing in, and is there a grace period (proposed 14 days) before anonymisation? | Irreversible data change; needs legal input with Q-X-01 | FP-008 | JRN-ACC-04 |
| Q-AUTH-06 | After a password reset or change, should other sessions be ended (default on, user can untick)? | Security remedy for compromised accounts; tied to Q-AUTH-01 | FP-009 | JRN-ACC-03 |
| Q-SET-01 | Should app theme and reduced-motion follow the account across devices (like language) or stay on the device (like the reader preferences on Royal Road, BM-01)? | Schema columns vs. device-only | FP-036 | JRN-ACC-05 |
| Q-SHELL-02 | Tablet and header layout: bottom nav up to `lg`? Where do the 18+ toggle and language control live when they leave the header? | Navigation at 768 px; trust-safety owns the 18+ control | FP-019, BRC-SHELL-01, BRC-I18N-01 | SE-SHELL-01 |
| Q-SHELL-03 | Who supplies brand assets (logo, app icon, default share image) and the footer's About/Contact text? | Needed for FP-039 and WBS 7.5 | FP-039 | SE-SHELL-01 |
| Q-SEO-03 | Should filtered Home pages (`/?category=…`, `/?tag=…`) be indexable landing pages with their own canonical/title, or canonicalise to `/`? | Duplicate content vs. category landing SEO | FP-039 (defaults) | CAP-PLAT-07 |

Existing questions this draft relies on: Q-AUTH-01, Q-AUTH-02, Q-SHELL-01, Q-I18N-01, Q-X-01, Q-X-02, Q-X-03.

---

## 7. Notes for consolidation

### 7.1 Overlaps and conflicts with other areas

- **Reading agent**: shell-less reader (WBS §1.2 `(reader)`) — SE-SHELL-01 proposes an `AppShell` `chrome="none"` variant and the status slot; the reading agent decides the route. Reader theme `site` must follow the FP-036 app theme. Mobile bottom nav over the end of the chapter (`m-reader.png`) is solved by either decision.
- **Discovery agent**: (a) StoryCard variant per screen — use the matrix in DS-06 below; (b) `Chip` component replaces the local `CHIP` constants in `category-chips.tsx:6` and `tag-filters.tsx:9`; (c) "Recommended for you" cold start could use `user_settings.preferred_category_ids` from FP-035 as a new reason (BR-REC owned there) — FP-035 works without it; (d) guest CTA FP-032 should lead into sign-up and then FP-035; (e) a member "Continue reading" row on Home (JRN-ACC-02 hypothesis e) belongs to discovery/library with FP-012; (f) Q-SEO-03 affects filtered Home URLs.
- **Library agent**: Library cards should use the `row` variant with `footer` = progress bar (existing `ReadingProgress` widget) + "Continue chapter N" inline, replacing card + buttons below (`library-screen.tsx:137-170`).
- **Trust-safety agent**: 18+ header toggle placement (Q-SHELL-02); suspension banner (FP-006) uses the shell status slot (SE-SHELL-01); block/mute (CAP-ACCT-17, BM-29/30) belongs there; copyright report route from the footer (FP-039) may extend SCR-MOD-02; account deletion interacts with FP-002 visibility policy.
- **Community agent**: notification channels (FP-026) slot into Settings → Notifications as extra columns; keep the per-row switch-as-label pattern.
- **Studio agent**: Studio forms use `size="sm"` buttons heavily; adopt `--size-control`; edit-story/team headings should use `PageHeader` + `text-title`; deletion flow (FP-008) needs the team lifecycle (FP-016) to close co-authorships.
- **Naming**: bottom nav "Write" vs. menu "Studio", nav "Me" vs. menu "Profile" — harmless but should be one pair per destination when FP-019 lands.

### 7.2 Design-system observations

Sources: `packages/design-tokens/src/tokens.css`, `packages/ui/src/components/*`, `packages/ui/src/widgets/*`, the
screenshots at 390/768/1280 and `metrics.json`. All recommendations are **Proposed** and token-level; no full redesign is
justified — the palette, radius scale and component library (shadcn on Tailwind v4) are sound. What is missing is a
**density layer** (sizes that respond to pointer type), a **type scale**, and **context-specific variants** of the
StoryCard.

**DS-01 Typography hierarchy** — No type-scale tokens; only families (`tokens.css:189-191`). Observed page `h1`: `text-2xl`
(PageHeader, auth, edit profile), `text-2xl sm:text-3xl` (story, chapter), `text-3xl sm:text-4xl` (home hero); section `h2`:
`text-xl` (Home "Mới cập nhật"), `text-lg` (story, search, recommendations, author, stats), `text-base` (settings, team,
chapter manager); EmptyState/ErrorState `h2` `text-lg font-medium` vs. sections `font-semibold`. StoryCard "updated" line
uses an arbitrary `text-[0.7rem]` = 11.2 px (`story-card.tsx:90`), against the tokens' own "no arbitrary values" rule
(`tokens.css:3-4`). Verified (Code). Vietnamese stacked diacritics at 11–12 px with `text-xs` default leading (1.33) read
cramped (Inferred).
Recommendation — add `@utility` classes in `tokens.css`:
| Utility | Size / line-height / weight | Use |
| --- | --- | --- |
| `text-display` | 1.875rem → `sm` 2.25rem / 1.2 / 600 | Home hero only |
| `text-title` | 1.5rem → `sm` 1.875rem (content titles) / 1.25 / 600 | Page `h1` (PageHeader, story, chapter, auth) |
| `text-section` | 1.125rem / 1.4 / 600 | Every section `h2` incl. Settings, EmptyState/ErrorState |
| `text-card-title` | 0.9375rem / 1.35 / 600 | StoryCard, rows |
| `text-body` | 1rem / 1.6 | Default text (not the reader, which keeps `.reader-text`) |
| `text-meta` | 0.8125rem / 1.5 | Author, counts, timestamps |
| `text-caption` | 0.75rem / 1.5 (minimum) | Hints, legal line |
Extend `pnpm check:tokens` to reject `text-[…]`.

**DS-02 Spacing rhythm** — Section gaps vary (`gap-6` on `/me` and settings, `gap-8` on Home, `gap-3` inside
recommendation sections); surface padding `p-3`/`p-4`/`p-5`/`p-6` for similar boxes (settings `p-4`, `/me` `p-5`, auth `p-6`).
Verified (Code). Recommendation: tokens `--space-section: 2rem` (between page sections), `--space-stack: 1rem` (inside a
section), surface padding scale: `compact` 0.75rem (rows, cards), `default` 1rem (settings sections, panels), `roomy` 1.5rem
(auth, dialogs). Keep the 56 px header and `py-6` main.

**DS-03 Surfaces and radius** — About 20 hand-written `rounded-xl border …` boxes with differing `bg-card`, `shadow-xs`,
hover and focus treatments (grep of `rounded-xl border` / `rounded-lg border` in `packages/features`); there is no Card
primitive in `packages/ui`. Radius tokens (`--radius` 0.625rem; sm/md/lg/xl) are consistent and fine: controls `rounded-md`,
covers `rounded-lg`, cards `rounded-xl`, chips `rounded-full`. Recommendation: `Surface` in `packages/ui/components` with
`variant: "plain" | "interactive" | "dashed" | "inset"` and `padding: "compact" | "default" | "roomy"`; plain = `border
bg-card rounded-xl`; interactive adds `hover:bg-accent/40` + the focus ring; dashed for "unavailable" placeholders
(library); inset = `bg-muted/40` for grouped settings. Settings sections, `/me` boxes, auth card, list rows all map to it.

**DS-04 Control sizing and density (touch targets vs. density)** — Button `default` `h-9` (36 px), `sm` `h-8` (32 px),
`icon` `size-9` (36 px); Input `h-9` (`button.tsx:22-27`, `input.tsx:10`). The project token `--size-touch: 2.75rem` and the
`touch-target` utility exist (`tokens.css:73-74,205-208`) but the `touch` button size is used **nowhere in
`packages/features`**: outside `packages/ui` the only `touch-target`/`size="touch"` uses are the two Home chip rows and the gallery (plus `BottomNav` inside `packages/ui`), while
`size="sm"` appears 58 times and `size="icon"` 12 times. Runtime density signal: controls under 44 px — login 5/5,
reader 17/21, story 13/22 at 390 px (`metrics.json`; includes inline links, so it over-states). Verified (Code + Runtime).
Recommendation (keeps desktop density, fixes touch):
```css
:root { --size-control: 2.25rem; --size-control-sm: 2rem; --size-control-lg: 2.5rem; }
@media (pointer: coarse) { :root { --size-control: 2.75rem; --size-control-sm: 2.5rem; --size-control-lg: 3rem; } }
```
Map `Button` sizes `default/sm/lg/icon`, `Input`, `SelectTrigger`, `TabsList` to `h-(--size-control*)`; for `sm` on coarse
pointers add an invisible hit-area extension (`before:absolute before:-inset-1`) so the visual stays compact. Auth and
welcome primary actions use `lg` full width. `Switch` stays visually small but its row becomes the label (44 px row).

**DS-05 Colour, contrast and focus** (light theme computed from tokens; Inferred) —
| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--foreground` on `--background` | 16.9:1 | Pass |
| `--muted-foreground` on `--background` / `--card` | 6.4 / 6.6:1 | Pass |
| `--primary` text on `--background` (links) | 4.8:1 | Pass AA (small text), little margin |
| `--primary-foreground` on `--primary` (buttons) | 4.8:1 | Pass AA |
| `--destructive` on `--background` | 4.7:1 | Pass AA |
| Focus ring: `ring-ring/50` over `--ring` that is already 50 % → ~25 % primary | 1.25:1 (dark 2.56:1) | **Fail** 3:1 (WCAG 1.4.11 / 2.4.7 visibility) |
| `--input` border vs. `--background` | 1.31:1 | **Fail** 3:1 for field boundaries |
| Placeholder cover `--secondary` vs. `--card` | 1.14:1 | Reads as an empty box |
Recommendation: `--ring: light-dark(oklch(0.56 0.15 45), oklch(0.72 0.14 50))` (opaque) and focus style `ring-2 ring-ring
ring-offset-2 ring-offset-background` in Button/Input/Badge/Tabs/StoryCard (replace `ring-[3px] ring-ring/50`); keep
`--border` (0.90) for decorative dividers but set `--input` to about `oklch(0.65 0.015 80)` (computed 3.15:1) for field
outlines; dark `--input` (16 % white, 3.85:1) already passes. Do not lighten `--primary` further (4.8:1 has no margin).

**DS-06 Story cards, covers and list patterns** — One StoryCard shape (`story-card.tsx:36-95`) everywhere: `p-3`, 2:3 cover,
2-line title, author, a wrapping row of two badges (category `secondary`, status `outline`), 2-line synopsis, counters,
"updated" line. Measured heights: 451 px at 390 (two columns of ~173 px; cover ≈ 224 px = half the card), 507–535 px at
768, 511–539 px at 1280 (four columns of 232 px inside the 1024 px column). On Home at 390 the first card starts at
y≈413 and ends at ≈864, i.e. below the 844 px fold and behind the bottom nav, so the first screen shows no complete card
(`m-home.png`). Badges wrap to two lines on long category names ("Lãng mạn học đường"), making rows uneven between
rows (`t-home.png` row 2). Ranking puts the rank badge over the cover corner and the period stats **under** the card
(`ranking-screen.tsx:105-121`, `d-ranking.png`); recommendations put the reason under the card
(`recommendation-list.tsx:38-47`) and on the story page show a single full-height card (`d-story.png`); Library renders a
full card plus buttons below it (`library-screen.tsx:137-170`); the author page repeats the author's name on every card
(`m-author.png`). The grid class string is copy-pasted in 8 files (`ranking-screen.tsx:20`, `discover-screen.tsx:19`,
`library-screen.tsx:27`, `search-screen.tsx:34`, `list-screen.tsx:25`, `recommendation-list.tsx:11`,
`following-screen.tsx:17`, `author-screen.tsx:21`). Placeholder covers are a single 36 px letter on `bg-secondary`
(`story-cover.tsx:28`). Verified (Code + Runtime).

Recommendation — StoryCard variants (FP-037):
| Variant | Anatomy | Target size | Notes |
| --- | --- | --- | --- |
| `grid` (compact browse) | cover 2:3 · title (2-line block, fixed height) · author · **one** meta line "Category · Status" (text, not two badges; 18+ stays a badge on the cover) · counters + relative time on one line; synopsis only from `sm` and only 2 lines | ≤ 360 px at 390 (from 451), ≈ 420 px at 1280 with 5 columns | Home feed, filtered Home, search when the reader browses by tag |
| `row` (compact list row) | `leading` slot (rank numeral, 2.5rem column) · cover thumb 64 × 96 · title (2 lines) · author · meta line · optional 2-line synopsis from `sm` · `meta` slot (period stats, reason, "New chapter 3h ago") · `footer` slot (progress bar, actions) | 112 px (+ footer) | Search results, Rankings, Following feed, Library, Reading list, author page on phones, Welcome step 3 |
| `rail` (horizontal shelf) | cover 2:3 at 112–128 px wide · title 2 lines · `meta` slot (reason) | ≈ 260 px tall, 2.5 items visible at 390 | "Recommended for you", "You may also like", "Trending" (FP-032); fixes the single full-height card |
Rules: captions live **inside** the card (`meta` slot), never below it; the whole card/row is one link, separate actions
sit outside the link; author name hidden on the author's own page (`hideAuthor`); counters use `StatPill` (StoryCard
duplicates its markup today, `story-card.tsx:78-89`). Containers: `StoryGrid` (2 / 3 / 4 / 5 columns at base / `sm` /
`lg` / `xl` with the `browse` width token), `StoryList` (rows with dividers inside one `Surface`, like the chapter list on
the story page), `StoryRail` (scroll-snap, peek, arrow buttons on fine pointers).
Placeholder cover: tinted background from a 6-step palette of new tokens `--cover-1…6` (light ≈ `oklch(0.86–0.90 0.04–0.05
h)`, hues from the chart palette; computed text contrast ≥ 11:1 with `--foreground`) chosen deterministically from the
category (or story id), with the title in `--font-reader` (serif, 2–4 lines) and the author's name small at the bottom —
a book-cover look instead of a letter. Row thumbnails keep the initial letter on the tint.
Screen matrix for other agents: Home feed → `grid`; Home "For you"/Story "You may also like"/Trending → `rail`; Search
stories tab → `row`; Rankings → `row` with `leading` rank (top 3 may use `grid`); Author page → `row` < `md`, `grid` ≥ `md`,
`hideAuthor`; Following feed → `row` with new-chapter meta; Library → `row` with progress footer; Reading list → `row`;
Welcome step 3 → `row` with Save toggle.

**DS-07 Chips and badges** — The same "tag" concept has three looks: 44 px outline chips on Home (`tag-filters.tsx:9-11`),
small `Badge variant="outline"` "#Tình yêu" on the story page (`d-story.png`), and category/status badges in cards that look
like buttons although they are not interactive. Category and tag chip rows on Home share one style, so the two filter
levels are not distinguishable (`m-home.png`). `CHIP` constants are duplicated (`category-chips.tsx:6`, `tag-filters.tsx:9`).
Verified (Code + Runtime). Recommendation: `Chip` component (`variant: "filter" | "tag"`, `selected`, `size` from
`--size-control-sm` with coarse hit-area extension): category filters = `filter` (filled when selected); tags = `tag`
(outline, "#" prefix rendered once, U-TAX-02); non-interactive status/category in cards = plain meta text (DS-06), so only
interactive things look like pills.

**DS-08 Form layout** — Auth forms are clean single-column cards. Inconsistencies: Edit profile builds its own `h1` and
error banner instead of `PageHeader` and the auth `FormError` (`edit-profile-screen.tsx:90-103` vs. `auth-card.tsx:28-37`);
forms (`max-w-xl`) sit left-aligned in the 1024 px column at 1280 px while auth forms are centred; settings switches use
18 × 32 px controls. Verified (Code). Recommendation: move `FormError` to `packages/ui` as `FormAlert`; all form pages use
`PageHeader` + `narrow` width token (centred `max-w-2xl`); sticky save bar on phones for long forms (edit profile, story
form); switch rows as labels.

**DS-09 Empty, error and loading states** — `EmptyState`/`ErrorState` are visually consistent (icon disc, `h2`, muted
text) — good. Gaps: `action` is optional and some page-level uses have none (list missing: dead end, `d-list-missing.png`);
the default Next 404 bypasses tokens entirely (white panel, English, `m-notfound.png`); one card-grid skeleton for every
route. Verified (Runtime + Code). Recommendation: guideline "a page-level EmptyState/ErrorState always has at least one
action"; `PageSkeleton` variants (`grid`, `detail`, `list`, `form`, `reader`); FP-004 pages built from these widgets.

**DS-10 Header controls and icon semantics** — The 18+ shield icon has no visible text; the language button's visible "VI"
is not in its accessible name (`language-switcher.tsx:17-20`); header "Sign in" is a filled primary button that competes with
each page's own primary CTA ("Bắt đầu đọc" on the story page, `m-story.png`). Recommendation: icon-only controls get a
tooltip on fine pointers and stay ≤ 3 in the header; "Sign in" uses the `outline` variant; language moves to menus
(BRC-I18N-01).

**DS-11 Motion and toasts** — No reduced-motion rule (Verified (Code)); Sonner at its default position with a fixed bottom
nav on phones (Inferred overlap). Recommendation: reduced-motion base rule in `tokens.css` (FP-036/FP-037); Toaster
`position="top-center"` below `lg`.

**DS-12 Content width** — One `max-w-5xl` column (`app-shell.tsx:25,29`) for browse grids, detail pages and forms; desktop
story page leaves the right half empty below the header block (`d-story.png`) and browse cards get very tall. Recommendation:
width tokens `--content-browse: 72rem` (5-column grids at `xl`), `--content-default: 64rem`, `--content-narrow: 42rem`
(forms, settings, `/me`), reader keeps `--reader-measure`; `AppShell` `width` prop. Story-page two-column layout at `lg`
(cover + actions sticky left, synopsis + chapters right) is for the reading/story agent to decide.

**DS-13 Dark mode and gallery** — Dark tokens are complete (`light-dark()` for every colour) but no screenshot or test
covers them; the gallery claims "light and dark" without a toggle and omits StoryCard/StoryCover/ReadingProgress/PageSkeleton
(U-DEV-01). Unknown (dark not observed). Recommendation: SE-DEV-01 + a dark-mode visual pass when FP-036 ships.

### 7.3 Things I could not verify

- Any signed-in screen at runtime (`/me`, `/me/edit`, `/settings`, user menu, sign-out, bell), real confirmation/reset emails, Supabase Auth project settings (email confirmation, secure email/password change, session revocation on reset), email template language.
- Dark mode rendering; toast overlap with the bottom nav; offline behaviour (FP-038 is based on TanStack v5 defaults and must be verified in DevTools before work starts).
- Contrast ratios are calculated from token values, not measured on rendered pixels (alpha blending over `bg-card` vs. `bg-background` changes them slightly).
- Whether Next 16 serves a default favicon when none is defined (none is defined in the repo).
