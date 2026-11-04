-- Story authors moderate the comments on their own story (WBS WP 6.2, D6).
--
-- Who: the owner and co-authors of the story (editors write chapters, they do not moderate readers).
-- What: hide a comment (it disappears for everyone but the commenter and the story's managers) and show it again.
--
--   set_comment_hidden(comment_id, hidden) -> text    SECURITY DEFINER, idempotent; returns the card status afterwards
--                                                     ('visible' | 'author_hidden')
--   comment_hides                                     who hid a comment and in which capacity (author | moderator)
--
-- The rule that matters: a comment a MODERATOR hid cannot be shown again by the story author. A hidden comment is
-- "hidden by the author" only when comment_hides says so; a hidden comment without such a row (or with source
-- 'moderator') counts as a moderator's, so rows hidden before this migration stay protected. The row is written by a
-- trigger on every status change, so no path (RPC, a moderator's direct UPDATE, a later console) can forget it. Only the
-- RPC announces itself as the author (transaction-local setting), and authors have no direct UPDATE right to 'hidden'.
--
-- Cards: a hidden comment reaches its commenter and the story's managers with status 'author_hidden' when the story
-- author hid it and 'hidden' when a moderator did, so the screen can say which. Everyone else still gets the
-- placeholder. comment_listable now also lets the story's managers see hidden comments (they need them to show them).
--
-- Counters: comments_count already moves on every status change (hide = -1, show = +1); nothing to add.
-- Rollback: DROP the function, the trigger and comment_hides; restore comment_listable / comment_to_card from the
-- WP 4.2 migration. Hidden comments stay hidden (a moderator's state).
BEGIN;

CREATE TABLE public.comment_hides (
    comment_id uuid PRIMARY KEY REFERENCES public.comments(id) ON DELETE CASCADE,
    hidden_by uuid,                       -- plain id, no FK: a record of who acted must never block or follow a profile
    source text NOT NULL CHECK (source IN ('author', 'moderator')),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comment_hides ENABLE ROW LEVEL SECURITY;
-- Read and written only by the functions below (no policy, no grant): the table is bookkeeping, not an API.
REVOKE ALL ON public.comment_hides FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_comment_hide()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.status = 'hidden' THEN
        -- No conflict is possible: every move away from 'hidden' deletes the row, and this runs only on a change.
        INSERT INTO public.comment_hides (comment_id, hidden_by, source)
        VALUES (NEW.id, (SELECT auth.uid()),
                CASE WHEN coalesce(current_setting('storynest.hide_source', true), '') = 'author'
                     THEN 'author' ELSE 'moderator' END);
    ELSE
        DELETE FROM public.comment_hides WHERE comment_id = NEW.id;
    END IF;
    RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.record_comment_hide() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_record_hide AFTER UPDATE OF status ON public.comments
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.record_comment_hide();

-- True when the caller owns or co-authors the story the comment is under.
CREATE FUNCTION public.can_moderate_comments(p_chapter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(public.story_role(c.story_id) IN ('owner', 'co_author'), false)
      FROM public.chapters c WHERE c.id = p_chapter_id
$$;

REVOKE ALL ON FUNCTION public.can_moderate_comments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_moderate_comments(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.comment_listable(c public.comments)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    -- coalesce: a guest has no uid, so the author test is NULL, and NULL must read as "no", never fall through a CASE
    SELECT coalesce(public.can_read_chapter(c.chapter_id)
       AND ((c.status = 'visible' AND c.deleted_at IS NULL)
            OR (c.author_id = (SELECT auth.uid()) AND c.status = 'hidden')
            OR (c.status = 'hidden' AND public.can_moderate_comments(c.chapter_id))
            OR public.is_moderator()), false)
$$;

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
    RETURN v_card;
END $$;

-- Error contract: 42501 not signed in / not a manager of the story, PT404 comment not found (or not readable),
-- PT409 wrong state (a moderator hid it, or it was deleted).
CREATE FUNCTION public.set_comment_hidden(p_comment_id uuid, p_hidden boolean)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_comment public.comments%ROWTYPE;
    v_by_author boolean;
BEGIN
    IF v_uid IS NULL OR p_hidden IS NULL OR NOT (SELECT public.is_active_account()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id FOR UPDATE;
    IF NOT FOUND OR NOT public.can_read_chapter(v_comment.chapter_id) THEN
        RAISE EXCEPTION 'comment not found' USING ERRCODE = 'PT404';
    END IF;
    IF NOT public.can_moderate_comments(v_comment.chapter_id) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF v_comment.status = 'deleted' THEN
        RAISE EXCEPTION 'the comment was deleted' USING ERRCODE = 'PT409';
    END IF;

    v_by_author := EXISTS (SELECT 1 FROM public.comment_hides h WHERE h.comment_id = v_comment.id AND h.source = 'author');
    IF p_hidden THEN
        IF v_comment.status = 'visible' THEN
            PERFORM set_config('storynest.hide_source', 'author', true);
            UPDATE public.comments SET status = 'hidden' WHERE id = v_comment.id;
            PERFORM set_config('storynest.hide_source', '', true);
            RETURN 'author_hidden';
        END IF;
        RETURN CASE WHEN v_by_author THEN 'author_hidden' ELSE 'hidden' END;     -- already hidden: repeating is harmless
    END IF;

    IF v_comment.status = 'visible' THEN
        RETURN 'visible';
    END IF;
    IF NOT v_by_author THEN
        RAISE EXCEPTION 'the comment was hidden by a moderator' USING ERRCODE = 'PT409';
    END IF;
    UPDATE public.comments SET status = 'visible' WHERE id = v_comment.id;
    RETURN 'visible';
END $$;

REVOKE ALL ON FUNCTION public.set_comment_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_comment_hidden(uuid, boolean) TO authenticated;

COMMIT;
