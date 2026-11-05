# Verification Plan (runtime)

How the flows that Phase 1 and Phase 2 could only check in code are verified in a browser with signed-in test
accounts on **`storynest-dev`** (approved by the Product Owner on 2026-11-05). Results are recorded in §6 and fed
back into the audits and [implementation-readiness.md](implementation-readiness.md). Entry point:
[README](../README.md).

## 1. Safety rules (all mandatory)

| Rule | How it is applied |
| --- | --- |
| Development only | Project `storynest-dev` (`kqhztlatrizexskwmpsn`) — the only StoryNest project; no production exists (DEC-005). No other project is touched |
| Clearly identified test data | Emails `qa.<role>@qa.storynest.test` (reserved `.test` TLD, undeliverable); usernames `qa_<role>`; display names `QA …`; story titles start with `[QA]` |
| No real content or accounts | Generated text only; no existing user is used, followed, reported or moderated |
| Test stories stay out of shared public lists | QA stories are **private** or **unlisted** (readable by link, excluded from discovery, sitemap and rankings). Checks that would need a public QA story in the shared feed are marked *Not executed* |
| No email | Accounts are created already confirmed by the admin channel (no confirmation email). No password-reset or email-change flow is triggered. Notifications are in-app only and reach QA accounts only (only QA accounts follow QA stories) |
| Moderation only on QA data | Reports, hides, removals and suspensions target QA content and QA accounts only |
| Moderator role | Granted through the project owner's Supabase admin connector (SQL on `auth.users.raw_app_meta_data`), the same mechanism the README documents ("server-set only"). No `service_role` key is read, printed or stored. If this channel is unavailable, moderator cases are **Blocked** |
| Credentials | One generated password, kept only in the session scratchpad (outside the repository); scripts read it from an environment variable. Never written to the repo, logs or reports |
| Cleanup | §7. Nothing outside the QA identifiers is deleted |

## 2. Test accounts

| Account | Username | Role in tests | How the role is obtained |
| --- | --- | --- | --- |
| QA Reader | `qa_reader` | Reader: follow, save, lists, progress, votes, comments, reports, notifications | Member |
| QA Author | `qa_author` | Owner of the QA stories | Creates the stories |
| QA Co-author | `qa_coauthor` | `co_author` on QA story A | Invited by qa_author through the Team screen and accepts |
| QA Editor | `qa_editor` | `editor` on QA story A | Invited by qa_author and accepts |
| QA Moderator | `qa_moderator` | Moderator | `app_metadata.role = 'moderator'` via the admin connector |
| QA Outsider | `qa_outsider` | Member with no role: RLS negatives; suspension target | Member |

## 3. Test data (created through the app as the users themselves)

| Data | Created by | Visibility |
| --- | --- | --- |
| `[QA] Câu chuyện kiểm thử A` with 3–4 chapters | qa_author (UI) | starts Private (default), then Unlisted |
| `[QA] Truyện riêng tư B` with 1 chapter | qa_author | Private |
| Follows, saves, a reading list `[QA] Danh sách`, votes, comments, replies, reports | qa_reader / qa_outsider | on QA story A only |

## 4. Test cases

IDs `VER-<AREA>-NN`. "Finding" = the Phase 1/2 claim the case confirms or refutes. Automation: **PW** = Playwright UI;
**API** = the same supabase-js client the app uses, signed in as the test user (publishable key + user session — no
elevated key).

### 4.1 Author (story, chapters, editor, publishing, history)

