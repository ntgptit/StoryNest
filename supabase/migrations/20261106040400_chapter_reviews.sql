-- Approval sign-off for chapter drafts (Lucian 180, batch 4 "authoring4").
--
--   chapter_reviews(chapter_id, status, requested_by, requested_at, requested_revision, request_note,
--                   decided_by, decided_at, decision_note)          one current review per chapter
--   request_chapter_review(chapter_id, expected_revision, note?)   any team member (typically an editor)
--   decide_chapter_review(chapter_id, approve, note?)              owner or co-author, not the person who asked
--
-- A review is a sign-off on one saved draft revision: "pending" (asked), then "approved" or "changes_requested".
-- Asking again (any time, also while pending) replaces the current review with a new pending one for the draft's
-- current revision. When the draft has moved on since the revision that was signed off, the screen says so (the
-- approval is for requested_revision, nothing more).
--
-- It is advice, not a gate: publishing still follows the existing permissions (publish_chapter, schedule_chapter and
-- unpublish_chapter are untouched and do not read this table), so an owner can still publish without a review and
-- an editor can still publish as before.
--
-- Notifications go through the existing pipeline (the notifications table, its realtime publication and the bell),
-- inserted in the same transaction like the collaboration invitations (no side effect outside the database):
--   chapter_review_requested           to the owner and the co-authors (active accounts), except the requester
--   chapter_review_approved / chapter_review_changes_requested   to the requester (if still active)
-- Dedupe keys per revision / per decision, so a repeated call does not notify twice.
--
-- Access: the team (can_edit_chapter) reads the rows; nobody writes them directly (no grants), only the RPCs.
-- Error contract: 42501 not signed in / inactive / not allowed to decide (editor, or your own request),
-- PT404 chapter not found or no role on it, or no review to decide, 22023 invalid argument (missing revision or
-- flag, note longer than 500 characters, no draft), PT409 stale revision, archived chapter, review not pending.
--
-- Rollback:
--   DROP FUNCTION public.request_chapter_review(uuid, bigint, text), public.decide_chapter_review(uuid, boolean, text);
--   DROP TABLE chapter_reviews;
--   DELETE FROM notifications WHERE event_type LIKE 'chapter_review_%';   -- optional
BEGIN;

CREATE TABLE chapter_reviews (
    chapter_id uuid PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'changes_requested')),
    requested_by uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    requested_at timestamptz NOT NULL DEFAULT now(),
    requested_revision bigint NOT NULL CHECK (requested_revision > 0),
    request_note varchar(500) NOT NULL DEFAULT '',
    decided_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
    decided_at timestamptz,
    decision_note varchar(500) NOT NULL DEFAULT '',
    CHECK ((status = 'pending') = (decided_at IS NULL))
);
CREATE INDEX idx_chapter_reviews_requested_by ON chapter_reviews (requested_by);
CREATE INDEX idx_chapter_reviews_decided_by ON chapter_reviews (decided_by) WHERE decided_by IS NOT NULL;

ALTER TABLE chapter_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chapter_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON chapter_reviews TO authenticated;
CREATE POLICY chapter_reviews_team_read ON chapter_reviews FOR SELECT USING (public.can_edit_chapter(chapter_id));

