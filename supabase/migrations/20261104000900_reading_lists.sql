-- Reading lists: ordered shelves of stories a reader curates and may share (WBS WP 4.5).
--
-- Plain CRUD of a list and removal of a story already work through RLS and grants (owner full control; everyone reads
-- public and unlisted lists; private lists only their owner). What RLS cannot give is ORDER and LIMITS, so:
--
--   add_story_to_list(list_id, story_id) -> sort_order    appends at the end, safe when two requests race (the list row
--                                                         is locked), idempotent (an already listed story keeps its place)
--   reorder_list_items(list_id, story_ids[])              sets the whole order at once; the array must be exactly the
--                                                         stories of the list as the caller sees them (a stale screen is
--                                                         refused, nothing is half-moved)
--
-- Both are SECURITY INVOKER: the caller's RLS applies on top, so only the owner changes a list and only a story the
-- caller can read can be added.
--
-- Limits (triggers, so every path is covered): at most 100 lists per reader, 500 stories per list.
--
-- Note on `unlisted`: like unlisted stories, an unlisted list is readable by anyone who has its id, but a plain query can
-- still enumerate it. Pages that LIST lists must therefore filter on visibility = 'public' themselves.
--
-- Error contract: 42501 not signed in / story not readable by the caller, PT404 list not found or not the caller's,
-- PT409 limit reached or the list changed since the caller looked, 22023 invalid argument (null or duplicate ids).
-- Rollback: DROP both triggers and the three functions.
BEGIN;

CREATE FUNCTION public.limit_reading_lists()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF (SELECT count(*) FROM public.reading_lists WHERE owner_id = NEW.owner_id) >= 100 THEN
        RAISE EXCEPTION 'too many reading lists' USING ERRCODE = 'PT409';
    END IF;
    RETURN NEW;
END $$;

CREATE FUNCTION public.limit_reading_list_items()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF (SELECT count(*) FROM public.reading_list_items WHERE reading_list_id = NEW.reading_list_id) >= 500 THEN
        RAISE EXCEPTION 'too many stories in the list' USING ERRCODE = 'PT409';
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.limit_reading_lists(), public.limit_reading_list_items() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reading_lists_limit BEFORE INSERT ON reading_lists
    FOR EACH ROW EXECUTE FUNCTION public.limit_reading_lists();
CREATE TRIGGER reading_list_items_limit BEFORE INSERT ON reading_list_items
    FOR EACH ROW EXECUTE FUNCTION public.limit_reading_list_items();

CREATE FUNCTION public.add_story_to_list(p_list_id uuid, p_story_id uuid)
RETURNS integer
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_order integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    -- The lock makes two simultaneous appends take turns instead of choosing the same position.
    PERFORM 1 FROM public.reading_lists WHERE id = p_list_id AND owner_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'reading list not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT sort_order INTO v_order FROM public.reading_list_items
     WHERE reading_list_id = p_list_id AND story_id = p_story_id;
    IF FOUND THEN
        RETURN v_order;
    END IF;

    INSERT INTO public.reading_list_items (reading_list_id, story_id, sort_order)
    VALUES (p_list_id, p_story_id,
            coalesce((SELECT max(sort_order) FROM public.reading_list_items WHERE reading_list_id = p_list_id), 0) + 1)
    RETURNING sort_order INTO v_order;
    -- `title = title` touches a column the caller may update; the touch trigger then moves updated_at.
    UPDATE public.reading_lists SET title = title WHERE id = p_list_id;
    RETURN v_order;
END $$;

CREATE FUNCTION public.reorder_list_items(p_list_id uuid, p_story_ids uuid[])
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    IF p_story_ids IS NULL OR array_position(p_story_ids, NULL) IS NOT NULL
       OR (SELECT count(DISTINCT id) FROM unnest(p_story_ids) id) <> cardinality(p_story_ids) THEN
        RAISE EXCEPTION 'the order must list each story once' USING ERRCODE = '22023';
    END IF;

    PERFORM 1 FROM public.reading_lists WHERE id = p_list_id AND owner_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'reading list not found' USING ERRCODE = 'PT404';
    END IF;

    IF (SELECT coalesce(array_agg(story_id ORDER BY story_id), '{}')
          FROM public.reading_list_items WHERE reading_list_id = p_list_id)
       IS DISTINCT FROM (SELECT coalesce(array_agg(id ORDER BY id), '{}') FROM unnest(p_story_ids) id) THEN
        RAISE EXCEPTION 'the list changed since it was read' USING ERRCODE = 'PT409';
    END IF;

    UPDATE public.reading_list_items i SET sort_order = o.position
      FROM unnest(p_story_ids) WITH ORDINALITY AS o(story_id, position)
     WHERE i.reading_list_id = p_list_id AND i.story_id = o.story_id;
    -- `title = title` touches a column the caller may update; the touch trigger then moves updated_at.
    UPDATE public.reading_lists SET title = title WHERE id = p_list_id;
END $$;

REVOKE ALL ON FUNCTION public.add_story_to_list(uuid, uuid), public.reorder_list_items(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_story_to_list(uuid, uuid), public.reorder_list_items(uuid, uuid[])
    TO authenticated, service_role;

COMMIT;
