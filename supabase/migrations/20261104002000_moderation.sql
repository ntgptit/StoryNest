-- Reports and the moderation console (WBS WP 6.1).
--
-- Readers report a story, a chapter, a comment or a person; moderators work a queue and act. Every action is a function
-- that writes one audit row (who, what, which target, why, when) in the same transaction as the change.
--
--   submit_report(kind, target_id, reason, description) -> report id        any active account; idempotent per open report
--   list_reports(status, newest_first, cursor, limit)                        moderators: queue with the target's context
--   moderate(action, target_id, reason, report_id)  -> new state             moderators: hide/restore comment, remove/restore
--                                                                            story, suspend/reinstate account; closes the open
--                                                                            reports on that target
--   resolve_report(report_id, status, reason)                                moderators: mark reviewing / resolved / dismissed
--   moderation_actions                                                       the audit log; moderators read it, nobody writes it
--                                                                            but the functions above
--
-- Nothing is writable by clients any more: content_reports takes no direct INSERT/UPDATE/DELETE from clients (a trigger
-- refuses them: only the functions, which run as their owner, may write), and a comment can no longer be hidden or
-- shown by a direct UPDATE (a moderator's direct UPDATE used to leave no trace). A story a moderator removed cannot be
-- brought back by its owner's own UPDATE of deleted_at.
--
-- Rules the functions enforce
--   * reasons: spam | harassment | hate | sexual | violence | copyright | other; description up to 2000 characters
--   * a report must be about something the reporter can see, and never about their own story, comment or account
--   * 20 new reports per rolling 24 hours per account (PT429); a second report on the same open target returns the first
--   * a moderator cannot suspend themselves or another moderator
--   * restoring is only for what a moderator took down: a story the author deleted stays deleted, an account is
--     reinstated only if a moderator suspended it (a deactivated account is never touched)
--   * every action needs a written reason of 3 to 1000 characters
-- Error contract: 42501 not allowed, PT404 target not found, PT409 wrong state, PT429 too many reports, 22023 invalid.
-- Rollback: DROP the four functions, the card function and type, the guard triggers and moderation_actions; reports keep
-- their rows; restore the moderator INSERT/UPDATE paths from WP 1.2 if the client should write reports directly again.
BEGIN;

-- 1. Audit log ----------------------------------------------------------------------------------------------------
CREATE TABLE public.moderation_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL,            -- plain id, no FK: the record must outlive and never block a profile
    action text NOT NULL CHECK (action IN ('hide_comment', 'restore_comment', 'remove_story', 'restore_story',
                                           'suspend_user', 'reinstate_user', 'review_report', 'resolve_report',
                                           'dismiss_report')),
    target_kind text NOT NULL CHECK (target_kind IN ('comment', 'story', 'user', 'report')),
    target_id uuid NOT NULL,
    report_id uuid,
    reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 1000),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()   -- not now(): "the latest action" must order inside one transaction too
);
CREATE INDEX idx_moderation_actions_target ON public.moderation_actions (target_id, created_at DESC);
CREATE INDEX idx_moderation_actions_recent ON public.moderation_actions (created_at DESC);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.moderation_actions TO authenticated;
CREATE POLICY moderation_actions_read ON public.moderation_actions FOR SELECT USING ((SELECT public.is_moderator()));

-- One open report per reporter and target (the function returns the existing one), enforced for every path.
CREATE UNIQUE INDEX uq_content_reports_open ON public.content_reports (
    reporter_id, coalesce(story_id, chapter_id, comment_id, reported_user_id))
    WHERE status IN ('pending', 'reviewing');

-- 2. Guards: clients write nothing here directly ----------------------------------------------------------------------
CREATE FUNCTION public.refuse_client_write()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    -- Functions run as their owner; only a direct statement from a signed-in or anonymous client lands here.
    IF current_user IN ('authenticated', 'anon') THEN
        RAISE EXCEPTION 'reports are written through the report and moderation functions' USING ERRCODE = '42501';
    END IF;
    RETURN coalesce(NEW, OLD);
END $$;

REVOKE ALL ON FUNCTION public.refuse_client_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER content_reports_guard BEFORE INSERT OR UPDATE OR DELETE ON public.content_reports
    FOR EACH ROW EXECUTE FUNCTION public.refuse_client_write();