CREATE FUNCTION public.request_chapter_review(p_chapter_id uuid, p_expected_revision bigint, p_note text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_note text := btrim(coalesce(p_note, ''));
    v_chapter public.chapters%ROWTYPE;
    v_story public.stories%ROWTYPE;
    v_draft public.chapter_drafts%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_expected_revision IS NULL THEN
        RAISE EXCEPTION 'expected_revision is required' USING ERRCODE = '22023';
    END IF;
    IF char_length(v_note) > 500 THEN
        RAISE EXCEPTION 'note must be at most 500 characters' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(v_chapter.story_id) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_chapter.status = 'archived' THEN
        RAISE EXCEPTION 'an archived chapter cannot be reviewed' USING ERRCODE = 'PT409';
    END IF;
    SELECT * INTO v_story FROM public.stories WHERE id = v_chapter.story_id;

    SELECT * INTO v_draft FROM public.chapter_drafts WHERE chapter_id = p_chapter_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'chapter has no draft' USING ERRCODE = '22023';
    END IF;
    IF v_draft.revision <> p_expected_revision THEN
        RAISE EXCEPTION 'draft revision is % but % was expected', v_draft.revision, p_expected_revision
            USING ERRCODE = 'PT409';
    END IF;

    INSERT INTO public.chapter_reviews AS r
        (chapter_id, status, requested_by, requested_at, requested_revision, request_note)
    VALUES (p_chapter_id, 'pending', v_uid, now(), v_draft.revision, v_note)
    ON CONFLICT (chapter_id) DO UPDATE
       SET status = 'pending', requested_by = EXCLUDED.requested_by, requested_at = EXCLUDED.requested_at,
           requested_revision = EXCLUDED.requested_revision, request_note = EXCLUDED.request_note,
           decided_by = NULL, decided_at = NULL, decision_note = '';

    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, chapter_id, payload, dedupe_key)
    SELECT m.user_id, v_uid, 'chapter_review_requested', v_story.id, p_chapter_id,
           jsonb_build_object('story_title', v_story.title, 'chapter_title', v_draft.title,
                              'revision', v_draft.revision, 'note', left(v_note, 140)),
           'review-request:' || p_chapter_id || ':' || v_draft.revision
      FROM (SELECT v_story.owner_id AS user_id
            UNION SELECT c.user_id FROM public.story_collaborators c
                   WHERE c.story_id = v_story.id AND c.collaborator_role = 'co_author') m
      JOIN public.app_users u ON u.id = m.user_id AND u.account_status = 'active' AND u.deleted_at IS NULL
     WHERE m.user_id <> v_uid
    ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
END $$;

CREATE FUNCTION public.decide_chapter_review(p_chapter_id uuid, p_approve boolean, p_note text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_note text := btrim(coalesce(p_note, ''));
    v_chapter public.chapters%ROWTYPE;
    v_story public.stories%ROWTYPE;
    v_review public.chapter_reviews%ROWTYPE;
    v_role text;
    v_title text;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_approve IS NULL THEN
        RAISE EXCEPTION 'approve must be true or false' USING ERRCODE = '22023';
    END IF;
    IF char_length(v_note) > 500 THEN
        RAISE EXCEPTION 'note must be at most 500 characters' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL;
    v_role := CASE WHEN v_chapter.id IS NULL THEN NULL ELSE public.story_role(v_chapter.story_id) END;
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_role NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'only the owner or a co-author can sign off' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_review FROM public.chapter_reviews WHERE chapter_id = p_chapter_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'no review was requested' USING ERRCODE = 'PT404';
    END IF;
    IF v_review.status <> 'pending' THEN
        RAISE EXCEPTION 'review is not pending (status is %)', v_review.status USING ERRCODE = 'PT409';
    END IF;
    IF v_review.requested_by = v_uid THEN
        RAISE EXCEPTION 'you cannot sign off your own request' USING ERRCODE = '42501';
    END IF;

    UPDATE public.chapter_reviews
       SET status = CASE WHEN p_approve THEN 'approved' ELSE 'changes_requested' END,
           decided_by = v_uid, decided_at = now(), decision_note = v_note
     WHERE chapter_id = p_chapter_id;

    SELECT * INTO v_story FROM public.stories WHERE id = v_chapter.story_id;
    SELECT title INTO v_title FROM public.chapter_drafts WHERE chapter_id = p_chapter_id;
    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, chapter_id, payload, dedupe_key)
    SELECT v_review.requested_by, v_uid,
           CASE WHEN p_approve THEN 'chapter_review_approved' ELSE 'chapter_review_changes_requested' END,
           v_story.id, p_chapter_id,
           jsonb_build_object('story_title', v_story.title, 'chapter_title', coalesce(v_title, ''),
                              'revision', v_review.requested_revision, 'note', left(v_note, 140)),
           'review-decision:' || p_chapter_id || ':' || v_review.requested_revision || ':'
               || extract(epoch FROM v_review.requested_at)
      FROM public.app_users u
     WHERE u.id = v_review.requested_by AND u.account_status = 'active' AND u.deleted_at IS NULL
    ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.request_chapter_review(uuid, bigint, text), public.decide_chapter_review(uuid, boolean, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_chapter_review(uuid, bigint, text), public.decide_chapter_review(uuid, boolean, text)
    TO authenticated, service_role;

COMMIT;
