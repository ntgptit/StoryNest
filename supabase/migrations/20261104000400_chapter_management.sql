-- Chapter management RPCs (WBS WP 3.4, decision D5).
--
--   create_chapter(story_id, title, slug, id?)  -> chapter id    owner, co-author or editor
--   reorder_chapters(story_id, chapter_ids[])   -> void          owner, co-author or editor
--   archive_chapter(chapter_id) / unarchive_chapter(chapter_id)  owner or co-author
--
-- Why RPCs: a chapter's position (sort_order) is unique per story, so "append" and "move" are read-modify-write
-- operations that two authors can race. Each function takes the story row lock first, so concurrent calls run one after
-- the other and always leave a consistent order. All run as SECURITY DEFINER with explicit role checks (editors may
-- create and reorder, like they may edit and publish; they cannot lock the story row through RLS).
--
-- * create_chapter appends at the next position, creating the draft (with its title) in the same transaction.
-- * reorder_chapters takes the complete new order of the story's NON-deleted chapters. Anything else (a missing,
--   duplicated, foreign or deleted id) is rejected, so a stale screen cannot silently drop or resurrect a chapter.
--   Positions are renumbered 1..n; soft-deleted chapters keep their relative order after them. The unique key
--   (story_id, sort_order) is deferrable, so the renumbering never trips over itself.
-- * archive_chapter takes a chapter off the shelf without deleting it (readers cannot see it, nothing is lost, its
--   published pointer and schedule are cleared like unpublish does); unarchive_chapter returns it to draft. An archived
--   chapter cannot be published or scheduled directly (PT409): unarchive first, so archiving is never undone by accident.
--
-- Error contract (SQLSTATE): 42501 not authenticated / not allowed, PT404 story or chapter not found (no role on it),
-- PT409 wrong chapter state, 22023 invalid argument; a taken slug surfaces as 23505 (unique violation).
--
-- Rollback: DROP TRIGGER chapters_archived_guard ON chapters; DROP FUNCTION private.guard_archived_chapter();
-- DROP FUNCTION public.create_chapter(uuid, text, text, uuid), public.reorder_chapters(uuid, uuid[]),
-- public.archive_chapter(uuid), public.unarchive_chapter(uuid);
BEGIN;

CREATE FUNCTION public.create_chapter(p_story_id uuid, p_title text, p_slug text, p_id uuid DEFAULT gen_random_uuid())
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_title text := btrim(coalesce(p_title, ''));
    v_slug text := btrim(coalesce(p_slug, ''));
    v_position integer;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF v_title = '' OR char_length(v_title) > 200 THEN
        RAISE EXCEPTION 'title must be 1 to 200 characters' USING ERRCODE = '22023';
    END IF;
    IF char_length(v_slug) > 120 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION 'slug must be lowercase letters, digits and single hyphens (at most 120 characters)'
            USING ERRCODE = '22023';
    END IF;

    PERFORM 1 FROM public.stories WHERE id = p_story_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(p_story_id) IS NULL THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT coalesce(max(sort_order), 0) + 1 INTO v_position FROM public.chapters WHERE story_id = p_story_id;
    INSERT INTO public.chapters (id, story_id, slug, sort_order) VALUES (p_id, p_story_id, v_slug, v_position);
    INSERT INTO public.chapter_drafts (chapter_id, title, updated_by) VALUES (p_id, v_title, v_uid);
    RETURN p_id;
END $$;

CREATE FUNCTION public.reorder_chapters(p_story_id uuid, p_chapter_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_live integer;
    v_given integer;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;

    PERFORM 1 FROM public.stories WHERE id = p_story_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(p_story_id) IS NULL THEN
        RAISE EXCEPTION 'story not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT count(*) INTO v_live FROM public.chapters WHERE story_id = p_story_id AND deleted_at IS NULL;
    SELECT count(DISTINCT id) INTO v_given FROM unnest(coalesce(p_chapter_ids, '{}')) AS t(id);
    IF coalesce(cardinality(p_chapter_ids), 0) <> v_given
       OR v_given <> v_live
       OR EXISTS (
            SELECT 1 FROM unnest(p_chapter_ids) AS t(id)
            WHERE NOT EXISTS (SELECT 1 FROM public.chapters c
                              WHERE c.id = t.id AND c.story_id = p_story_id AND c.deleted_at IS NULL)) THEN
        RAISE EXCEPTION 'chapter_ids must list each non-deleted chapter of the story exactly once'
            USING ERRCODE = '22023';
    END IF;

    SET CONSTRAINTS public.uq_chapter_position DEFERRED;
    UPDATE public.chapters c SET sort_order = t.ord
      FROM unnest(p_chapter_ids) WITH ORDINALITY AS t(id, ord)
     WHERE c.id = t.id;
    -- Deleted chapters keep their relative order, after the live ones, so the key stays unique.
    UPDATE public.chapters c SET sort_order = v_live + d.rn
      FROM (SELECT id, row_number() OVER (ORDER BY sort_order, id) AS rn
              FROM public.chapters WHERE story_id = p_story_id AND deleted_at IS NOT NULL) d
     WHERE c.id = d.id;
    SET CONSTRAINTS public.uq_chapter_position IMMEDIATE;   -- check now, so a violation is reported by this call
END $$;

CREATE FUNCTION public.archive_chapter(p_chapter_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_chapter public.chapters%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(v_chapter.story_id) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF public.story_role(v_chapter.story_id) NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'only the owner or a co-author can archive' USING ERRCODE = '42501';
    END IF;
    IF v_chapter.status = 'archived' THEN
        RAISE EXCEPTION 'chapter is already archived' USING ERRCODE = 'PT409';
    END IF;
    UPDATE public.chapters
       SET status = 'archived', published_version_id = NULL, scheduled_for = NULL
     WHERE id = p_chapter_id;
END $$;

CREATE FUNCTION public.unarchive_chapter(p_chapter_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_chapter public.chapters%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_account() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR public.story_role(v_chapter.story_id) IS NULL THEN
        RAISE EXCEPTION 'chapter not found' USING ERRCODE = 'PT404';
    END IF;
    IF public.story_role(v_chapter.story_id) NOT IN ('owner', 'co_author') THEN
        RAISE EXCEPTION 'only the owner or a co-author can unarchive' USING ERRCODE = '42501';
    END IF;
    IF v_chapter.status <> 'archived' THEN
        RAISE EXCEPTION 'chapter is not archived (status is %)', v_chapter.status USING ERRCODE = 'PT409';
    END IF;
    UPDATE public.chapters SET status = 'draft' WHERE id = p_chapter_id;
END $$;

-- Every path that publishes or schedules writes chapters.status, so the guard lives on the table.
CREATE FUNCTION private.guard_archived_chapter() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF OLD.status = 'archived' AND NEW.status IN ('published', 'scheduled') THEN
        RAISE EXCEPTION 'an archived chapter must be unarchived before it can be published or scheduled'
            USING ERRCODE = 'PT409';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_archived_chapter() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chapters_archived_guard BEFORE UPDATE OF status ON chapters
    FOR EACH ROW EXECUTE FUNCTION private.guard_archived_chapter();

REVOKE ALL ON FUNCTION public.create_chapter(uuid, text, text, uuid), public.reorder_chapters(uuid, uuid[]),
    public.archive_chapter(uuid), public.unarchive_chapter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_chapter(uuid, text, text, uuid), public.reorder_chapters(uuid, uuid[]),
    public.archive_chapter(uuid), public.unarchive_chapter(uuid) TO authenticated, service_role;

COMMIT;
