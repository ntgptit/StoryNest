-- F-STM-09: an owner could not restore a story they had deleted themselves.
--
-- The guard trigger runs with the caller's rights (it must see who the caller is), and it called
-- last_moderation_action(), which clients have no EXECUTE on, so every client restore failed with "permission denied
-- for function last_moderation_action" instead of reaching the moderator check. The check now goes through a narrow
-- SECURITY DEFINER predicate that clients may call. Moderators restore through public.moderate() (SECURITY DEFINER),
-- which runs as the function owner and is not a client role, so it is unaffected.
--
-- Rollback: restore the previous body of refuse_restoring_removed_story() (see 20261104002000_moderation.sql) and
--           DROP FUNCTION public.story_removed_by_moderator(uuid);
BEGIN;

-- True when the latest moderator action on the story is its removal. Reveals one bit about one story id.
CREATE FUNCTION public.story_removed_by_moderator(p_story_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.last_moderation_action(p_story_id) = 'remove_story'
$$;

REVOKE ALL ON FUNCTION public.story_removed_by_moderator(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.story_removed_by_moderator(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.refuse_restoring_removed_story()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') AND coalesce(public.story_removed_by_moderator(OLD.id), false) THEN
        RAISE EXCEPTION 'the story was removed by a moderator' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

COMMIT;
