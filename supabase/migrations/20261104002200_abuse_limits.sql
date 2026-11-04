-- Abuse limits (WBS WP 6.8): how often one account may comment and report, and a first filter for spam comments.
--
--   abuse_limits                       the thresholds, one row each, editable by an administrator (SQL / service role):
--                                        comment_rate_burst   10 comments per 600 s        comment_rate_day    200 per 86400 s
--                                        report_rate_day      20 reports per 86400 s
--                                        comment_max_links    2 links in one comment       comment_max_char_run  20 identical
--                                                                                          characters in a row
--   enforce_rate_limit(action)         counts the caller's own rows in the window; raises PT429 when a limit is reached
--                                      (HINT = the limit that was hit). Comments count replies and deleted comments too,
--                                      so deleting does not buy a fresh allowance.
--   comment_looks_like_spam(text)      too many links, or a character repeated beyond the limit (whitespace is ignored)
--   trigger comments_guard_abuse       applies both to every comment INSERT and to an UPDATE that changes the text, whichever
--                                      function or direct statement writes it; edits are checked for spam only
--   submit_report                      now takes its ceiling from abuse_limits (it was a fixed 20 per day)
--
-- Who is exempt: moderators, and anything running without a signed-in user (the service role, the worker, the seed).
-- The two helper functions may be called by signed-in users (they act on auth.uid() only and return nothing / a boolean).
-- A comment refused as spam raises 22023 with HINT 'spam'; a limit raises PT429.
--
-- Not here: limits on sign-up and a captcha. Sign-up is handled by Supabase Auth, whose own rate limits and captcha
-- (hCaptcha / Turnstile) are switched on in the project's Auth settings with the provider's keys; the application then
-- passes the captcha token to signUp. Both need keys, so they are left for whoever holds them.
-- Rollback: DROP the trigger and the three functions, DROP TABLE abuse_limits; restore submit_report from WP 6.1.
BEGIN;

CREATE TABLE public.abuse_limits (
    code text PRIMARY KEY,
    max_value integer NOT NULL CHECK (max_value >= 0),
    window_seconds integer CHECK (window_seconds IS NULL OR window_seconds > 0),
    note text NOT NULL DEFAULT ''
);
INSERT INTO public.abuse_limits (code, max_value, window_seconds, note) VALUES
    ('comment_rate_burst', 10, 600, 'comments per account in a short window'),
    ('comment_rate_day', 200, 86400, 'comments per account per day'),
    ('report_rate_day', 20, 86400, 'reports per account per day'),
    ('comment_max_links', 2, NULL, 'links allowed in one comment'),
    ('comment_max_char_run', 20, NULL, 'identical characters allowed in a row');
ALTER TABLE public.abuse_limits ENABLE ROW LEVEL SECURITY;   -- no policy, no grant: changed by an administrator only
REVOKE ALL ON public.abuse_limits FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.enforce_rate_limit(p_action text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_limit record;
    v_used bigint;
BEGIN
    IF v_uid IS NULL OR (SELECT public.is_moderator()) THEN
        RETURN;
    END IF;
    FOR v_limit IN
        SELECT code, max_value, window_seconds FROM public.abuse_limits
         WHERE window_seconds IS NOT NULL
           AND code = ANY (CASE p_action
                             WHEN 'comment' THEN ARRAY['comment_rate_burst', 'comment_rate_day']
                             WHEN 'report' THEN ARRAY['report_rate_day']
                             ELSE ARRAY[]::text[] END)
    LOOP
        IF p_action = 'comment' THEN
            SELECT count(*) INTO v_used FROM public.comments
             WHERE author_id = v_uid AND created_at > clock_timestamp() - make_interval(secs => v_limit.window_seconds);
        ELSE
            SELECT count(*) INTO v_used FROM public.content_reports
             WHERE reporter_id = v_uid AND created_at > clock_timestamp() - make_interval(secs => v_limit.window_seconds);
        END IF;
        IF v_used >= v_limit.max_value THEN
            RAISE EXCEPTION 'too many requests' USING ERRCODE = 'PT429', HINT = v_limit.code;
        END IF;
    END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.enforce_rate_limit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(text) TO authenticated;

CREATE FUNCTION public.comment_looks_like_spam(p_body text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_max_links integer := coalesce((SELECT max_value FROM public.abuse_limits WHERE code = 'comment_max_links'), 2);
    v_max_run integer := coalesce((SELECT max_value FROM public.abuse_limits WHERE code = 'comment_max_char_run'), 20);
BEGIN
    IF (SELECT count(*) FROM regexp_matches(coalesce(p_body, ''), '(https?://|www\.)', 'gi')) > v_max_links THEN
        RETURN true;
    END IF;
    RETURN coalesce(p_body, '') ~ ('(\S)\1{' || v_max_run || ',}');
END $$;

REVOKE ALL ON FUNCTION public.comment_looks_like_spam(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comment_looks_like_spam(text) TO authenticated;

CREATE FUNCTION public.guard_comment_abuse()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT public.is_moderator()) THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        -- A retry of a comment that is already there is not a new comment.
        IF EXISTS (SELECT 1 FROM public.comments WHERE id = NEW.id) THEN
            RETURN NEW;
        END IF;
        PERFORM public.enforce_rate_limit('comment');
    ELSIF NEW.body IS NOT DISTINCT FROM OLD.body THEN
        RETURN NEW;
    END IF;
    IF public.comment_looks_like_spam(NEW.body) THEN
        RAISE EXCEPTION 'this looks like spam' USING ERRCODE = '22023', HINT = 'spam';
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.guard_comment_abuse() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_guard_abuse BEFORE INSERT OR UPDATE OF body ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.guard_comment_abuse();

CREATE OR REPLACE FUNCTION public.submit_report(p_kind text, p_target_id uuid, p_reason text, p_description text DEFAULT NULL)
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
    PERFORM public.enforce_rate_limit('report');           -- the ceiling is a row of abuse_limits, not a number in here

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

COMMIT;
