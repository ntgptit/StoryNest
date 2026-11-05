-- Personal highlights on chapter text (Lucian 392 "hand-drawn annotations", batch 4 · community4).
--
-- Rollback (exact statements, in this order):
--   DROP FUNCTION public.list_my_highlights(uuid);
--   DROP FUNCTION public.add_chapter_highlight(uuid, uuid, integer, integer, text);
--   DROP FUNCTION public.utf16_length(text);
--   DELETE FROM public.abuse_limits WHERE code = 'highlights_per_chapter';
--   DROP TABLE public.chapter_highlights;
--
-- A highlight is a range of one paragraph or heading of a chapter, drawn in one of four pen styles (underline, circle,
-- box, strike). It belongs to one reader and nobody else ever sees it: RLS shows a reader their own rows only, guests
-- have no grant at all, and the functions below always filter on auth.uid().
--
-- Keyed by chapter block + text range: block_id is the permanent anchor of the paragraph (chapter_blocks), the range is
-- [start_offset, end_offset) in UTF-16 code units of the block's text, the same unit as the published `marks`.
--
-- Re-publish rule: when the highlight is made, the server stores md5 of the block's text in the chapter's CURRENT
-- published version (the client cannot choose the version or the hash). A highlight is "live" exactly when the current
-- published version still has that block with text whose md5 is the same; otherwise it is "stale". Formatting (marks),
-- moving the paragraph, and changes to other paragraphs keep it live; any change to the paragraph's own text, or removing
-- the paragraph, makes it stale. A stale highlight is not drawn but is kept: if the author restores the identical text
-- it is live again. The reader deletes their own highlights (direct DELETE of own rows); they go with the chapter or the
-- account (cascade).
--
--   add_chapter_highlight(chapter, block, start, end, style) -> id   SECURITY DEFINER; the same range again only changes
--                                                                   the style (idempotent, returns the same id)
--   list_my_highlights(chapter) -> rows with a `stale` flag          SECURITY DEFINER; own rows only; nothing for a guest
--                                                                   or a chapter the caller cannot read
-- Limits: one range at most 2000 units; at most abuse_limits.highlights_per_chapter (500) highlights per reader and
-- chapter (22023, HINT highlight_limit).
-- Error contract: 42501 not signed in / account not active, PT404 chapter not found or not readable, 22023 unknown or
-- non-text paragraph, range outside the text, unknown style, limit reached.
BEGIN;

CREATE TABLE public.chapter_highlights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    block_id uuid NOT NULL,
    start_offset integer NOT NULL CHECK (start_offset >= 0),
    end_offset integer NOT NULL,
    style text NOT NULL CHECK (style IN ('underline', 'circle', 'box', 'strike')),
    block_text_md5 text NOT NULL CHECK (length(block_text_md5) = 32),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_offset > start_offset AND end_offset - start_offset <= 2000),
    UNIQUE (user_id, block_id, start_offset, end_offset),
    FOREIGN KEY (block_id, chapter_id) REFERENCES public.chapter_blocks(id, chapter_id) ON DELETE CASCADE
);
CREATE INDEX idx_chapter_highlights_reader ON public.chapter_highlights (user_id, chapter_id);
CREATE INDEX idx_chapter_highlights_block ON public.chapter_highlights (block_id, chapter_id);
CREATE INDEX idx_chapter_highlights_chapter ON public.chapter_highlights (chapter_id);

ALTER TABLE public.chapter_highlights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chapter_highlights FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.chapter_highlights TO authenticated;
CREATE POLICY chapter_highlights_own_read ON public.chapter_highlights FOR SELECT
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY chapter_highlights_own_delete ON public.chapter_highlights FOR DELETE
    USING (user_id = (SELECT auth.uid()));

INSERT INTO public.abuse_limits (code, max_value, window_seconds, note) VALUES
    ('highlights_per_chapter', 500, NULL, 'personal highlights one reader may keep in one chapter');

