-- Emoji reactions on comments (Lucian 077, batch 4 · community4).
--
-- Rollback (exact statements, in this order):
--   DROP FUNCTION public.set_comment_reaction(uuid, text, boolean);
--   DROP FUNCTION public.comment_reaction_counts(uuid);
--   -- restore public.comment_to_card and public.enforce_rate_limit from 20261104001800 / 20261104002200, then:
--   ALTER TYPE public.comment_card DROP ATTRIBUTE my_reactions, DROP ATTRIBUTE reactions;
--   DELETE FROM public.abuse_limits WHERE code = 'reaction_rate_burst';
--   DROP TABLE public.comment_reactions;
--
-- The set is small and fixed: thumbs_up, laugh, wow, sad, fire, clap (stored as codes; the screen draws the emoji).
-- A reader may give a comment several different reactions (one row per comment x reader x reaction), like a chat app.
--
-- The like stays what it is. comment_likes keeps feeding like_count / liked_by_me and set_comment_like keeps its
-- contract, so nothing that reads likes changes; the heart button stays the one-tap action and is NOT part of the
-- reaction set (no heart code here), so a like is never counted twice. Moving likes into this table would have changed
-- a published RPC and the data behind it for no gain: reactions are an addition next to the like.
--
--   comment_reactions                                   rows are private to their reader (RLS: own rows only); no
--                                                       client INSERT / UPDATE / DELETE grant: writes go through the RPC
--   set_comment_reaction(comment, reaction, on) -> jsonb  SECURITY DEFINER, idempotent (on twice = once, off twice =
--                                                       nothing); returns that comment's counts {"laugh": 2, ...}
--   comment_card.reactions / .my_reactions               counts per code and the caller's own codes, in every card of
--                                                       list_comments / list_replies
--
-- Who may react: a signed-in ACTIVE account (a suspended one is refused) on a comment it can list (visible, or the
-- placeholder rules of comment_listable). Taking a reaction back is always allowed on a listable comment.
-- Abuse limit: adding a reaction counts against a new abuse_limits row, reaction_rate_burst (60 reactions still standing
-- that were added in the last 600 s); moderators and callers without a user are exempt, exactly like the comment limits.
-- Error contract: 42501 not signed in / not active, PT404 comment not found or not visible to the caller, 22023 unknown
-- reaction or a null flag, PT429 too many reactions (HINT = reaction_rate_burst).
BEGIN;

CREATE TABLE public.comment_reactions (
    comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    reaction text NOT NULL CHECK (reaction IN ('thumbs_up', 'laugh', 'wow', 'sad', 'fire', 'clap')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (comment_id, user_id, reaction)
);
CREATE INDEX idx_comment_reactions_user ON public.comment_reactions (user_id, created_at DESC);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comment_reactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.comment_reactions TO authenticated;
CREATE POLICY comment_reactions_own_read ON public.comment_reactions FOR SELECT
    USING (user_id = (SELECT auth.uid()));

INSERT INTO public.abuse_limits (code, max_value, window_seconds, note) VALUES
    ('reaction_rate_burst', 60, 600, 'comment reactions added per account in a short window');

-- The limits function learns the new action; the comment and report branches are unchanged.
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_action text)
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
                             WHEN 'reaction' THEN ARRAY['reaction_rate_burst']
                             ELSE ARRAY[]::text[] END)
    LOOP
        IF p_action = 'comment' THEN
            SELECT count(*) INTO v_used FROM public.comments
             WHERE author_id = v_uid AND created_at > clock_timestamp() - make_interval(secs => v_limit.window_seconds);
        ELSIF p_action = 'reaction' THEN
            SELECT count(*) INTO v_used FROM public.comment_reactions
             WHERE user_id = v_uid AND created_at > clock_timestamp() - make_interval(secs => v_limit.window_seconds);
        ELSE
            SELECT count(*) INTO v_used FROM public.content_reports
             WHERE reporter_id = v_uid AND created_at > clock_timestamp() - make_interval(secs => v_limit.window_seconds);
        END IF;
        IF v_used >= v_limit.max_value THEN
            RAISE EXCEPTION 'too many requests' USING ERRCODE = 'PT429', HINT = v_limit.code;
        END IF;
    END LOOP;
END $$;