| ID | Steps | Expected (per spec) | Finding | How |
| --- | --- | --- | --- | --- |
| VER-AUT-01 | Sign in on `/login?next=/studio` | Lands on `/studio` | WF-AUTH-03 | PW |
| VER-AUT-02 | Create story A on `/studio/new` with defaults | Story created; visibility **Private**, status **Draft** | F-STM-08 | PW |
| VER-AUT-03 | Add chapter 1, open editor, type title + 2 paragraphs, wait | Status "Saved"; reload keeps the text | WF-EDT-02 | PW |
| VER-AUT-04 | Publish chapter 1 while the story is private; then open the chapter as qa_reader | Story status → ongoing, visibility stays private; reader gets not-found | F-STM-08 | PW + API |
| VER-AUT-05 | Change story A to Unlisted | Reader can open it by link | BR-STORY-* | PW |
| VER-AUT-06 | Type in the editor and immediately click an in-app link (Preview) | Spec: no server save, no warning; preview shows the older draft | F-EDT-02 | PW |
| VER-AUT-07 | Chapter manager: add chapters 2–3, rename a slug, move a chapter, archive and unarchive, delete and restore | Each action reflected; old slug 404s after rename | WF-CHM-01…05, F-STORY-03 | PW |
| VER-AUT-08 | Publish a second version; open History; compare; restore the older version | Draft replaced; versions unchanged | WF-HIST-01…03, F-HIST-01 | PW |
| VER-AUT-09 | Schedule an unpublished chapter for +2 min; wait for cron | Chapter becomes published by `publish_due_chapters` | WF-EDT-08 | PW |
| VER-AUT-10 | On a published chapter, try Schedule | Spec: refused (PT409 "changed elsewhere") | F-EDT-01 | PW |
| VER-AUT-11 | Unpublish a chapter | Reader can no longer open it | WF-EDT-09 | PW |
| VER-AUT-12 | Studio home card "n chapters" vs published count | Spec: counts drafts/archived too | F-STM-07 | PW |
| VER-AUT-13 | Open Stats of story A | Page loads; story not named | U-STAT-01 | PW |
| VER-AUT-14 | Preview: scroll | Spec (Inferred): sticky bar hidden under header | F-HIST-03 | PW |

### 4.2 Co-author / editor (collaboration and limits)

| ID | Steps | Expected | Finding | How |
| --- | --- | --- | --- | --- |
| VER-TEAM-01 | qa_author invites qa_coauthor (co-author) and qa_editor (editor) on Team | Pending invitations listed | WF-TEAM-01 | PW |
| VER-TEAM-02 | Each invitee opens `/studio`, accepts | Story appears in their Studio | WF-TEAM-02 | PW |
| VER-TEAM-03 | qa_editor: Edit story page and chapter manager | Read-only notice; no delete/restore buttons | BR-TEAM-010 | PW |
| VER-TEAM-04 | qa_editor: edit a chapter draft and publish | Spec: allowed (contradicts invite hint) | F-TEAM-01 | PW |
| VER-TEAM-05 | qa_editor via API: set `chapters.deleted_at` on a chapter of story A | Spec: **succeeds** (RLS gap); owner then restores | F-CHM-01 | API |
| VER-TEAM-06 | qa_coauthor via API: set `stories.deleted_at` on story A | Spec: **succeeds** (RLS gap); owner then restores | F-STM-01 | API |
| VER-TEAM-07 | qa_coauthor: open Team | "Only the owner can manage this"; no team list; no Leave | F-TEAM-02, U-TEAM-02 | PW |
| VER-TEAM-08 | qa_coauthor via API: insert a collaborator | Refused | BR-TEAM-* | API |

### 4.3 Reader (library, follow, save, progress, comments, notifications)

| ID | Steps | Expected | Finding | How |
| --- | --- | --- | --- | --- |
| VER-RDR-01 | Open story A by link; Follow; Save; Add to new list | Buttons toggle; Library tabs Saved/Following and Lists show them | WF-LIB-01/02, WF-LIST-03 | PW |
| VER-RDR-02 | Read chapter 1 to ~60 %, reload | Position restored; story page shows Continue | WF-PROG-01/02 | PW |
| VER-RDR-03 | Read to the end marker without scrolling through comments | Spec: not counted as finished (< 95 % of the page) | F-PROG-01 | PW |
| VER-RDR-04 | Scroll the reader | Toolbar/progress covered by header | F-READ-01 (already Runtime as guest) | PW |
| VER-RDR-05 | Vote and unvote | Count updates; persists on reload | WF-VOTE-01 | PW |
| VER-RDR-06 | Chapter comment, paragraph comment, like, edit, delete | All succeed; "(edited)" shown after edit | WF-CMT-02…07 | PW |
| VER-RDR-07 | qa_author publishes a new chapter; wait for the outbox | qa_reader's bell shows unread; notification opens the chapter | WF-NOTI-01/04/05 | PW |
| VER-RDR-08 | qa_author replies to qa_reader's comment | qa_reader notified; link scrolls to the paragraph / comments | WF-NOTI-02, U-NOTI-01 | PW |
| VER-RDR-09 | qa_reader turns off "new chapter" notifications in Settings; author publishes again | No new notification | BR-SET-006 | PW |
| VER-RDR-10 | Library "Continue" after finishing a chapter vs story page "Continue" | Spec: they point to different chapters | F-PROG-02 | PW |
| VER-RDR-11 | Header "Sign in" from a chapter page (guest), then sign in | Spec: lands on Home, not the chapter | U-SHELL-04 | PW |

