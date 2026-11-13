-- F-STORY-03 / FP-011 (chapters): a chapter whose slug was renamed keeps working at its old address.
--
--   chapter_slug_history(story_id, slug, chapter_id)  every slug a chapter used to have (closed to clients)
--   resolve_chapter_slug(p_story_id, p_slug) -> text   the current slug of the readable chapter that once had `p_slug`
--
-- The reader page asks for the new slug only when no chapter has the requested one, and answers a 308 redirect, so old
-- links, bookmarks and notifications keep opening the chapter. The function applies the reader's own rights
-- (can_read_chapter), so it never reveals a chapter the caller cannot read. Chapters that exist now always win over
-- history rows, because the page tries the real slug first.
--
-- Rollback: DROP FUNCTION public.resolve_chapter_slug(uuid, text);
--           DROP TRIGGER chapters_slug_history ON public.chapters;
--           DROP FUNCTION public.record_chapter_slug_change();
--           DROP TABLE public.chapter_slug_history;
BEGIN;

CREATE TABLE public.chapter_slug_history (
    story_id uuid NOT NULL,
    slug varchar(120) NOT NULL,
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, slug)
);
CREATE INDEX idx_chapter_slug_history_chapter ON public.chapter_slug_history (chapter_id);

-- Written by the trigger only: no policy and no grant, like the other internal tables.
ALTER TABLE public.chapter_slug_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chapter_slug_history FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_chapter_slug_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.chapter_slug_history (story_id, slug, chapter_id)
    VALUES (OLD.story_id, OLD.slug, OLD.id)
    ON CONFLICT (story_id, slug) DO UPDATE SET chapter_id = EXCLUDED.chapter_id, created_at = now();
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.record_chapter_slug_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER chapters_slug_history AFTER UPDATE OF slug ON public.chapters
    FOR EACH ROW WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
    EXECUTE FUNCTION public.record_chapter_slug_change();

CREATE FUNCTION public.resolve_chapter_slug(p_story_id uuid, p_slug text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT c.slug
      FROM public.chapter_slug_history h
      JOIN public.chapters c ON c.id = h.chapter_id AND c.story_id = h.story_id
     WHERE h.story_id = p_story_id AND h.slug = p_slug
       AND c.status = 'published' AND c.deleted_at IS NULL
       AND public.can_read_chapter(c.id)
$$;

REVOKE ALL ON FUNCTION public.resolve_chapter_slug(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_chapter_slug(uuid, text) TO anon, authenticated;

COMMIT;