-- Length of a text in UTF-16 code units (characters outside the BMP count twice), the unit of marks and highlights.
CREATE FUNCTION public.utf16_length(p_text text)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
    SELECT length(p_text) + regexp_count(p_text, '[\U00010000-\U0010FFFF]')
$$;

REVOKE ALL ON FUNCTION public.utf16_length(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.add_chapter_highlight(
    p_chapter_id uuid, p_block_id uuid, p_start integer, p_end integer, p_style text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_text text;
    v_id uuid;
    v_max integer := coalesce((SELECT max_value FROM public.abuse_limits WHERE code = 'highlights_per_chapter'), 500);
BEGIN
    IF v_uid IS NULL OR NOT (SELECT public.is_active_account()) THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF NOT public.can_read_chapter(p_chapter_id) THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF p_style IS NULL OR p_style <> ALL (ARRAY['underline', 'circle', 'box', 'strike']) THEN
        RAISE EXCEPTION 'unknown style' USING ERRCODE = '22023';
    END IF;

    SELECT b.text_content INTO v_text
      FROM public.chapters c
      JOIN public.chapter_version_blocks b ON b.version_id = c.published_version_id AND b.chapter_id = c.id
     WHERE c.id = p_chapter_id AND b.block_id = p_block_id AND b.block_type IN ('paragraph', 'heading');
    IF v_text IS NULL THEN
        RAISE EXCEPTION 'unknown paragraph' USING ERRCODE = '22023';
    END IF;
    IF p_start IS NULL OR p_end IS NULL OR p_start < 0 OR p_end <= p_start OR p_end - p_start > 2000
       OR p_end > public.utf16_length(v_text) THEN
        RAISE EXCEPTION 'the range is outside the paragraph' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_id FROM public.chapter_highlights
     WHERE user_id = v_uid AND block_id = p_block_id AND start_offset = p_start AND end_offset = p_end;
    IF v_id IS NOT NULL THEN
        UPDATE public.chapter_highlights SET style = p_style, block_text_md5 = md5(v_text) WHERE id = v_id;
        RETURN v_id;
    END IF;
    IF (SELECT count(*) FROM public.chapter_highlights WHERE user_id = v_uid AND chapter_id = p_chapter_id) >= v_max THEN
        RAISE EXCEPTION 'too many highlights in this chapter' USING ERRCODE = '22023', HINT = 'highlight_limit';
    END IF;

    INSERT INTO public.chapter_highlights (user_id, chapter_id, block_id, start_offset, end_offset, style, block_text_md5)
    VALUES (v_uid, p_chapter_id, p_block_id, p_start, p_end, p_style, md5(v_text))
    ON CONFLICT (user_id, block_id, start_offset, end_offset) DO UPDATE SET style = EXCLUDED.style
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

CREATE FUNCTION public.list_my_highlights(p_chapter_id uuid)
RETURNS TABLE (id uuid, block_id uuid, start_offset integer, end_offset integer, style text, created_at timestamptz,
               stale boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT h.id, h.block_id, h.start_offset, h.end_offset, h.style, h.created_at,
           NOT EXISTS (SELECT 1 FROM public.chapters c
                         JOIN public.chapter_version_blocks b ON b.version_id = c.published_version_id
                                                             AND b.chapter_id = c.id
                        WHERE c.id = h.chapter_id AND b.block_id = h.block_id
                          AND md5(b.text_content) = h.block_text_md5) AS stale
      FROM public.chapter_highlights h
     WHERE h.user_id = (SELECT auth.uid()) AND h.chapter_id = p_chapter_id
       AND public.can_read_chapter(p_chapter_id)
     ORDER BY h.block_id, h.start_offset, h.end_offset
$$;

REVOKE ALL ON FUNCTION public.add_chapter_highlight(uuid, uuid, integer, integer, text),
    public.list_my_highlights(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_chapter_highlight(uuid, uuid, integer, integer, text),
    public.list_my_highlights(uuid) TO authenticated, service_role;

COMMIT;