### 4.4 Moderator (report, review, actions, permissions)

| ID | Steps | Expected | Finding | How |
| --- | --- | --- | --- | --- |
| VER-MOD-01 | qa_reader reports a QA comment and story A | "Report sent" | WF-MOD-01 | PW |
| VER-MOD-02 | qa_reader opens `/moderation` | 404 | WF-MOD-05 | PW |
| VER-MOD-03 | qa_moderator opens `/moderation` | Both reports in the queue | WF-MOD-02 | PW |
| VER-MOD-04 | Hide the QA comment with a reason; then unhide | Comment hidden for readers; audit row written | WF-MOD-03/04 | PW + API |
| VER-MOD-05 | Remove story A; qa_author opens Studio | Spec: story under "Deleted" with Restore that fails with a permission message | F-MOD-02 | PW |
| VER-MOD-06 | Moderator "Open content" on the removed story | Spec: not-found | F-MOD-09 | PW |
| VER-MOD-07 | Moderator restores story A | Story readable again by link | WF-MOD-04 | PW |
| VER-MOD-08 | Suspend qa_outsider; qa_outsider tries to comment, then edits an existing own comment via API | Comment refused; spec: edit still allowed | BR-MOD-*, F-CMT-02 | PW + API |
| VER-MOD-09 | Reactivate qa_outsider | Account active again | WF-MOD-04 | PW |

### 4.5 Cross-role (RLS, unauthorized actions, errors)

| ID | Steps | Expected | Finding | How |
| --- | --- | --- | --- | --- |
| VER-X-01 | Guest opens `/studio/story/<A>`; private story B page | Redirect to sign-in; story B not-found | BR-AUTH-*, BR-STORY-* | PW |
| VER-X-02 | qa_outsider via API updates story A title | 0 rows / refused | BR-STM-* | API |
| VER-X-03 | qa_outsider via API reads chapter drafts of A | 0 rows | BR-EDT-* | API |
| VER-X-04 | qa_reader via API reads notifications of other users | 0 rows | BR-NOTI-* | API |
| VER-X-05 | qa_reader opens `/studio/story/<A>` | No access (not-found state) | BR-TEAM-* | PW |
| VER-X-06 | `/studio/story/not-a-uuid` as qa_author | Spec: "check your connection" error instead of not-found | F-STM-06 | PW |

### 4.6 Not executed by design

| Case | Reason |
| --- | --- |
| Suspended author's story on the public home feed (F-HOME-01), sitemap (F-SEO-01) | Needs a **public** QA story in the shared feed; stays Verified (Code) |
| Sign-up submission, password reset, email change (F-AUTH-01, F-AUTH-03/04) | Would send email |
| Google OAuth | Not implemented |

## 5. Automation

Scripts live in [`verification/`](../verification/README.md): a setup checklist, a Playwright runner and the
cleanup SQL. They read `QA_PASSWORD` and the dev URL/publishable key from the environment and never print them.
Screenshots and JSON results are written to a local output folder outside the repository; only summaries are copied
into this document.

## 6. Results

See [§6 in the verification report](../verification/README.md#results) — filled in after the run.

## 7. Cleanup

The accounts and data are kept for repeatable runs until the Product Owner asks for removal. Cleanup touches only
QA identifiers: see [`verification/cleanup.sql`](../verification/cleanup.sql). It deletes QA stories (cascading
their chapters, comments, follows, votes, lists items and notifications) and then the QA auth users; it never
deletes rows owned by non-QA users. Moderation audit rows about QA targets are kept as history unless the Product
Owner asks otherwise.
