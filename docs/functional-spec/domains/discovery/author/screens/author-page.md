# SCR-AUTHOR-01 — Author page

## A. Identification
| Field | Value |
| --- | --- |
| Screen ID | SCR-AUTHOR-01 |
| Business domain | [D-DISCOVERY Discovery](../../overview.md) |
| Business object | [OBJ-AUTHOR](../business-rules.md) · workflows: [workflows.md](../workflows.md) |
| Name | Author page |
| Route | `/author/[username]` (URL-decoded; `authorHref` encodes) |
| Route file | `apps/web/src/app/(main)/author/[username]/page.tsx` (+ `author-view.tsx`) |
| Screen component | `packages/features/src/author/screens/author-screen.tsx`; `author/components/follow-author-button.tsx` |
| Roles | Guest (view; Follow → login), Member (follow), Author on own page (no Follow), Moderator |
| Guard | None; title "Tác giả · StoryNest" for every author (BR-AUTHOR-012) |
| Workflows | WF-AUTHOR-01, WF-AUTHOR-02 |
| Rules | BR-AUTHOR-001…007, 010…012, BR-HOME-001/002/009 |

## B. Components
| ID | Component | Description | Evidence |
| --- | --- | --- | --- |
| SCR-AUTHOR-01-C01 | Profile skeleton | `h-40` block `aria-busy` while session/profile load | `author-screen.tsx:35` |
| SCR-AUTHOR-01-C02 | Header | Avatar (size-16), `h1` display name, "@username · N followers · M stories", bio or "This author hasn't written a bio yet." A long bio is clamped to 4 lines with a fade and "Show more / Show less" (`ExpandableText`, Lucian #288): toggle only when it really overflows, `aria-expanded`, full text always in the DOM | `author-screen.tsx`, `strings.en.ts`, `ui/widgets/expandable-text.tsx` |
| SCR-AUTHOR-01-C03 | Follow button | "Follow"/"Following" with icon, `aria-pressed`, hidden on own page | `follow-author-button.tsx:18-44` |
| SCR-AUTHOR-01-C04 | Report button | Report this person (OBJ-MOD) | `author-screen.tsx:102` |
| SCR-AUTHOR-01-C08 | Share button | "Share" under Follow: dialog with the absolute author link `https://<site>/author/<username>` (canonical origin), "Copy" that turns into a check (Lucian #008 / #254) and "Share with another app" where `navigator.share` exists | `author-screen.tsx`, `features/share/components/share-button.tsx` |
| SCR-AUTHOR-01-C05 | Stories section | `h2` "Author's stories"; card grid + infinite list; end "No more stories." | `author-screen.tsx:93-131`, `strings.en.ts:4,23-24` |
| SCR-AUTHOR-01-C06 | Not found | Empty state "Author not found" | `author-screen.tsx:46-48` |
| SCR-AUTHOR-01-C07 | Error states | Profile error and stories error, both "Couldn't load the author page" + "Try again" | `author-screen.tsx:36-45,111-117` |

## C. User actions and system responses

| Field | SCR-AUTHOR-01-A01 — Open an author page |
| --- | --- |
| Trigger | Navigate to `/author/<username>` |
| Preconditions | — |
| Expected behavior | Wait for session, call `author_profile`; header then stories |
| State change | Query `author/profile/{username}/{viewer}` |
| Validation | Blank username → 22023 → error state |
| Error behavior | Error state with retry |
| Navigation | — |
| Evidence | `author-screen.tsx:33-49`, `use-author.ts:18-28` |

| Field | SCR-AUTHOR-01-A02 — Follow (member) |
| --- | --- |
| Trigger | Press "Follow" |
| Preconditions | Signed in, not own page, not following |
| Expected behavior | Disabled while pending; on success label "Following", pressed, count updated, toast "You're now following this author." |
| State change | `user_follows` insert; profile cache; feed + discovery invalidated |
| Validation | Self → hidden; cap 1000 |
| Error behavior | Toasts per BR-AUTHOR-007; state unchanged |
| Navigation | — |
| Evidence | `follow-author-button.tsx:31-38`, `use-author.ts:35-46`, `author.test.tsx:343,385` |

| Field | SCR-AUTHOR-01-A03 — Unfollow (member) |
| --- | --- |
| Trigger | Press "Following" |
| Preconditions | Following |
| Expected behavior | Same flow, toast "Unfollowed.", count lowered; no confirmation dialog |
| State change | `user_follows` delete |
| Validation | — |
| Error behavior | Generic toast |
| Navigation | — |
| Evidence | `author.test.tsx:369` |

| Field | SCR-AUTHOR-01-A04 — Follow as guest |
| --- | --- |
| Trigger | Press "Follow" while signed out |
| Preconditions | Guest |
| Expected behavior | `navigation.push("/login?next=<pathname>")`; after login returns to the page (follow not auto-applied) |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | Login (SCR-AUTH-*) → SCR-AUTHOR-01 |
| Evidence | `follow-author-button.tsx:33`, `author.test.tsx:335` |

| Field | SCR-AUTHOR-01-A05 — Load more stories / open a story |
| --- | --- |
| Trigger | Scroll / "Load more"; click card |
| Preconditions | — |
| Expected behavior | Next keyset page; card → `/story/{id}/{slug}` |
| State change | Pages |
| Validation | — |
| Error behavior | Later-page error silent (U-SRCH-01) |
| Navigation | SCR-STORY-01 |
| Evidence | `author-screen.tsx:111-129` |

| Field | SCR-AUTHOR-01-A06 — Report the author |
| --- | --- |
| Trigger | Report button |
| Preconditions | Owned by OBJ-MOD (hidden for own account via `ownerId`) |
| Expected behavior | See BR-MOD-* |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `author-screen.tsx:102`, `author.test.tsx:409` |

| Field | SCR-AUTHOR-01-A07 — Retry |
| --- | --- |
| Trigger | "Try again" (profile or stories) |
| Preconditions | Failed request |
| Expected behavior | Refetch that query |
| State change | — |
| Validation | — |
| Error behavior | — |
| Navigation | — |
| Evidence | `author-screen.tsx:42,116`, `author.test.tsx:318` |

| Field | SCR-AUTHOR-01-A08 — Share the author page / read the whole bio |
| --- | --- |
| Trigger | "Share" (C08) → "Copy" / "Share with another app"; "Show more" under a long bio |
| Preconditions | — |
| Expected behavior | Copy: link on the clipboard, check + "Copied" for 1.8 s (announced politely). Show more: the bio grows to its full height; Show less clamps it again and scrolls its start back into view if needed |
| State change | — |
| Validation | — |
| Error behavior | Clipboard blocked → toast "Couldn't copy. Select the link and copy it yourself." |
| Navigation | — |
| Evidence | `author.test.tsx` (share, bio), `share/share.test.tsx` |

### C.x Browse interactions (Lucian batch 2 · browse)

- The follower count next to Follow is a RollingNumber (Lucian 054 / 098): after a follow or unfollow the changed digits roll to the count the database answered; nothing rolls on load; screen readers get the phrase once in a polite live region.
- The author's stories have the grid / list toggle and the shared story-card behaviours (see home-discover).

## D. UI states
| State | Status | Behaviour / evidence |
| --- | --- | --- |
| Initial | Implemented | Skeleton until session known |
| Loading | Implemented | Header skeleton; 4-tile stories skeleton |
| Empty | Implemented | "No public stories yet"; not-found state for unknown author (no link back — minor) |
| Populated | Implemented | Header + grid |
| Validation error | Not applicable | — |
| Request error | Implemented | Profile and stories errors with retry; follow errors as toast |
| Success | Implemented | Follow/unfollow toasts |
| Disabled | Implemented | Follow button disabled while pending |
| Unauthorized | Implemented | Guest Follow → login with return |
| Offline | Missing | Generic error / toast |
| Unsaved changes | Not applicable | — |

## E. Acceptance criteria
- SCR-AUTHOR-01-AC01 — Given active author `demo_an` with 2 public non-mature stories and 0 followers, When a guest opens `/author/DEMO_AN`, Then "@demo_an · 0 followers · 2 stories" and both stories are shown.
- SCR-AUTHOR-01-AC02 — Given a suspended account, When its page is opened (even by its owner), Then "Author not found" is shown.
- SCR-AUTHOR-01-AC03 — Given a guest presses "Follow", Then they land on `/login?next=%2Fauthor%2Fdemo_an` and return to the page after signing in.
- SCR-AUTHOR-01-AC04 — Given a member presses "Follow", Then the button shows "Following" (pressed), the count increments by the DB-returned value, and after reload it is still "Following".
- SCR-AUTHOR-01-AC05 — Given the member already follows 1000 authors, When they press "Follow" on a new author, Then the limit toast appears and the button stays "Follow".
- SCR-AUTHOR-01-AC06 — Given the viewer is the author, Then no Follow button is shown.
- SCR-AUTHOR-01-AC07 — Given a suspended follower, Then they are not counted in "N followers".
- SCR-AUTHOR-01-AC11 — Given an author page, When the reader presses "Share", Then the dialog shows the absolute author link and "Copy" turns into a check.
- SCR-AUTHOR-01-AC12 — Given a bio longer than 4 lines, Then it is clamped with "Show more"; a shorter bio shows no toggle; the full bio is always in the HTML.
- SCR-AUTHOR-01-AC08 [Proposed] — Given the reader shows mature content, Then the header story count equals the number of stories listed (U-AUTHOR-02).
- SCR-AUTHOR-01-AC09 [Proposed] — Given `/author/<username>`, Then the document title contains the author's display name and an unknown author returns HTTP 404 (F-AUTHOR-02).
- SCR-AUTHOR-01-AC10 [Proposed] — Given a member, Then they can open the list of authors they follow and unfollow from it (F-AUTHOR-01).

## F. Findings referenced
F-AUTHOR-01, F-AUTHOR-02, U-AUTHOR-01 (follow button a11y), U-AUTHOR-02 (story count), U-SRCH-01. See
[domain overview](../../overview.md#findings-index).

## G. Open questions
- Q-AUTHOR-01 — Should co-authored stories appear on a co-author's page (today only owned stories)?