CREATE FUNCTION public.refuse_client_hiding()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        RAISE EXCEPTION 'comments are hidden and shown through the moderation functions' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.refuse_client_hiding() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_guard_hiding BEFORE UPDATE OF status ON public.comments
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND (NEW.status = 'hidden' OR OLD.status = 'hidden'))
    EXECUTE FUNCTION public.refuse_client_hiding();

-- The latest moderator action on a target, or NULL (internal: the audit table is closed to clients).
CREATE FUNCTION public.last_moderation_action(p_target_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT a.action FROM public.moderation_actions a
     WHERE a.target_id = p_target_id AND a.action <> ALL (ARRAY['review_report', 'resolve_report', 'dismiss_report'])
     ORDER BY a.created_at DESC, a.id DESC LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.last_moderation_action(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.refuse_restoring_removed_story()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') AND public.last_moderation_action(OLD.id) = 'remove_story' THEN
        RAISE EXCEPTION 'the story was removed by a moderator' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.refuse_restoring_removed_story() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER stories_guard_removal BEFORE UPDATE OF deleted_at ON public.stories
    FOR EACH ROW WHEN (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL)
    EXECUTE FUNCTION public.refuse_restoring_removed_story();

-- 3. Reporting ------------------------------------------------------------------------------------------------------
CREATE FUNCTION public.submit_report(p_kind text, p_target_id uuid, p_reason text, p_description text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_description text := nullif(btrim(coalesce(p_description, '')), '');
    v_owner uuid;
    v_comment public.comments%ROWTYPE;
    v_existing uuid;
    v_id uuid;
BEGIN
    IF v_uid IS NULL OR NOT (SELECT public.is_active_account()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_target_id IS NULL OR p_reason IS NULL
       OR p_reason <> ALL (ARRAY['spam', 'harassment', 'hate', 'sexual', 'violence', 'copyright', 'other'])
       OR length(coalesce(v_description, '')) > 2000 THEN
        RAISE EXCEPTION 'invalid report' USING ERRCODE = '22023';
    END IF;

    IF p_kind = 'story' THEN
        IF NOT public.can_read_story(p_target_id) THEN
            RAISE EXCEPTION 'target not found' USING ERRCODE = 'PT404';
        END IF;
        SELECT owner_id INTO v_owner FROM public.stories WHERE id = p_target_id;
    ELSIF p_kind = 'chapter' THEN
        IF NOT public.can_read_chapter(p_target_id) THEN
            RAISE EXCEPTION 'target not found' USING ERRCODE = 'PT404';
        END IF;
        SELECT s.owner_id INTO v_owner FROM public.chapters c JOIN public.stories s ON s.id = c.story_id WHERE c.id = p_target_id;
    ELSIF p_kind = 'comment' THEN
        SELECT * INTO v_comment FROM public.comments WHERE id = p_target_id;
        IF NOT FOUND OR v_comment.status <> 'visible' OR NOT public.can_read_chapter(v_comment.chapter_id) THEN
            RAISE EXCEPTION 'target not found' USING ERRCODE = 'PT404';
        END IF;
        v_owner := v_comment.author_id;
    ELSIF p_kind = 'user' THEN
        SELECT id INTO v_owner FROM public.app_users WHERE id = p_target_id AND account_status = 'active' AND deleted_at IS NULL;
        IF v_owner IS NULL THEN
            RAISE EXCEPTION 'target not found' USING ERRCODE = 'PT404';
        END IF;
    ELSE
        RAISE EXCEPTION 'invalid report' USING ERRCODE = '22023';
    END IF;
    IF v_owner = v_uid THEN
        RAISE EXCEPTION 'you cannot report your own content' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_existing FROM public.content_reports
     WHERE reporter_id = v_uid AND status IN ('pending', 'reviewing')
       AND coalesce(story_id, chapter_id, comment_id, reported_user_id) = p_target_id;
    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;
    IF (SELECT count(*) FROM public.content_reports WHERE reporter_id = v_uid AND created_at > now() - interval '24 hours') >= 20 THEN
        RAISE EXCEPTION 'too many reports' USING ERRCODE = 'PT429';
    END IF;

    INSERT INTO public.content_reports (reporter_id, story_id, chapter_id, comment_id, reported_user_id, reason, description)
    VALUES (v_uid,
            CASE WHEN p_kind = 'story' THEN p_target_id END,
            CASE WHEN p_kind = 'chapter' THEN p_target_id END,
            CASE WHEN p_kind = 'comment' THEN p_target_id END,
            CASE WHEN p_kind = 'user' THEN p_target_id END,
            p_reason, v_description)
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_report(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_report(text, uuid, text, text) TO authenticated;

-- 4. The queue -------------------------------------------------------------------------------------------------------
CREATE TYPE public.moderation_report AS (
    id uuid,
    status text,
    reason text,
    description text,
    created_at timestamptz,
    reporter_id uuid,
    reporter_name text,
    target_kind text,
    target_id uuid,
    target_title text,
    target_state text,
    story_id uuid,
    story_slug text,
    chapter_slug text,
    username text,
    open_reports bigint,
    reviewed_by uuid,
    reviewed_at timestamptz
);

CREATE FUNCTION public.moderation_report_card(r public.content_reports)
RETURNS public.moderation_report
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_card public.moderation_report;
    v_story public.stories%ROWTYPE;
    v_chapter public.chapters%ROWTYPE;
    v_comment public.comments%ROWTYPE;
    v_user public.app_users%ROWTYPE;
    v_target uuid := coalesce(r.story_id, r.chapter_id, r.comment_id, r.reported_user_id);
BEGIN
    v_card.id := r.id;
    v_card.status := r.status;
    v_card.reason := r.reason;
    v_card.description := r.description;
    v_card.created_at := r.created_at;
    v_card.reporter_id := r.reporter_id;
    v_card.reporter_name := (SELECT coalesce(nullif(btrim(u.display_name), ''), u.username::text)
                               FROM public.app_users u WHERE u.id = r.reporter_id);
    v_card.target_id := v_target;
    v_card.reviewed_by := r.reviewed_by;
    v_card.reviewed_at := r.reviewed_at;
    v_card.open_reports := (SELECT count(*) FROM public.content_reports o
                             WHERE o.status IN ('pending', 'reviewing')
                               AND coalesce(o.story_id, o.chapter_id, o.comment_id, o.reported_user_id) = v_target);

    IF r.story_id IS NOT NULL THEN
        SELECT * INTO v_story FROM public.stories WHERE id = r.story_id;
        v_card.target_kind := 'story';
        v_card.target_title := v_story.title;
        v_card.target_state := CASE WHEN v_story.deleted_at IS NULL THEN 'visible' ELSE 'removed' END;
        v_card.story_id := v_story.id;
        v_card.story_slug := v_story.slug;
    ELSIF r.chapter_id IS NOT NULL THEN
        SELECT * INTO v_chapter FROM public.chapters WHERE id = r.chapter_id;
        SELECT * INTO v_story FROM public.stories WHERE id = v_chapter.story_id;
        v_card.target_kind := 'chapter';
        v_card.target_title := coalesce((SELECT v.title FROM public.chapter_versions v WHERE v.id = v_chapter.published_version_id),
                                        v_chapter.slug);
        v_card.target_state := CASE WHEN v_story.deleted_at IS NULL AND v_chapter.deleted_at IS NULL THEN 'visible' ELSE 'removed' END;
        v_card.story_id := v_story.id;
        v_card.story_slug := v_story.slug;
        v_card.chapter_slug := v_chapter.slug;
    ELSIF r.comment_id IS NOT NULL THEN
        SELECT * INTO v_comment FROM public.comments WHERE id = r.comment_id;
        SELECT s.* INTO v_story FROM public.chapters c JOIN public.stories s ON s.id = c.story_id WHERE c.id = v_comment.chapter_id;
        v_card.target_kind := 'comment';
        v_card.target_title := left(btrim(v_comment.body), 300);
        v_card.target_state := v_comment.status;
        v_card.story_id := v_story.id;
        v_card.story_slug := v_story.slug;
        v_card.chapter_slug := (SELECT c.slug FROM public.chapters c WHERE c.id = v_comment.chapter_id);
        v_card.username := (SELECT u.username::text FROM public.app_users u WHERE u.id = v_comment.author_id);
    ELSE
        SELECT * INTO v_user FROM public.app_users WHERE id = r.reported_user_id;
        v_card.target_kind := 'user';
        v_card.target_title := v_user.display_name;
        v_card.target_state := v_user.account_status;
        v_card.username := v_user.username::text;
    END IF;
    RETURN v_card;
END $$;

REVOKE ALL ON FUNCTION public.moderation_report_card(public.content_reports) FROM PUBLIC, anon, authenticated;

-- p_status: 'open' (pending and reviewing), 'closed' (resolved and dismissed) or one exact status. Keyset paging on
-- (created_at, id); ask for limit + 1 rows to know whether another page exists.
CREATE FUNCTION public.list_reports(
    p_status text DEFAULT 'open',
    p_newest_first boolean DEFAULT false,
    p_cursor_at timestamptz DEFAULT NULL,
    p_cursor_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 20)
RETURNS SETOF public.moderation_report
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_statuses text[];
    v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 51);
BEGIN
    IF NOT (SELECT public.is_moderator()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    v_statuses := CASE p_status
        WHEN 'open' THEN ARRAY['pending', 'reviewing']
        WHEN 'closed' THEN ARRAY['resolved', 'dismissed']
        WHEN 'pending' THEN ARRAY['pending']
        WHEN 'reviewing' THEN ARRAY['reviewing']
        WHEN 'resolved' THEN ARRAY['resolved']
        WHEN 'dismissed' THEN ARRAY['dismissed']
    END;
    IF v_statuses IS NULL THEN
        RAISE EXCEPTION 'unknown status' USING ERRCODE = '22023';
    END IF;

    IF p_newest_first THEN
        RETURN QUERY
        SELECT k.* FROM public.content_reports r CROSS JOIN LATERAL public.moderation_report_card(r) k
         WHERE r.status = ANY (v_statuses)
           AND (p_cursor_at IS NULL OR (r.created_at, r.id) < (p_cursor_at, p_cursor_id))
         ORDER BY r.created_at DESC, r.id DESC LIMIT v_limit;
    ELSE
        RETURN QUERY
        SELECT k.* FROM public.content_reports r CROSS JOIN LATERAL public.moderation_report_card(r) k
         WHERE r.status = ANY (v_statuses)
           AND (p_cursor_at IS NULL OR (r.created_at, r.id) > (p_cursor_at, p_cursor_id))
         ORDER BY r.created_at ASC, r.id ASC LIMIT v_limit;
    END IF;
END $$;

REVOKE ALL ON FUNCTION public.list_reports(text, boolean, timestamptz, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_reports(text, boolean, timestamptz, uuid, integer) TO authenticated;

-- 5. Actions ------------------------------------------------------------------------------------------------------------
-- Closes every open report about a target (a story also closes the reports about its chapters).
CREATE FUNCTION public.close_reports_for(p_target_id uuid, p_actor uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    UPDATE public.content_reports r
       SET status = 'resolved', reviewed_by = p_actor, reviewed_at = now()
     WHERE r.status IN ('pending', 'reviewing')
       AND (coalesce(r.story_id, r.chapter_id, r.comment_id, r.reported_user_id) = p_target_id
            OR r.chapter_id IN (SELECT c.id FROM public.chapters c WHERE c.story_id = p_target_id))
$$;

REVOKE ALL ON FUNCTION public.close_reports_for(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.moderate(p_action text, p_target_id uuid, p_reason text, p_report_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_reason text := btrim(coalesce(p_reason, ''));
    v_kind text;
    v_comment public.comments%ROWTYPE;
    v_story public.stories%ROWTYPE;
    v_user public.app_users%ROWTYPE;
    v_state text;
BEGIN
    IF v_uid IS NULL OR NOT (SELECT public.is_moderator()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_target_id IS NULL OR length(v_reason) NOT BETWEEN 3 AND 1000 OR p_action IS NULL
       OR p_action <> ALL (ARRAY['hide_comment', 'restore_comment', 'remove_story', 'restore_story', 'suspend_user', 'reinstate_user']) THEN
        RAISE EXCEPTION 'invalid moderation action' USING ERRCODE = '22023';
    END IF;
    IF p_report_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.content_reports WHERE id = p_report_id) THEN
        RAISE EXCEPTION 'report not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_action IN ('hide_comment', 'restore_comment') THEN
        v_kind := 'comment';
        SELECT * INTO v_comment FROM public.comments WHERE id = p_target_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'comment not found' USING ERRCODE = 'PT404';
        END IF;
        IF v_comment.status = 'deleted' THEN
            RAISE EXCEPTION 'the comment was deleted' USING ERRCODE = 'PT409';
        END IF;
        IF p_action = 'hide_comment' THEN
            UPDATE public.comments SET status = 'hidden' WHERE id = v_comment.id AND status = 'visible';
            v_state := 'hidden';
        ELSE
            UPDATE public.comments SET status = 'visible' WHERE id = v_comment.id AND status = 'hidden';
            v_state := 'visible';
        END IF;

    ELSIF p_action IN ('remove_story', 'restore_story') THEN
        v_kind := 'story';
        SELECT * INTO v_story FROM public.stories WHERE id = p_target_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
        END IF;
        IF p_action = 'remove_story' THEN
            IF v_story.deleted_at IS NOT NULL THEN
                RAISE EXCEPTION 'the story is already removed' USING ERRCODE = 'PT409';
            END IF;
            UPDATE public.stories SET deleted_at = now() WHERE id = v_story.id;
            v_state := 'removed';
        ELSE
            IF v_story.deleted_at IS NULL OR public.last_moderation_action(v_story.id) IS DISTINCT FROM 'remove_story' THEN
                RAISE EXCEPTION 'only a story removed by a moderator can be restored' USING ERRCODE = 'PT409';
            END IF;
            UPDATE public.stories SET deleted_at = NULL WHERE id = v_story.id;
            v_state := 'visible';
        END IF;

    ELSE
        v_kind := 'user';
        SELECT * INTO v_user FROM public.app_users WHERE id = p_target_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'account not found' USING ERRCODE = 'PT404';
        END IF;
        IF p_action = 'suspend_user' THEN
            IF v_user.id = v_uid
               OR EXISTS (SELECT 1 FROM auth.users a WHERE a.id = v_user.id AND a.raw_app_meta_data ->> 'role' = 'moderator') THEN
                RAISE EXCEPTION 'a moderator account cannot be suspended' USING ERRCODE = '22023';
            END IF;
            IF v_user.account_status <> 'active' THEN
                RAISE EXCEPTION 'the account is not active' USING ERRCODE = 'PT409';
            END IF;
            UPDATE public.app_users SET account_status = 'suspended' WHERE id = v_user.id;
            v_state := 'suspended';
        ELSE
            IF v_user.account_status <> 'suspended' OR public.last_moderation_action(v_user.id) IS DISTINCT FROM 'suspend_user' THEN
                RAISE EXCEPTION 'only an account suspended by a moderator can be reinstated' USING ERRCODE = 'PT409';
            END IF;
            UPDATE public.app_users SET account_status = 'active' WHERE id = v_user.id;
            v_state := 'active';
        END IF;
    END IF;

    INSERT INTO public.moderation_actions (actor_id, action, target_kind, target_id, report_id, reason)
    VALUES (v_uid, p_action, v_kind, p_target_id, p_report_id, v_reason);

    IF p_action IN ('hide_comment', 'remove_story', 'suspend_user') THEN
        PERFORM public.close_reports_for(p_target_id, v_uid);
    END IF;
    RETURN v_state;
END $$;

REVOKE ALL ON FUNCTION public.moderate(text, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate(text, uuid, text, uuid) TO authenticated;

CREATE FUNCTION public.resolve_report(p_report_id uuid, p_status text, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_reason text := btrim(coalesce(p_reason, ''));
    v_report public.content_reports%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT (SELECT public.is_moderator()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_status IS NULL OR p_status <> ALL (ARRAY['reviewing', 'resolved', 'dismissed']) OR length(v_reason) NOT BETWEEN 3 AND 1000 THEN
        RAISE EXCEPTION 'invalid moderation action' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_report FROM public.content_reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'report not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_report.status IN ('resolved', 'dismissed') THEN
        RAISE EXCEPTION 'the report is already closed' USING ERRCODE = 'PT409';
    END IF;

    UPDATE public.content_reports
       SET status = p_status, reviewed_by = v_uid, reviewed_at = now()
     WHERE id = p_report_id;
    INSERT INTO public.moderation_actions (actor_id, action, target_kind, target_id, report_id, reason)
    VALUES (v_uid,
            CASE p_status WHEN 'reviewing' THEN 'review_report' WHEN 'resolved' THEN 'resolve_report' ELSE 'dismiss_report' END,
            'report', p_report_id, p_report_id, v_reason);
END $$;

REVOKE ALL ON FUNCTION public.resolve_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, text, text) TO authenticated;

COMMIT;
