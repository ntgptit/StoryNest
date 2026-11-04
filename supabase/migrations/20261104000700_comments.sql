-- Comments on a chapter or on one paragraph (WBS WP 4.2, database part).
--
-- A comment belongs to a chapter and optionally to a paragraph (block_id, the permanent anchor); a reply belongs to a
-- top-level comment of the same chapter and the same paragraph. Only ONE level of replies exists (reply to a reply is
-- refused), which keeps threads readable and paging simple.
--
-- Writes (all SECURITY INVOKER: the caller's own RLS applies on top of the checks here)
--   post_comment(id, chapter_id, block_id, parent_id, body) -> id    idempotent on `id` (a retry after a lost response
--                                                                    returns the same comment); the same text from
--                                                                    the same author in the same place within 30 s
--                                                                    returns the first one instead of a duplicate
--   edit_comment(id, body)                                           the author, while the comment is visible
--   delete_comment(id)                                               the author; soft delete, repeating is harmless
-- Likes (SECURITY DEFINER: others' like rows are private, the count is not)
--   set_comment_like(id, liked) -> likes                             idempotent, like.set_chapter_vote
-- Reads (SECURITY DEFINER; anonymous readers allowed; every row passes comment_listable)
--   list_comments(chapter, block, newest_first, cursor, limit)       top-level comments, keyset paging
--   list_replies(parent, cursor, limit)                              replies, oldest first, keyset paging
--   comment_counts_by_block(chapter)                                 per-paragraph counts for the margin badges
--
-- Who sees what: everyone who can read the chapter sees visible comments; the author also sees their own comment when a
-- moderator hid it (status 'hidden', so the screen can say why it is gone for others); moderators see all. A deleted or
-- hidden top-level comment that still has listable replies is shown as a placeholder (no text, no author) so the
-- replies keep their context.
--
-- Error contract: 42501 not signed in / not allowed, PT404 comment or parent not found (or not visible to the caller),
-- PT409 wrong state (parent no longer visible, id already used by someone else, comment hidden), 22023 invalid argument
-- (empty or too long text, unknown paragraph, reply to a reply, paragraph differs from the parent's).
--
-- Not here: report/moderation screens, notifications (WP 4.7), the comment counters (WP 4.8), rate limiting.
-- Rollback: DROP the functions, the type and the trigger below.
BEGIN;

-- 1. Reply rules, enforced on every insert whatever path it comes from -------------------------------------------
CREATE FUNCTION public.check_comment_parent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_parent public.comments%ROWTYPE;
BEGIN
    IF NEW.parent_comment_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT * INTO v_parent FROM public.comments WHERE id = NEW.parent_comment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'parent comment not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_parent.parent_comment_id IS NOT NULL THEN
        RAISE EXCEPTION 'replies cannot be nested deeper' USING ERRCODE = '22023';
    END IF;
    IF v_parent.status <> 'visible' OR v_parent.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'the comment cannot be replied to' USING ERRCODE = 'PT409';
    END IF;
    IF NEW.block_id IS DISTINCT FROM v_parent.block_id THEN
        RAISE EXCEPTION 'a reply belongs to its parent''s paragraph' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.check_comment_parent() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER comments_check_parent BEFORE INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION public.check_comment_parent();

-- 2. What a reader of the list gets for one comment ---------------------------------------------------------------
CREATE TYPE public.comment_card AS (
    id uuid,
    chapter_id uuid,
    block_id uuid,
    parent_comment_id uuid,
    author_id uuid,
    author_username text,
    author_display_name text,
    author_avatar_key text,
    body text,
    status text,
    created_at timestamptz,
    edited boolean,
    like_count bigint,
    liked_by_me boolean,
    reply_count bigint
);

-- True when the caller may see this comment as a normal row.
CREATE FUNCTION public.comment_listable(c public.comments)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.can_read_chapter(c.chapter_id)
       AND ((c.status = 'visible' AND c.deleted_at IS NULL)
            OR (c.author_id = (SELECT auth.uid()) AND c.status = 'hidden')
            OR public.is_moderator())
$$;

CREATE FUNCTION public.comment_reply_count(p_comment_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT count(*) FROM public.comments r
     WHERE r.parent_comment_id = p_comment_id AND public.comment_listable(r)
$$;

CREATE FUNCTION public.comment_to_card(c public.comments)
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
    v_card.status := CASE WHEN v_shown THEN c.status ELSE 'deleted' END;
    v_card.created_at := c.created_at;
    v_card.edited := v_shown AND c.status = 'visible' AND c.updated_at > c.created_at + interval '1 second';
    v_card.like_count := (SELECT count(*) FROM public.comment_likes l WHERE l.comment_id = c.id);
    v_card.liked_by_me := v_uid IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.comment_likes l WHERE l.comment_id = c.id AND l.user_id = v_uid);
    v_card.reply_count := public.comment_reply_count(c.id);
    RETURN v_card;
END $$;

REVOKE ALL ON FUNCTION public.comment_listable(public.comments), public.comment_reply_count(uuid),
    public.comment_to_card(public.comments) FROM PUBLIC, anon, authenticated;

-- 3. Reads ---------------------------------------------------------------------------------------------------------
-- Top-level comments of the chapter (p_block_id NULL) or of one paragraph. Keyset paging: pass the last row's
-- (created_at, id) as the cursor. The caller asks for limit+1 rows to know whether another page exists.
CREATE FUNCTION public.list_comments(
    p_chapter_id uuid,
    p_block_id uuid DEFAULT NULL,
    p_newest_first boolean DEFAULT true,
    p_cursor_at timestamptz DEFAULT NULL,
    p_cursor_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 20)
RETURNS SETOF public.comment_card
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 51);
BEGIN
    IF NOT public.can_read_chapter(p_chapter_id) THEN
        RETURN;
    END IF;
    IF p_newest_first THEN
        RETURN QUERY
        SELECT k.* FROM public.comments c CROSS JOIN LATERAL public.comment_to_card(c) k
         WHERE c.chapter_id = p_chapter_id AND c.parent_comment_id IS NULL
           AND c.block_id IS NOT DISTINCT FROM p_block_id
           AND (p_cursor_at IS NULL OR (c.created_at, c.id) < (p_cursor_at, p_cursor_id))
           AND (public.comment_listable(c) OR public.comment_reply_count(c.id) > 0)
         ORDER BY c.created_at DESC, c.id DESC LIMIT v_limit;
    ELSE
        RETURN QUERY
        SELECT k.* FROM public.comments c CROSS JOIN LATERAL public.comment_to_card(c) k
         WHERE c.chapter_id = p_chapter_id AND c.parent_comment_id IS NULL
           AND c.block_id IS NOT DISTINCT FROM p_block_id
           AND (p_cursor_at IS NULL OR (c.created_at, c.id) > (p_cursor_at, p_cursor_id))
           AND (public.comment_listable(c) OR public.comment_reply_count(c.id) > 0)
         ORDER BY c.created_at ASC, c.id ASC LIMIT v_limit;
    END IF;
END $$;

CREATE FUNCTION public.list_replies(
    p_parent_id uuid,
    p_cursor_at timestamptz DEFAULT NULL,
    p_cursor_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 20)
RETURNS SETOF public.comment_card
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT k.* FROM public.comments c CROSS JOIN LATERAL public.comment_to_card(c) k
     WHERE c.parent_comment_id = p_parent_id
       AND (p_cursor_at IS NULL OR (c.created_at, c.id) > (p_cursor_at, p_cursor_id))
       AND public.comment_listable(c)
     ORDER BY c.created_at ASC, c.id ASC
     LIMIT least(greatest(coalesce(p_limit, 20), 1), 51)
$$;

CREATE FUNCTION public.comment_counts_by_block(p_chapter_id uuid)
RETURNS TABLE (block_id uuid, comment_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT c.block_id, count(*)
      FROM public.comments c
     WHERE c.chapter_id = p_chapter_id AND c.block_id IS NOT NULL AND public.comment_listable(c)
     GROUP BY c.block_id
$$;

-- 4. Writes --------------------------------------------------------------------------------------------------------
CREATE FUNCTION public.post_comment(
    p_id uuid, p_chapter_id uuid, p_block_id uuid, p_parent_id uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_body text := btrim(coalesce(p_body, ''));
    v_block uuid := p_block_id;
    v_parent public.comments%ROWTYPE;
    v_same uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_id IS NULL OR length(v_body) NOT BETWEEN 1 AND 10000 THEN
        RAISE EXCEPTION 'a comment needs 1 to 10000 characters' USING ERRCODE = '22023';
    END IF;

    IF p_parent_id IS NOT NULL THEN
        SELECT * INTO v_parent FROM public.comments WHERE id = p_parent_id AND chapter_id = p_chapter_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'parent comment not found' USING ERRCODE = 'PT404';
        END IF;
        v_block := v_parent.block_id;   -- a reply always sits where its parent sits
    END IF;
    IF v_block IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.chapter_blocks WHERE id = v_block AND chapter_id = p_chapter_id) THEN
        RAISE EXCEPTION 'unknown paragraph' USING ERRCODE = '22023';
    END IF;

    -- A retry with the same id: the comment is already there.
    IF EXISTS (SELECT 1 FROM public.comments WHERE id = p_id AND author_id = v_uid) THEN
        RETURN p_id;
    END IF;
    -- A resubmitted form (new id, same text, same place) within 30 seconds is the same comment.
    SELECT id INTO v_same FROM public.comments
     WHERE author_id = v_uid AND chapter_id = p_chapter_id AND status = 'visible' AND deleted_at IS NULL
       AND block_id IS NOT DISTINCT FROM v_block AND parent_comment_id IS NOT DISTINCT FROM p_parent_id
       AND body = v_body AND created_at > now() - interval '30 seconds'
     ORDER BY created_at LIMIT 1;
    IF v_same IS NOT NULL THEN
        RETURN v_same;
    END IF;

    INSERT INTO public.comments (id, chapter_id, block_id, parent_comment_id, author_id, body)
    VALUES (p_id, p_chapter_id, v_block, p_parent_id, v_uid, v_body)
    ON CONFLICT (id) DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.comments WHERE id = p_id AND author_id = v_uid) THEN
        RAISE EXCEPTION 'this id is already used' USING ERRCODE = 'PT409';
    END IF;
    RETURN p_id;
END $$;

CREATE FUNCTION public.edit_comment(p_comment_id uuid, p_body text)
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_body text := btrim(coalesce(p_body, ''));
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF length(v_body) NOT BETWEEN 1 AND 10000 THEN
        RAISE EXCEPTION 'a comment needs 1 to 10000 characters' USING ERRCODE = '22023';
    END IF;
    UPDATE public.comments SET body = v_body
     WHERE id = p_comment_id AND author_id = v_uid AND status = 'visible' AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'comment not found' USING ERRCODE = 'PT404';
    END IF;
END $$;

CREATE FUNCTION public.delete_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_status text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    UPDATE public.comments SET status = 'deleted', deleted_at = now()
     WHERE id = p_comment_id AND author_id = v_uid AND status = 'visible';
    IF FOUND THEN
        RETURN;
    END IF;
    SELECT status INTO v_status FROM public.comments WHERE id = p_comment_id AND author_id = v_uid;
    IF v_status = 'deleted' THEN
        RETURN;                                   -- already deleted: repeating is harmless
    ELSIF v_status = 'hidden' THEN
        RAISE EXCEPTION 'the comment was hidden by a moderator' USING ERRCODE = 'PT409';
    END IF;
    RAISE EXCEPTION 'comment not found' USING ERRCODE = 'PT404';
END $$;

CREATE FUNCTION public.set_comment_like(p_comment_id uuid, p_liked boolean)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_comment public.comments%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_liked IS NULL THEN
        RAISE EXCEPTION 'liked must be true or false' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id;
    IF NOT FOUND OR NOT public.comment_listable(v_comment) THEN
        RAISE EXCEPTION 'comment not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_liked THEN
        INSERT INTO public.comment_likes (user_id, comment_id) VALUES (v_uid, p_comment_id)
        ON CONFLICT (user_id, comment_id) DO NOTHING;
    ELSE
        DELETE FROM public.comment_likes WHERE user_id = v_uid AND comment_id = p_comment_id;
    END IF;
    RETURN (SELECT count(*) FROM public.comment_likes WHERE comment_id = p_comment_id);
END $$;

REVOKE ALL ON FUNCTION public.list_comments(uuid, uuid, boolean, timestamptz, uuid, integer),
    public.list_replies(uuid, timestamptz, uuid, integer), public.comment_counts_by_block(uuid),
    public.post_comment(uuid, uuid, uuid, uuid, text), public.edit_comment(uuid, text),
    public.delete_comment(uuid), public.set_comment_like(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_comments(uuid, uuid, boolean, timestamptz, uuid, integer),
    public.list_replies(uuid, timestamptz, uuid, integer), public.comment_counts_by_block(uuid)
    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_comment(uuid, uuid, uuid, uuid, text), public.edit_comment(uuid, text),
    public.delete_comment(uuid), public.set_comment_like(uuid, boolean) TO authenticated, service_role;

COMMIT;
