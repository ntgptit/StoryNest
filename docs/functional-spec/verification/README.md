# Runtime Verification (signed-in flows)

Executable evidence for [verification-plan.md](../proposals/verification-plan.md). Run on **2026-11-05** against
`storynest-dev` with six QA accounts, Chromium (Playwright) at 1280 px (reader steps also at 390 px), application
code at `97ccecd` (unchanged since the Phase 1 baseline). Entry point: [README](../README.md).

## Results

**50 cases: 32 PASS · 16 CONFIRMED · 1 NEW DEFECT · 1 NOT CONCLUSIVE.**

Legend: **PASS** = behaves as the spec says · **CONFIRMED** = a previously documented finding reproduced at runtime ·
**NEW DEFECT** = not documented before · **NOT CONCLUSIVE** = the test data could not isolate the behaviour.

| Case | Result | Finding / rule | Observed |
| --- | --- | --- | --- |
| VER-AUT-01 | PASS | — | signed in as qa_author, at /studio |
| VER-AUT-02 | CONFIRMED | F-STM-08 | story A 72690276-7c34-487f-8485-9bbc16fbf100; default visibility "Riêng tư", status "Bản nháp" (F-STM-08 premise) |
| VER-AUT-03 | PASS | — | typed text present after reload (autosaved). Note: the idle "saved" state shows only the word count, no "Đã lưu" label |
| VER-AUT-04 | CONFIRMED | F-STM-08 | published chapter 1; publish panel says "Đã đăng, người đọc thấy bản đã đăng"; reader sees not-found=true (HTTP 200) because the story is still private; Studio row: [QA] Câu chuyện kiểm thử A / Đang ra / Riêng tư |
| VER-AUT-05 | PASS | — | after Unlisted the reader opens the story by link (HTTP 200, canonical /story/72690276-7c34-487f-8485-9bbc16fbf100/qa-cau-chuyen-kiem-thu-a) |
| VER-AUT-06 | CONFIRMED | F-EDT-02 | typed then clicked "Xem trước": warning dialog=false; server draft contains new text=false (revision 4→4); preview shows new text=false; device backup keys=1 (F-EDT-02) |
| VER-AUT-07 | PASS | F-STORY-03, F-NOTI-01 | rename "Đã đổi đường dẫn." (old chapter URL now HTTP 200 → rendered not-found (soft 404)); move down → order ["Chương 1","Chương 2","Chương 3"]; archive "Đã lưu trữ chương."; unarchive "Đã bỏ lưu trữ, chương trở về bản nháp."; delete "Đã xóa chương."; restore "Đã khôi phục chương.". Old chapter URL after rename → soft 404 (F-STORY-03/F-NOTI-01: the follower notification for that chapter now dead-ends). Unarchive returns a published chapter to draft (documented toast) |
| VER-AUT-08 | PASS | F-HIST-01 | history lists 2 versions; compare summary ""; restore → "Đã khôi phục vào bản nháp." (revision 4→5); unsaved device text offered before restore=true, after restore=false (F-HIST-01: backup removed, no undo) |
| VER-AUT-09 | PASS | — | scheduled for 2026-11-05T04:38 UTC → "Đã hẹn giờ đăng." (panel: "Hẹn đăng lúc 04:38 5 thg 11, 2026 (UTC)"); after waiting the cron job set status = published |
| VER-AUT-10 | CONFIRMED | F-EDT-01 | Schedule offered on the published chapter → "Bản nháp hoặc trạng thái chương đã thay đổi ở nơi khác. Tải lại trang rồi thử lại." (F-EDT-01) |
| VER-AUT-11 | PASS | — | unpublish → "Đã gỡ chương, chương trở về bản nháp."; reader request for the chapter → HTTP 200 with a not-found page |
| VER-AUT-12 | CONFIRMED | F-STM-07 | Studio row shows "3 chương" while published chapters = 1 (F-STM-07) |
| VER-AUT-13 | PASS | U-STAT-01 | stats page loads; names the story: false; first lines "Thống kê truyện /  / Người đọc truyện của bạn và nơi họ dừng lại. /  / Về Studio / Trong khoảng đã chọn / 7 ngày / 30 ngày / 90 ngày / Lượt đọc / 2 / Lượt thích m" (U-STAT-01) |
| VER-AUT-14 | CONFIRMED | F-HIST-03 | preview at 390px after scrolling: "Về trình soạn" covered by A (F-HIST-03) |
| VER-AUT-15 | NEW DEFECT | **F-STM-09 (new)** | owner restores the soft-deleted QA story from Studio "Truyện đã xóa" → toast "Bạn không có quyền thực hiện thao tác này."; DB error: permission denied for function last_moderation_action (trigger stories_guard_removal) |
| VER-TEAM-01 | PASS | — | invitations sent and accepted; team page now lists: Đang cộng tác /  / QA Co-author /  / @qa_coauthor /  / Đồng tác giả / Gỡ /  / QA Editor /  / @qa_editor /  / Biên tập viên / Gỡ / Lời mời /  / QA Editor /  / @qa_editor · Biên tập viên /  / Đã chấp nhận /  / QA Co-author /  / @qa_coauthor · Đồng tác giả /  / Đã chấp  |
| VER-TEAM-02 | PASS | — | co-author and editor accepted from the Studio inbox; story listed in their Studio |
| VER-TEAM-03 | PASS | — | editor: story form text starts "Chỉnh sửa truyện /  / Thay đổi thông tin hiển thị của truyện. /  / Quản lý chương /  / Bạn l…"; delete buttons in chapter manager: 0 |
| VER-TEAM-04 | CONFIRMED | F-TEAM-01 | invite hint for editor says "không đăng hay xóa", but the editor published a new version: "Đã đăng bản mới." (F-TEAM-01) |
| VER-TEAM-05 | CONFIRMED | F-CHM-01 | editor PATCH chapters.deleted_at via API → 1 row(s) updated (F-CHM-01) |
| VER-TEAM-06 | CONFIRMED | F-STM-01 | co-author PATCH stories.deleted_at via API → 1 row(s) updated (F-STM-01) |
| VER-TEAM-07 | CONFIRMED | F-TEAM-02, U-TEAM-02 | co-author sees "Chỉ chủ sở hữu quản lý được /  / Bạn không có quyền mời hay gỡ cộng tác viên của truyện này.…": no member list, no Leave action (F-TEAM-02, U-TEAM-02) |
| VER-TEAM-08 | PASS | — | co-author inserting a collaborator via API → 42501 permission denied for table story_collaborators |
| VER-RDR-01 | PASS | — | follow → "Đã theo dõi. Bạn sẽ nhận thông báo khi có chương mới."; save → "Đã theo dõi. Bạn sẽ nhận thông báo khi có chương mới."; list → "Đã theo dõi. Bạn sẽ nhận thông báo khi có chương mới."; Library tabs contain the QA story/list: {"Đã lưu":true,"Đang theo dõi":true,"Danh sách":true} |
| VER-RDR-02 | PASS | — | scrolled to 60 % of a 222px page, waited, reopened: story CTA "Đọc tiếp · Chương 1", restored scrollY=222 |
| VER-RDR-03 | NOT CONCLUSIVE | F-PROG-01 | QA chapter is short (page scroll range 222 px), so the 95 % rule could not be separated from the comment section; F-PROG-01 stays Verified (Code) |
| VER-RDR-05 | PASS | — | vote persisted after reload: true |
| VER-RDR-06 | PASS | — | chapter comment and paragraph comment posted (DB shows both, paragraph one bound to a block id); like → "Bỏ thích" shown; edit saved and "(đã sửa)" shown: true. Delete covered in VER-RDR-06b; DB: 1 like, body edited, story_stats reads 1 · saves 1 · votes 1 · comments 2 · followers 1 (counters match) |
| VER-RDR-07 | PASS | — | follower notification "chapter_published" created < 1 min after publishing (DB created_at 04:16:00 vs publish ~04:15:30); bell showed "Thông báo, 1 chưa đọc"; item link /story/72690276-7c34-487f-8485-9bbc16fbf100/qa-cau-chuyen-kiem-thu-a/chuong-thu-hai opens the chapter (h1 "Chương thử hai") |
| VER-RDR-08 | PASS | U-NOTI-01 | author reply via post_comment → reader notification "comment_replied" < 1 min; item link /story/72690276-7c34-487f-8485-9bbc16fbf100/qa-cau-chuyen-kiem-thu-a/chuong-thu-mot#comments scrollY=0; reply highlighted / thread opened: no (U-NOTI-01 confirmed) |
| VER-RDR-09 | PASS | BR-SET-006 | reader switched off "Chương mới" (was true); author published chapter 4; after 100 s the reader has 0 notification(s) for it (BR-SET-006) |
| VER-RDR-10 | CONFIRMED | F-PROG-02, U-READ-03 | after finishing chapter 1 (completed_at set): story page CTA "Đọc tiếp · Chương 4"; library "Reading" row "[QA] Câu chuyện kiểm thử A /  / QA Author /  / Đang ra /  / Dữ liệu kiểm thử tự động (QA). Không phải nội dung thật. /  / 2 / Lượt đọc: 2 / 1 / Lượt bình chọn: 1 /  / Cập nhật 1 phút trước /  / Đọc tiếp chương 2 / Xóa k" → /story/72690276-7c34-487f-8485-9bbc16fbf100/qa-cau-chuyen-kiem-thu-a/chuong-thu-mot (F-PROG-02) — library label says "chương 2" but links to chapter 1 (position = sort_order after the reorder, U-READ-03) |
| VER-RDR-11 | CONFIRMED | U-SHELL-04 | header "Đăng nhập" on a chapter page links to "/login" (no next → user lands on /me or home after sign-in) (U-SHELL-04) |
| VER-MOD-01 | PASS | Q-MOD-03 | story → "Đã gửi báo cáo. Cảm ơn bạn."; comment → "Đã gửi báo cáo. Cảm ơn bạn."; account → "Đã gửi báo cáo. Cảm ơn bạn.". Note: a first script attempt reported chapter 1 instead of the comment (locator error); the chapter report card offers only "Gỡ truyện" (whole story, Q-MOD-03). It was left pending on QA data |
| VER-MOD-01b | PASS | — | comment report (on QA Outsider's comment) → "Đã gửi báo cáo. Cảm ơn bạn." |
| VER-MOD-02 | PASS | — | reader /moderation → HTTP 200 not-found page |
| VER-MOD-03 | PASS | — | moderator sees the queue with the QA reports (story, comment, account): [QA] Câu chuyện kiểm thử A · [QA] báo cáo thử nghiệm truyện · [QA] báo cáo thử nghiệm tài khoản |
| VER-MOD-04 | PASS | — | after "Ẩn bình luận" the report moved to "Đã xử lý"; other readers see the comment: false; its author sees status "hidden"; after "Hiện lại bình luận" → "Đã thực hiện.", visible again: true |
| VER-MOD-05 | CONFIRMED | F-MOD-02 | moderator "Gỡ truyện" → "Đã thực hiện."; author Studio lists it under "Truyện đã xóa" with "Khôi phục", no moderation notice (true); clicking Khôi phục → "Bạn không có quyền thực hiện thao tác này." (F-MOD-02; note the same message appears for any owner restore, see VER-AUT-15) |
| VER-MOD-06 | CONFIRMED | F-MOD-09 | "Mở nội dung" → /story/72690276-7c34-487f-8485-9bbc16fbf100/qa-cau-chuyen-kiem-thu-a shows "StoryNest / VI / QM / 404 / This page could not be found." (F-MOD-09) |
| VER-MOD-07 | PASS | — | moderator "Khôi phục truyện" → "Đã thực hiện."; story readable again: true |
| VER-MOD-08 | CONFIRMED | F-CMT-02, F-MOD-06, Q-LIB-01 | suspend → "Đã thực hiện."; suspended outsider: new comment → 42501 refused; edit own comment → ALLOWED (F-CMT-02); follow a story → ALLOWED (Q-LIB-01 / PD-05); no suspension notice anywhere on Home (screenshot) (F-MOD-06, F-AUTH-08) |
| VER-MOD-09 | PASS | — | reinstate → "Đã thực hiện."; outsider visible as active again: {"account_status":"active"} |
| VER-X-01 | PASS | — | guest /studio/story/<A> → /login?next=%2Fstudio%2Fstory%2F72690276-7c34-487f-8485-9bbc16fbf100 |
| VER-X-02 | PASS | — | outsider updating story A title → 0 rows |
| VER-X-03 | PASS | — | outsider reading drafts of story A → 0 rows |
| VER-X-04 | PASS | — | reader selecting other users' notifications → 0 rows |
| VER-X-04b | PASS | — | anonymous client reading chapter_drafts → 42501 |
| VER-X-05 | PASS | — | reader opening /studio/story/<A> sees "Không tìm thấy truyện /  / Truyện không tồn tại hoặc bạn không có quyền truy cập." |
| VER-X-06 | CONFIRMED | F-STM-06 | /studio/story/not-a-uuid shows "Không tải được danh sách truyện /  / Kiểm tra kết nối và thử lại. /  / Thử lại" (F-STM-06) |

Not executed by design (verification plan §4.6): suspended author on the public home feed / sitemap (would need a
public QA story in the shared feed), sign-up submission, password reset, email change (would send email), Google
OAuth (not implemented). VER-RDR-04 (reader toolbar under the header) was verified as a guest in Phase 2 and was not
repeated.

## Test accounts and data

| Account | Username | Role | Notes |
| --- | --- | --- | --- |
| `qa.reader@qa.storynest.test` | `qa_reader` | Member (reader) | Follows/saves story A, list `[QA] Danh sách`, votes, comments, reports |
| `qa.author@qa.storynest.test` | `qa_author` | Owner of story A | |
| `qa.coauthor@qa.storynest.test` | `qa_coauthor` | `co_author` on story A | Accepted invitation |
| `qa.editor@qa.storynest.test` | `qa_editor` | `editor` on story A | Accepted invitation |
| `qa.moderator@qa.storynest.test` | `qa_moderator` | Moderator (`app_metadata.role`) | Granted through the admin connector |
| `qa.outsider@qa.storynest.test` | `qa_outsider` | Member, no role | Suspended and reinstated during VER-MOD-08/09 |

- Accounts were created already confirmed through the project owner's Supabase admin channel ([setup.sql](setup.sql)),
  so **no email was sent**. The password hash was computed locally; the plaintext is not in the repository, logs or
  this report. No `service_role` key was used.
- Data (all created through the app or the app's own API client as the QA users): story
  `[QA] Câu chuyện kiểm thử A` (`72690276-7c34-487f-8485-9bbc16fbf100`, **unlisted**), 4 chapters (2 published at
  the end of the run), comments, a paragraph comment, a reply, a vote, a like, a follow, a save, a reading list,
  notifications to `qa_reader`, four reports, moderation actions on QA targets only.
- One **admin repair on QA data** was needed and is recorded: story A was restored through the admin channel after
  VER-TEAM-06, because the owner's own restore fails on Supabase (F-STM-09).
- The moderation queue also shows older reports from a previous E2E dataset (`e2e_invitee`); they were **not**
  touched.
- In-app notifications reached `qa_reader` only. No other account follows QA content.

## How to re-run

1. Dev server: `cp apps/web/.env.example apps/web/.env.local`, fill the dev URL and publishable key, `pnpm --filter
   @storynest/web dev`. Delete `.env.local` afterwards.
2. Environment: `QA_PASSWORD` (the QA password), `QA_SUPABASE_URL`, `QA_SUPABASE_KEY` (publishable key), optional
   `QA_OUT_DIR` (defaults to the OS temp folder; screenshots, browser sessions and `results.json` go there — never
   into the repository).
3. Run the scripts in order from `docs/functional-spec/verification/playwright/`: `node 01-stage1.mjs` … `node
   13-stage8c.mjs` (`06-stage3b.mjs` takes the comment-menu label `"Tùy chọn bình luận"` as its argument). They are
   a sequential run-book: they create new data, so run [cleanup.sql](cleanup.sql) (or use new QA story names) before
   a second full run.
4. Global Playwright from the container is used through `createRequire`; `@supabase/supabase-js` is resolved from
   `apps/web`.

| Script | Cases |
| --- | --- |
| 01–02 | VER-AUT-01…05 |
| 03–04 | VER-TEAM-01…08, VER-AUT-15 |
| 05–07 (incl. `06a`) | VER-RDR-01…08 |
| 08 | VER-AUT-06, VER-AUT-08, VER-AUT-14 |
| 09–10 | VER-AUT-07, 09…13 |
| 11 | VER-RDR-09…11, VER-X-01…06 |
| 12–13 | VER-MOD-01…09 |

## Full re-run after PR #60

2026-11-05, `main` at `e17014b`, `storynest-dev`, the same six QA accounts, a new QA story (`[QA] Câu chuyện kiểm thử A`,
slug suffix from `QA_SLUG_SUFFIX`). Earlier QA stories were renamed "(lượt chạy N)" so scripts find the new one. Nothing
was deleted from the shared project (see Cleanup below).

**Result: all scripts ran to the end; 49 cases recorded.**

| Result | Count |
| --- | --- |
| PASS | 30 |
| CONFIRMED (known finding reproduced) | 14 |
| CHECK (read the note) | 2 (VER-RDR-03, VER-RDR-06) |
| NEW DEFECT (F-STM-09 again) | 1 (VER-AUT-15) |
| INFO | 2 |

The run needed these run-book fixes (all committed): `lib.mjs` exported a `URL` that hid the global `URL`, so no script
started; the story form now has a link ("Đường dẫn") that must be unique per author, so `01` fills it from
`QA_SLUG_SUFFIX`; visibility is a radio-card group (`01`, `02`); `02` no longer fails when `01` already published
chapter 1; "Hẹn giờ…" is an option of the publish split button ("Cách đăng khác", helper `openSchedule` in `pw.mjs`);
comment edit is in the options menu (`05`); `pw.mjs` marks the editor tour as seen; and `06a-stage4.mjs` (add, write and
publish chapter 2, follower notification) was missing from the run-book although `07` and `09` need chapter 2.

Two steps are outside the scripts: after `04-stage2b.mjs` the owner cannot restore the deleted story (F-STM-09), so the
QA story is restored with an admin `update public.stories set deleted_at = null where id = '<QA story>'` (QA-owned row
only) before `05`. Run order: `01`–`04`, that restore, then `05`, `06`, `06a`, `07`…`13` (env: `QA_SLUG_SUFFIX` new for
each run).

Not re-run after the last edit: the lookup in `06a-stage4.mjs` (RDR-08 part) is now limited to this story's chapter
(it failed on the shared comment text with several QA stories present); `07` records VER-RDR-07/08 anyway and passed.

## After PR #62 and #63 (batch 3 UI, batch 4 backend)

Merged into this branch before PR #61 was merged. Their screen-table rows (written for the new code) were kept; the
Lucian trial stays **DEC-025**. 811 citations that only moved were re-pointed with `check-citations.mjs`. **239
citations point at code that #62/#63 edited and were not re-read.** The new migrations (24) and features
(announcements, edit locks, notification preferences, story role rights, …) are covered by those PRs' own spec rows,
not by the Phase 1–9 audits, and no runtime re-run was done on them. To list the open citations:

```text
node docs/functional-spec/verification/check-citations.mjs --base e17014b --head origin/main \
  --written-with-head "e17014b..origin/main,8ab3b3d"
```

## Catalog parity, local PostgreSQL vs `storynest-dev` (2026-11-13)

Method: the same read-only query on both databases lists every function in `public` (`SECURITY DEFINER`, fixed
`search_path`, `EXECUTE` for `anon`, `authenticated`, `service_role`) and every table (RLS on, table grants for `anon`
and `authenticated`, policy count). The local side is the throwaway database of `pnpm db:verify` (shim + all migrations);
the lines were compared in 24 groups by an MD5 of the sorted lines of each group.

| Result | Detail |
| --- | --- |
| 197 lines compared (143 functions, 54 tables) | 23 of 24 groups identical, including every function and table added by batch 4 (edit locks, read sources, per-type notifications, announcements, author stats, role matrix) |
| Only difference | `blank_notification_excerpt()` (WP 9.24) exists locally, not yet on dev: the migration is merged but not applied |
| What this proves | Privileges, definer/invoker, `search_path` and RLS shape match what the SQL tests assume |
| What it does not prove | Behaviour with real session tokens through the REST API (VER-* style cases); only the 9.1 and 9.40 flows were exercised with real roles (self-rolling-back blocks) |

No parity defect found; no finding opened. Behavioural QA-session runs for the batch 4 functions remain open.

## Cleanup

Kept for repeatable runs until the Product Owner asks for removal. [cleanup.sql](cleanup.sql) removes only rows tied
to the six QA account ids (reports, comments, QA stories with their cascades, then the accounts). It never touches
non-QA rows; moderation audit rows are kept as history by default.

**Known limit (2026-11-05):** deleting a QA story fails on `deny_published_version_mutation` (published chapter versions are immutable, also through cascade), so the script cannot remove a story that has a published chapter. Use new story names (`QA_SLUG_SUFFIX`) for repeat runs; deleting would need that trigger disabled on dev, which was not done.

## Regression after PR #60

2026-11-05, `main` at `e17014b` (Lucian UX/UI trial), same QA accounts. Scripts were run ad hoc (not added to the
run-book yet). Results:

| Check | Result |
| --- | --- |
| REG-READ-390 / 1280 reader toolbar after scroll | **Fixed** |
| REG-NAV-768 / 1280 primary navigation | **Fixed** (second header row; phone has "Mở menu") |
| REG-EDT-01 Schedule on a published chapter | **Fixed** |
| REG-EDT-02 leaving the editor via an in-app link | **Still open** (3 warm runs) |
| REG-STM-09 owner restores a deleted story | **Still open** (42501) |
| REG-TEAM-05 / 06 editor deletes chapter / co-author deletes story | **Still open** |
| REG-404 missing story status | Still open (HTTP 200) |
| REG-MAT-01 18+ title in HTML | Still open |
| REG-SHELL-04 header sign-in without `next` | Still open |
| REG-LIB, REG-SET, REG-MOD, REG-X-02 | Pass |

**Run-book change needed:** the chapter editor shows a first-run tour per device (`SpotlightTour`) whose overlay
intercepts clicks. Scripts that open the editor must click "Bỏ qua" first (or set the tour-seen flag). The 13 scripts
were not re-run end to end.

The QA story was soft-deleted by REG-TEAM-06 (as VER-TEAM-06 does) and restored through the admin channel because of
F-STM-09; one more QA row repair, no other data touched.
