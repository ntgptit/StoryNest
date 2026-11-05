# OBJ-AUTHOR — Workflows

### WF-AUTHOR-01 — Visit an author page
| Field | Value |
| --- | --- |
| User goal | Learn who wrote a story and what else they wrote |
| Trigger | Author name link on the story page (`story/screens/story-screen.tsx:87`), author row in SCR-SRCH-01, moderation report card, or a typed `/author/<username>` |
| Preconditions | — |
| Main flow | 1. Skeleton until the session is known. 2. `author_profile` → header (avatar, name, @username, followers, stories, bio), Follow and Report buttons. 3. Story grid loads (BR-AUTHOR-004), infinite paging. 4. Card → story page. |
| Alternative flows | 2a. Own page → no Follow button. 2b. Unknown/suspended/deleted → "Author not found". |
| Exception flows | Profile error → error state + "Try again"; story list error → error state in the section. |
| Success criteria | Header numbers match the DB; only eligible stories listed |
| Postconditions | — |
| Affected objects | OBJ-AUTHOR, OBJ-HOME, OBJ-MOD |
| Related screens | SCR-AUTHOR-01 |
| Status | Verified (`author/author.test.tsx:257-334`) |

### WF-AUTHOR-02 — Follow / unfollow an author
| Field | Value |
| --- | --- |
| User goal | Get this author's updates in my feed |
| Trigger | "Follow" / "Following" button on SCR-AUTHOR-01 |
| Preconditions | Profile loaded; not own page |
| Main flow | 1. Member presses "Follow". 2. Button disabled; `set_user_follow(id, true)`. 3. Button shows "Following" (pressed), follower count = returned count, toast "You're now following this author.". 4. Following feed and discovery caches invalidated. 5. Pressing "Following" unfollows the same way (toast "Unfollowed."), no confirmation. |
| Alternative flows | 1a. Guest → `/login?next=/author/<username>` → after login back on the page; must press again. |
| Exception flows | PT409 limit, PT404 author gone, other → error toast; state unchanged. Suspended follower → RLS refusal → generic toast. |
| Success criteria | State persists after reload; count matches |
| Postconditions | `user_follows` edge inserted/deleted; new stories of the author appear in `/following`, "Recommended for you" may gain `followed_author` items |
| Affected objects | OBJ-AUTHOR, OBJ-REC, OBJ-AUTH |
| Related screens | SCR-AUTHOR-01 → (login) → SCR-AUTHOR-01; SCR-AUTHOR-02 |
| Status | Verified (`author/author.test.tsx:334-389`, `docs/WBS.md:209` browser check) |

### WF-AUTHOR-03 — Read the followed-authors feed
| Field | Value |
| --- | --- |
| User goal | See what my authors updated recently |
| Trigger | "From authors you follow" link on SCR-HOME-01 (only entry point) or typed `/following` |
| Preconditions | Signed in (else redirected to login and back) |
| Main flow | 1. Page header "From authors you follow / Recently updated stories from the authors you follow." 2. Skeleton, then cards newest-update first. 3. Infinite paging by cursor of the last story. 4. Card → story page. |
| Alternative flows | 2a. Follows nobody / no eligible stories → "No stories yet / Follow a few authors and their updated stories will show up here." (no link to find authors). |
| Exception flows | First page error → "Couldn't load the list" + "Try again"; later page error silent (U-SRCH-01). |
| Success criteria | Only followed, active authors' eligible stories |
| Postconditions | — |
| Affected objects | OBJ-AUTHOR |
| Related screens | SCR-AUTHOR-02 |
| Status | Verified (`author/author.test.tsx:460-522`) |
