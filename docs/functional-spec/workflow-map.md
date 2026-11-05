# Workflow Map

All 144 documented workflows, grouped by domain, with the screens each one touches. Each workflow is defined once
in its object's `workflows.md`; this page only indexes them. Entry point: [README](README.md).

## 1. End-to-end journeys (cross-domain)

| Journey | Steps (workflow → screen) | Notes / known breaks |
| --- | --- | --- |
| J1 Discover and read | WF-HOME-01/02, WF-SRCH-01/02, WF-RANK-01 → WF-STORY-01 (SCR-STORY-01) → WF-STORY-02 → WF-READ-01/02 (SCR-READ-01) → WF-PROG-01/04 → WF-LIB-03 (SCR-LIB-01) | F-PROG-01 (completion measured over comments), F-PROG-02 (continue target differs story vs library), U-READ-01 (nav below comments) |
| J2 Author publishes, followers are told | WF-STM-02 (SCR-STM-02) → WF-CHM-01 (SCR-CHM-01) → WF-EDT-02/07 or WF-EDT-08 (SCR-EDT-01) → WF-JOB-01/02 → WF-NOTI-01 (SCR-NOTI-01) → WF-NOTI-05 → WF-READ-01 | F-EDT-02 (leaving editor loses text), F-EDT-05/F-JOB-01 (failed schedule invisible), F-NOTI-01 (links break after slug rename) |
| J3 Engagement loop | WF-VOTE-01, WF-CMT-02/03/04 (SCR-CMT-01) → WF-NOTI-02 → WF-NOTI-05 → SCR-READ-01 | U-NOTI-01 (reply link does not open the reply), U-CMT-01 (paragraph button hard to tap) |
| J4 Collaboration | WF-TEAM-01 (SCR-TEAM-01) → WF-NOTI-03 → WF-TEAM-02 (SCR-STM-01 inbox) → WF-EDT-01 | F-TEAM-01 (editor role copy vs real rights), F-TEAM-02 (cannot leave) |
| J5 Report and moderate | WF-MOD-01 (SCR-MOD-02) → WF-MOD-02/03 (SCR-MOD-01) → WF-MOD-06 (SCR-STM-01, SCR-CMT-01, shell) | F-MOD-02 (removed story looks self-deleted), F-MOD-05 (suspension inconsistent), F-MOD-06 (nobody is told) |
| J6 Join and set up | WF-AUTH-01 (SCR-AUTH-02) → WF-AUTH-02 (`/auth/callback`) → WF-AUTH-03 (SCR-AUTH-01) → WF-PRF-02/03 (SCR-PRF-02) → WF-SET-01/02 (SCR-SET-01) | F-AUTH-01 (username silently altered), F-AUTH-03 (no resend), F-AUTH-04 (cross-device link) |
| J7 Mature content | WF-MAT-01 (header) / WF-MAT-02 (SCR-MAT-01 gate) → WF-MAT-03/04 (SCR-SET-01) | F-MAT-01 (gate is client-only), F-MAT-02 (others' lists), F-MAT-03 (survives sign-out) |

## 2. Index by domain

### account

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-AUTH-01](domains/account/authentication/workflows.md#wf-auth-01--sign-up-with-email-and-password) | Sign up with email and password | SCR-AUTH-01, SCR-AUTH-02 |
| [WF-AUTH-02](domains/account/authentication/workflows.md#wf-auth-02--open-an-email-link-authcallback) | Open an email link (`/auth/callback`) | SCR-AUTH-01, SCR-AUTH-04 |
| [WF-AUTH-03](domains/account/authentication/workflows.md#wf-auth-03--sign-in) | Sign in | SCR-AUTH-01 |
| [WF-AUTH-04](domains/account/authentication/workflows.md#wf-auth-04--forgot-and-reset-password-cross-screen) | Forgot and reset password (cross-screen) | SCR-AUTH-01, SCR-AUTH-03, SCR-AUTH-04 |
| [WF-AUTH-05](domains/account/authentication/workflows.md#wf-auth-05--reach-a-protected-page-while-signed-out) | Reach a protected page while signed out | SCR-AUTH-01 |
| [WF-AUTH-06](domains/account/authentication/workflows.md#wf-auth-06--sign-out) | Sign out | SCR-SHELL-01 |
| [WF-AUTH-07](domains/account/authentication/workflows.md#wf-auth-07--google-oauth-sign-in-not-implemented) | Google OAuth sign-in [Not implemented] | Not implemented (would use SCR-AUTH-01/02) |
| [WF-AUTH-08](domains/account/authentication/workflows.md#wf-auth-08--account-lifecycle-deactivate-delete-anonymise-export-not-implemented) | Account lifecycle: deactivate, delete (anonymise), export [Not implemented] | Not implemented (would use SCR-SET-01) |
| [WF-PRF-01](domains/account/profile/workflows.md#wf-prf-01--view-my-profile) | View my profile | SCR-PRF-01 |
| [WF-PRF-02](domains/account/profile/workflows.md#wf-prf-02--edit-profile-details) | Edit profile details | SCR-PRF-01, SCR-PRF-02 |
| [WF-PRF-03](domains/account/profile/workflows.md#wf-prf-03--add-or-change-the-profile-picture) | Add or change the profile picture | SCR-PRF-02, SCR-SHELL-01 |
| [WF-PRF-04](domains/account/profile/workflows.md#wf-prf-04--remove-the-profile-picture) | Remove the profile picture | SCR-PRF-02 |
| [WF-SET-01](domains/account/settings/workflows.md#wf-set-01--change-the-interface-language-from-settings) | Change the interface language from Settings | SCR-SET-01, SCR-SHELL-01 |
| [WF-SET-02](domains/account/settings/workflows.md#wf-set-02--switch-a-notification-type-on-or-off) | Switch a notification type on or off | SCR-SET-01 |
| [WF-SET-03](domains/account/settings/workflows.md#wf-set-03--show-or-hide-18-stories-from-settings) | Show or hide 18+ stories from Settings | SCR-SET-01, SCR-MAT-01 |
| [WF-SET-04](domains/account/settings/workflows.md#wf-set-04--language-follows-the-account-to-a-new-device) | Language follows the account to a new device | SCR-SET-01, SCR-SHELL-01 |

### community

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-CMT-01](domains/community/comments/workflows.md#wf-cmt-01--read-the-comments-of-a-chapter) | Read the comments of a chapter | SCR-CMT-01 |
| [WF-CMT-02](domains/community/comments/workflows.md#wf-cmt-02--post-a-chapter-comment) | Post a chapter comment | SCR-CMT-01 |
| [WF-CMT-03](domains/community/comments/workflows.md#wf-cmt-03--comment-on-a-paragraph) | Comment on a paragraph | SCR-CMT-01 |
| [WF-CMT-04](domains/community/comments/workflows.md#wf-cmt-04--reply-to-a-comment-and-notify-its-author) | Reply to a comment (and notify its author) | SCR-CMT-01, SCR-NOTI-01 |
| [WF-CMT-05](domains/community/comments/workflows.md#wf-cmt-05--like--unlike-a-comment) | Like / unlike a comment | SCR-CMT-01 |
| [WF-CMT-06](domains/community/comments/workflows.md#wf-cmt-06--edit-my-comment) | Edit my comment | SCR-CMT-01 |
| [WF-CMT-07](domains/community/comments/workflows.md#wf-cmt-07--delete-my-comment) | Delete my comment | SCR-CMT-01 |
| [WF-CMT-08](domains/community/comments/workflows.md#wf-cmt-08--story-author-hides--unhides-a-comment) | Story author hides / unhides a comment | SCR-CMT-01 |
| [WF-CMT-09](domains/community/comments/workflows.md#wf-cmt-09--guest-tries-to-interact) | Guest tries to interact | SCR-CMT-01 |
| [WF-CMT-10](domains/community/comments/workflows.md#wf-cmt-10--report-a-comment) | Report a comment | SCR-CMT-01 |
| [WF-NOTI-01](domains/community/notifications/workflows.md#wf-noti-01--followers-are-told-about-a-new-chapter) | Followers are told about a new chapter | SCR-NOTI-01 |
| [WF-NOTI-02](domains/community/notifications/workflows.md#wf-noti-02--a-comment-author-is-told-about-a-reply) | A comment author is told about a reply | SCR-CMT-01, SCR-NOTI-01 |
| [WF-NOTI-03](domains/community/notifications/workflows.md#wf-noti-03--collaboration-invitation-and-answer-notices) | Collaboration invitation and answer notices | SCR-NOTI-01 |
| [WF-NOTI-04](domains/community/notifications/workflows.md#wf-noti-04--receive-a-notification-live-bell) | Receive a notification live (bell) | SCR-NOTI-01 |
| [WF-NOTI-05](domains/community/notifications/workflows.md#wf-noti-05--open-a-notification) | Open a notification | SCR-CMT-01, SCR-NOTI-01 |
| [WF-NOTI-06](domains/community/notifications/workflows.md#wf-noti-06--mark-all-as-read) | Mark all as read | SCR-NOTI-01 |
| [WF-NOTI-07](domains/community/notifications/workflows.md#wf-noti-07--browse-older-notifications) | Browse older notifications | SCR-NOTI-01 |
| [WF-NOTI-08](domains/community/notifications/workflows.md#wf-noti-08--switch-a-notification-type-off--on) | Switch a notification type off / on | SCR-NOTI-01 |
| [WF-VOTE-01](domains/community/vote/workflows.md#wf-vote-01--vote-or-unvote-a-chapter) | Vote or unvote a chapter | SCR-READ-01 |
| [WF-VOTE-02](domains/community/vote/workflows.md#wf-vote-02--guest-wants-to-vote) | Guest wants to vote | SCR-READ-01 |
| [WF-VOTE-03](domains/community/vote/workflows.md#wf-vote-03--reconcile-vote-counters-system) | Reconcile vote counters (system) | System (no UI) |

### discovery

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-AUTHOR-01](domains/discovery/author/workflows.md#wf-author-01--visit-an-author-page) | Visit an author page | SCR-AUTHOR-01 |
| [WF-AUTHOR-02](domains/discovery/author/workflows.md#wf-author-02--follow--unfollow-an-author) | Follow / unfollow an author | SCR-AUTHOR-01, SCR-AUTHOR-02 |
| [WF-AUTHOR-03](domains/discovery/author/workflows.md#wf-author-03--read-the-followed-authors-feed) | Read the followed-authors feed | SCR-AUTHOR-02 |
| [WF-HOME-01](domains/discovery/home/workflows.md#wf-home-01--browse-the-latest-stories) | Browse the latest stories | SCR-HOME-01 |
| [WF-HOME-02](domains/discovery/home/workflows.md#wf-home-02--filter-by-category-andor-tag) | Filter by category and/or tag | SCR-HOME-01, SCR-SRCH-01 |
| [WF-HOME-03](domains/discovery/home/workflows.md#wf-home-03--open-a-story-from-a-card) | Open a story from a card | SCR-HOME-01, SCR-STORY-01 |
| [WF-HOME-04](domains/discovery/home/workflows.md#wf-home-04--jump-to-rankings-or-the-followed-authors-feed) | Jump to rankings or the followed-authors feed | SCR-AUTHOR-02, SCR-HOME-01, SCR-RANK-01 |
| [WF-RANK-01](domains/discovery/ranking/workflows.md#wf-rank-01--view-the-ranking-for-a-period) | View the ranking for a period | SCR-RANK-01, SCR-STORY-01 |
| [WF-RANK-02](domains/discovery/ranking/workflows.md#wf-rank-02--refresh-the-ranking-snapshot-system) | Refresh the ranking snapshot (system) | SCR-RANK-01 |
| [WF-REC-01](domains/discovery/recommendations/workflows.md#wf-rec-01--continue-from-a-story-to-a-similar-one) | Continue from a story to a similar one | SCR-STORY-01 |
| [WF-REC-02](domains/discovery/recommendations/workflows.md#wf-rec-02--personal-suggestions-on-home) | Personal suggestions on home | SCR-HOME-01 |
| [WF-SRCH-01](domains/discovery/search/workflows.md#wf-srch-01--quick-search-from-the-header) | Quick search from the header | SCR-SRCH-01, SCR-STORY-01 |
| [WF-SRCH-02](domains/discovery/search/workflows.md#wf-srch-02--full-results-with-tabs) | Full results with tabs | SCR-AUTHOR-01, SCR-HOME-01, SCR-SRCH-01, SCR-STORY-01 |
| [WF-SRCH-03](domains/discovery/search/workflows.md#wf-srch-03--search-on-a-narrow-screen) | Search on a narrow screen | SCR-SRCH-01 |
| [WF-TAX-01](domains/discovery/taxonomy/workflows.md#wf-tax-01--browse-by-category) | Browse by category | SCR-HOME-01 |
| [WF-TAX-02](domains/discovery/taxonomy/workflows.md#wf-tax-02--browse-by-tag) | Browse by tag | SCR-HOME-01, SCR-SRCH-01, SCR-STORY-01 |
| [WF-TAX-03](domains/discovery/taxonomy/workflows.md#wf-tax-03--author-sets-a-storys-tags) | Author sets a story's tags | SCR-STM-02, SCR-STM-03 |

### library

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-LIB-01](domains/library/library/workflows.md#wf-lib-01--follow--unfollow-a-story-from-its-page) | Follow / unfollow a story from its page | SCR-LIB-01 |
| [WF-LIB-02](domains/library/library/workflows.md#wf-lib-02--save--unsave-a-story-from-its-page) | Save / unsave a story from its page | SCR-LIB-01 |
| [WF-LIB-03](domains/library/library/workflows.md#wf-lib-03--continue-reading-from-the-library) | Continue reading from the library | SCR-LIB-01 |
| [WF-LIB-04](domains/library/library/workflows.md#wf-lib-04--browse-the-library-tabs) | Browse the library tabs | SCR-LIB-01 |
| [WF-LIB-05](domains/library/library/workflows.md#wf-lib-05--remove-a-story-from-a-tab) | Remove a story from a tab | SCR-LIB-01 |
| [WF-LIB-06](domains/library/library/workflows.md#wf-lib-06--guest-opens-the-library-or-presses-followsave) | Guest opens the library or presses Follow/Save | SCR-LIB-01 |
| [WF-LIST-01](domains/library/reading-lists/workflows.md#wf-list-01--create-a-list-from-the-library) | Create a list from the Library | SCR-LIB-01, SCR-LIST-01 |
| [WF-LIST-02](domains/library/reading-lists/workflows.md#wf-list-02--add-a-story-to-lists--take-it-out) | Add a story to lists / take it out | SCR-LIST-01 |
| [WF-LIST-03](domains/library/reading-lists/workflows.md#wf-list-03--create-a-list-and-add-the-story-in-one-step) | Create a list and add the story in one step | SCR-STORY-01 (SCR-LIST-01-C09) |
| [WF-LIST-04](domains/library/reading-lists/workflows.md#wf-list-04--view-a-list) | View a list | SCR-LIST-01 |
| [WF-LIST-05](domains/library/reading-lists/workflows.md#wf-list-05--edit-a-list) | Edit a list | SCR-LIST-01 |
| [WF-LIST-06](domains/library/reading-lists/workflows.md#wf-list-06--reorder-stories) | Reorder stories | SCR-LIST-01 |
| [WF-LIST-07](domains/library/reading-lists/workflows.md#wf-list-07--remove-a-story-from-a-list) | Remove a story from a list | SCR-LIST-01 |
| [WF-LIST-08](domains/library/reading-lists/workflows.md#wf-list-08--delete-a-list) | Delete a list | SCR-LIB-01, SCR-LIST-01 |
| [WF-LIST-09](domains/library/reading-lists/workflows.md#wf-list-09--share-a-list-by-link) | Share a list by link | SCR-LIST-01 |

### platform

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-SHELL-01](domains/platform/app-shell/workflows.md#wf-shell-01--move-between-primary-sections) | Move between primary sections | SCR-SHELL-01 |
| [WF-SHELL-02](domains/platform/app-shell/workflows.md#wf-shell-02--use-a-header-control) | Use a header control | SCR-SHELL-01 |
| [WF-SHELL-03](domains/platform/app-shell/workflows.md#wf-shell-03--route-transition) | Route transition | SCR-SHELL-01 |
| [WF-SHELL-04](domains/platform/app-shell/workflows.md#wf-shell-04--error-and-not-found-handling-current-behaviour) | Error and not-found handling (current behaviour) | SCR-SHELL-01 |
| [WF-JOB-01](domains/platform/background-jobs/workflows.md#wf-job-01--outbox-event-lifecycle) | Outbox event lifecycle | System (no UI) |
| [WF-JOB-02](domains/platform/background-jobs/workflows.md#wf-job-02--scheduled-chapter-goes-live) | Scheduled chapter goes live | System (no UI); outcome on SCR-EDT-01, SCR-CHM-01 |
| [WF-JOB-03](domains/platform/background-jobs/workflows.md#wf-job-03--read-counting-pipeline) | Read counting pipeline | System (no UI); outcome on SCR-STAT-01, SCR-RANK-01 |
| [WF-JOB-04](domains/platform/background-jobs/workflows.md#wf-job-04--ranking-refresh) | Ranking refresh | System (no UI); outcome on SCR-RANK-01 |
| [WF-JOB-05](domains/platform/background-jobs/workflows.md#wf-job-05--nightly-maintenance) | Nightly maintenance | System (no UI) |
| [WF-JOB-06](domains/platform/background-jobs/workflows.md#wf-job-06--re-queue-a-dead-lettered-event-operator) | Re-queue a dead-lettered event (operator) | Operator (SQL) |
| [WF-DEV-01](domains/platform/dev-tools/workflows.md#wf-dev-01--review-shared-widgets-in-the-gallery) | Review shared widgets in the gallery | SCR-DEV-01 |
| [WF-SEO-01](domains/platform/seo/workflows.md#wf-seo-01--crawler-discovers-public-content) | Crawler discovers public content | System (crawler) |
| [WF-SEO-02](domains/platform/seo/workflows.md#wf-seo-02--share-a-story-or-chapter-link) | Share a story or chapter link | SCR-STORY-01, SCR-READ-01 |

### reading

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-READ-01](domains/reading/chapter-reader/workflows.md#wf-read-01--open-a-chapter) | Open a chapter | SCR-READ-01 |
| [WF-READ-02](domains/reading/chapter-reader/workflows.md#wf-read-02--move-between-chapters) | Move between chapters | SCR-READ-01, SCR-STORY-01 |
| [WF-READ-03](domains/reading/chapter-reader/workflows.md#wf-read-03--change-reading-options) | Change reading options | SCR-READ-01 |
| [WF-READ-04](domains/reading/chapter-reader/workflows.md#wf-read-04--preferences-follow-the-reader-to-another-device) | Preferences follow the reader to another device | SCR-READ-01 |
| [WF-READ-05](domains/reading/chapter-reader/workflows.md#wf-read-05--open-a-deep-link-to-a-block-or-the-comments) | Open a deep link to a block or the comments | SCR-CMT-01, SCR-READ-01 |
| [WF-READ-06](domains/reading/chapter-reader/workflows.md#wf-read-06--chapter-becomes-unavailable-while-readers-have-links) | Chapter becomes unavailable while readers have links | SCR-READ-01 |
| [WF-PROG-01](domains/reading/reading-progress/workflows.md#wf-prog-01--save-progress-while-reading) | Save progress while reading | SCR-READ-01 |
| [WF-PROG-02](domains/reading/reading-progress/workflows.md#wf-prog-02--restore-position-on-reopen) | Restore position on reopen | SCR-READ-01 |
| [WF-PROG-03](domains/reading/reading-progress/workflows.md#wf-prog-03--continue-reading) | Continue reading | SCR-LIB-01, SCR-READ-01, SCR-STORY-01 |
| [WF-PROG-04](domains/reading/reading-progress/workflows.md#wf-prog-04--count-a-read) | Count a read | SCR-READ-01 |
| [WF-PROG-05](domains/reading/reading-progress/workflows.md#wf-prog-05--aggregate-and-purge-read-events-system) | Aggregate and purge read events (system) | SCR-STORY-01 |
| [WF-STORY-01](domains/reading/story/workflows.md#wf-story-01--open-a-story-page) | Open a story page | SCR-STORY-01 |
| [WF-STORY-02](domains/reading/story/workflows.md#wf-story-02--start-or-continue-reading) | Start or continue reading | SCR-READ-01, SCR-STORY-01 |
| [WF-STORY-03](domains/reading/story/workflows.md#wf-story-03--guest-tries-an-engagement-action) | Guest tries an engagement action | SCR-AUTH-01, SCR-STORY-01 |
| [WF-STORY-04](domains/reading/story/workflows.md#wf-story-04--crawler-or-link-preview-fetches-a-story) | Crawler or link preview fetches a story | SCR-STORY-01 |
| [WF-STORY-05](domains/reading/story/workflows.md#wf-story-05--author-changes-visibility-status-or-slug) | Author changes visibility, status or slug | SCR-STORY-01 |

### studio

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-STAT-01](domains/studio/analytics/workflows.md#wf-stat-01--view-a-storys-statistics) | View a story's statistics | SCR-STAT-01, SCR-STM-01 |
| [WF-STAT-02](domains/studio/analytics/workflows.md#wf-stat-02--change-the-time-range) | Change the time range | SCR-STAT-01 |
| [WF-EDT-01](domains/studio/chapter-editor/workflows.md#wf-edt-01--open-a-chapter-for-editing) | Open a chapter for editing | SCR-EDT-01 |
| [WF-EDT-02](domains/studio/chapter-editor/workflows.md#wf-edt-02--write-and-autosave-the-draft) | Write and autosave the draft | SCR-EDT-01 |
| [WF-EDT-03](domains/studio/chapter-editor/workflows.md#wf-edt-03--save-the-draft-manually) | Save the draft manually | SCR-EDT-01 |
| [WF-EDT-04](domains/studio/chapter-editor/workflows.md#wf-edt-04--resolve-a-two-device-conflict) | Resolve a two-device conflict | SCR-EDT-01 |
| [WF-EDT-05](domains/studio/chapter-editor/workflows.md#wf-edt-05--recover-unsaved-text-from-this-device) | Recover unsaved text from this device | SCR-EDT-01 |
| [WF-EDT-06](domains/studio/chapter-editor/workflows.md#wf-edt-06--insert-a-picture) | Insert a picture | SCR-EDT-01 |
| [WF-EDT-07](domains/studio/chapter-editor/workflows.md#wf-edt-07--publish-now--publish-a-new-version) | Publish now / publish a new version | SCR-EDT-01, SCR-HIST-01 |
| [WF-EDT-08](domains/studio/chapter-editor/workflows.md#wf-edt-08--schedule-a-publication-and-auto-publish) | Schedule a publication and auto-publish | SCR-EDT-01 |
| [WF-EDT-09](domains/studio/chapter-editor/workflows.md#wf-edt-09--unpublish-or-cancel-a-schedule) | Unpublish or cancel a schedule | SCR-EDT-01 |
| [WF-EDT-10](domains/studio/chapter-editor/workflows.md#wf-edt-10--leave-the-editor) | Leave the editor | SCR-EDT-01, SCR-HIST-01, SCR-HIST-02 |
| [WF-CHM-01](domains/studio/chapter-management/workflows.md#wf-chm-01--add-a-chapter) | Add a chapter | SCR-CHM-01 |
| [WF-CHM-02](domains/studio/chapter-management/workflows.md#wf-chm-02--reorder-chapters) | Reorder chapters | SCR-CHM-01 |
| [WF-CHM-03](domains/studio/chapter-management/workflows.md#wf-chm-03--change-a-chapters-url-slug) | Change a chapter's URL slug | SCR-CHM-01 |
| [WF-CHM-04](domains/studio/chapter-management/workflows.md#wf-chm-04--archive--unarchive-a-chapter) | Archive / unarchive a chapter | SCR-CHM-01, SCR-EDT-01 |
| [WF-CHM-05](domains/studio/chapter-management/workflows.md#wf-chm-05--delete--restore-a-chapter) | Delete / restore a chapter | SCR-CHM-01 |
| [WF-CHM-06](domains/studio/chapter-management/workflows.md#wf-chm-06--open-a-chapter-for-writing) | Open a chapter for writing | SCR-CHM-01, SCR-EDT-01 |
| [WF-TEAM-01](domains/studio/collaboration/workflows.md#wf-team-01--invite-a-collaborator) | Invite a collaborator | SCR-TEAM-01 |
| [WF-TEAM-02](domains/studio/collaboration/workflows.md#wf-team-02--answer-an-invitation) | Answer an invitation | SCR-STM-01, SCR-TEAM-01 |
| [WF-TEAM-03](domains/studio/collaboration/workflows.md#wf-team-03--cancel-a-pending-invitation) | Cancel a pending invitation | SCR-TEAM-01 |
| [WF-TEAM-04](domains/studio/collaboration/workflows.md#wf-team-04--remove-a-collaborator) | Remove a collaborator | SCR-TEAM-01 |
| [WF-STM-01](domains/studio/story-management/workflows.md#wf-stm-01--open-the-studio-and-find-a-story) | Open the Studio and find a story | SCR-STM-01 |
| [WF-STM-02](domains/studio/story-management/workflows.md#wf-stm-02--create-a-story) | Create a story | SCR-STM-02, SCR-STM-03 |
| [WF-STM-03](domains/studio/story-management/workflows.md#wf-stm-03--edit-story-settings-and-tags) | Edit story settings and tags | SCR-STM-03 |
| [WF-STM-04](domains/studio/story-management/workflows.md#wf-stm-04--add-change-or-remove-the-cover) | Add, change or remove the cover | SCR-STM-02, SCR-STM-03 |
| [WF-STM-05](domains/studio/story-management/workflows.md#wf-stm-05--soft-delete-a-story) | Soft-delete a story | SCR-STM-01, SCR-STM-03 |
| [WF-STM-06](domains/studio/story-management/workflows.md#wf-stm-06--restore-a-deleted-story) | Restore a deleted story | SCR-STM-01, SCR-STM-03 |
| [WF-STM-07](domains/studio/story-management/workflows.md#wf-stm-07--change-a-storys-url-slug) | Change a story's URL slug | SCR-STM-03 |
| [WF-HIST-01](domains/studio/version-history/workflows.md#wf-hist-01--review-a-published-version) | Review a published version | SCR-HIST-01 |
| [WF-HIST-02](domains/studio/version-history/workflows.md#wf-hist-02--compare-a-version-with-the-draft-or-another-version) | Compare a version with the draft or another version | SCR-HIST-01 |
| [WF-HIST-03](domains/studio/version-history/workflows.md#wf-hist-03--restore-a-version-into-the-draft-and-continue-editing-cross-screen) | Restore a version into the draft and continue editing (cross-screen) | SCR-EDT-01, SCR-HIST-01 |
| [WF-HIST-04](domains/studio/version-history/workflows.md#wf-hist-04--preview-the-draft-as-readers-will-see-it) | Preview the draft as readers will see it | SCR-EDT-01, SCR-HIST-02 |

### trust-safety

| Workflow | Name | Screens |
| --- | --- | --- |
| [WF-ABU-01](domains/trust-safety/abuse-limits/workflows.md#wf-abu-01--a-comment-is-refused-by-a-rate-limit) | A comment is refused by a rate limit | SCR-CMT-01, SCR-MOD-02 |
| [WF-ABU-02](domains/trust-safety/abuse-limits/workflows.md#wf-abu-02--a-comment-or-an-edit-is-refused-as-spam) | A comment or an edit is refused as spam | SCR-CMT-01 |
| [WF-ABU-03](domains/trust-safety/abuse-limits/workflows.md#wf-abu-03--administrator-tunes-a-threshold) | Administrator tunes a threshold | Operator (SQL) |
| [WF-MAT-01](domains/trust-safety/mature-content/workflows.md#wf-mat-01--turn-18-stories-on-or-off-from-the-header) | Turn 18+ stories on or off from the header | SCR-MAT-01 |
| [WF-MAT-02](domains/trust-safety/mature-content/workflows.md#wf-mat-02--open-an-18-story-or-chapter-by-link) | Open an 18+ story or chapter by link | SCR-MAT-01 |
| [WF-MAT-03](domains/trust-safety/mature-content/workflows.md#wf-mat-03--the-choice-follows-the-account-cross-device) | The choice follows the account (cross-device) | SCR-MAT-01, SCR-SET-01 |
| [WF-MAT-04](domains/trust-safety/mature-content/workflows.md#wf-mat-04--change-the-choice-from-settings) | Change the choice from Settings | SCR-MAT-01 |
| [WF-MOD-01](domains/trust-safety/moderation/workflows.md#wf-mod-01--report-content-or-an-account) | Report content or an account | SCR-AUTHOR-01, SCR-MOD-02 |
| [WF-MOD-02](domains/trust-safety/moderation/workflows.md#wf-mod-02--triage-the-queue) | Triage the queue | SCR-MOD-01 |
| [WF-MOD-03](domains/trust-safety/moderation/workflows.md#wf-mod-03--act-on-the-reported-content) | Act on the reported content | SCR-MOD-01 |
| [WF-MOD-04](domains/trust-safety/moderation/workflows.md#wf-mod-04--reverse-a-moderation-action) | Reverse a moderation action | SCR-MOD-01 |
| [WF-MOD-05](domains/trust-safety/moderation/workflows.md#wf-mod-05--reach-moderation-without-being-a-moderator) | Reach `/moderation` without being a moderator | SCR-MOD-01 |
| [WF-MOD-06](domains/trust-safety/moderation/workflows.md#wf-mod-06--affected-party-after-an-action-cross-screen) | Affected party after an action (cross-screen) | SCR-STM-01, SCR-CMT-01, SCR-SHELL-01 |