-- {"laugh": 2, "fire": 1}: only codes with at least one reaction appear.
CREATE FUNCTION public.comment_reaction_counts(p_comment_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(jsonb_object_agg(x.reaction, x.n), '{}'::jsonb)
      FROM (SELECT r.reaction, count(*) AS n FROM public.comment_reactions r
             WHERE r.comment_id = p_comment_id GROUP BY r.reaction) x
$$;

REVOKE ALL ON FUNCTION public.comment_reaction_counts(uuid) FROM PUBLIC, anon, authenticated;

-- The card carries the reactions. A placeholder (deleted / not listable) shows none.
ALTER TYPE public.comment_card ADD ATTRIBUTE reactions jsonb, ADD ATTRIBUTE my_reactions text[];

CREATE OR REPLACE FUNCTION public.comment_to_card(c public.comments)
RETURNS public.comment_card
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_shown boolean := public.comment_listable(c);
    v_author public.app_users%ROWTYPE;
    v_card public.comment_card;
BEGIN
    IF v_shown THEN
        SELECT * INTO v_author FROM public.app_users WHERE id = c.author_id;
    END IF;
    v_card.id := c.id;
    v_card.chapter_id := c.chapter_id;
    v_card.block_id := c.block_id;
    v_card.parent_comment_id := c.parent_comment_id;
    -- A placeholder keeps the thread but not the text or the person.
    v_card.author_id := CASE WHEN v_shown THEN c.author_id END;
    v_card.author_username := v_author.username::text;
    v_card.author_display_name := v_author.display_name::text;
    v_card.author_avatar_key := v_author.avatar_storage_key;
    v_card.body := CASE WHEN v_shown THEN c.body END;
    v_card.status := CASE
        WHEN NOT v_shown THEN 'deleted'
        WHEN c.status = 'hidden'
             AND EXISTS (SELECT 1 FROM public.comment_hides h WHERE h.comment_id = c.id AND h.source = 'author')
            THEN 'author_hidden'
        ELSE c.status END;
    v_card.created_at := c.created_at;
    v_card.edited := v_shown AND c.status = 'visible' AND c.updated_at > c.created_at + interval '1 second';
    v_card.like_count := (SELECT count(*) FROM public.comment_likes l WHERE l.comment_id = c.id);
    v_card.liked_by_me := v_uid IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.comment_likes l WHERE l.comment_id = c.id AND l.user_id = v_uid);
    v_card.reply_count := public.comment_reply_count(c.id);
    v_card.reactions := CASE WHEN v_shown THEN public.comment_reaction_counts(c.id) ELSE '{}'::jsonb END;
    v_card.my_reactions := CASE WHEN v_shown AND v_uid IS NOT NULL THEN
        coalesce((SELECT array_agg(r.reaction ORDER BY r.reaction) FROM public.comment_reactions r
                   WHERE r.comment_id = c.id AND r.user_id = v_uid), ARRAY[]::text[])
        ELSE ARRAY[]::text[] END;
    RETURN v_card;
END $$;

CREATE FUNCTION public.set_comment_reaction(p_comment_id uuid, p_reaction text, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_comment public.comments%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT (SELECT public.is_active_account()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_on IS NULL OR p_reaction IS NULL
       OR p_reaction <> ALL (ARRAY['thumbs_up', 'laugh', 'wow', 'sad', 'fire', 'clap']) THEN
        RAISE EXCEPTION 'unknown reaction' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id;
    IF NOT FOUND OR NOT public.comment_listable(v_comment) THEN
        RAISE EXCEPTION 'comment not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_on THEN
        IF NOT EXISTS (SELECT 1 FROM public.comment_reactions
                        WHERE comment_id = p_comment_id AND user_id = v_uid AND reaction = p_reaction) THEN
            PERFORM public.enforce_rate_limit('reaction');
            INSERT INTO public.comment_reactions (comment_id, user_id, reaction) VALUES (p_comment_id, v_uid, p_reaction)
            ON CONFLICT (comment_id, user_id, reaction) DO NOTHING;
        END IF;
    ELSE
        DELETE FROM public.comment_reactions
         WHERE comment_id = p_comment_id AND user_id = v_uid AND reaction = p_reaction;
    END IF;
    RETURN public.comment_reaction_counts(p_comment_id);
END $$;

REVOKE ALL ON FUNCTION public.set_comment_reaction(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_comment_reaction(uuid, text, boolean) TO authenticated, service_role;

COMMIT;
