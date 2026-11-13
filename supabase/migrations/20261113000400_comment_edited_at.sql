-- F-CMT-01: "(edited)" appeared after hiding and showing a comment, or saving it unchanged, because the card compared
-- updated_at with created_at and every UPDATE moves updated_at.
--
-- comments.edited_at is set only when the body changes (trigger). Rows that already looked edited keep that look: the
-- old rule is applied once to fill the column, so nothing that was shown as edited disappears (a few earlier
-- hide/show cycles stay marked; new ones no longer are).
--
-- Rollback: restore comment_to_card from 20261106010000_comment_reactions.sql, then
--           DROP TRIGGER comments_set_edited_at ON public.comments; DROP FUNCTION public.set_comment_edited_at();
--           ALTER TABLE public.comments DROP COLUMN edited_at;
BEGIN;

ALTER TABLE public.comments ADD COLUMN edited_at timestamptz;

UPDATE public.comments SET edited_at = updated_at WHERE status = 'visible' AND updated_at > created_at + interval '1 second';

CREATE FUNCTION public.set_comment_edited_at()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.edited_at := now();
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.set_comment_edited_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_set_edited_at BEFORE UPDATE OF body ON public.comments
    FOR EACH ROW WHEN (OLD.body IS DISTINCT FROM NEW.body)
    EXECUTE FUNCTION public.set_comment_edited_at();

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
    -- "(edited)" means the text changed, not that the row was touched (hiding or showing also moves updated_at).
    v_card.edited := v_shown AND c.status = 'visible' AND c.edited_at IS NOT NULL;
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

COMMIT;
