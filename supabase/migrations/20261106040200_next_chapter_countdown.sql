-- Next chapter countdown on the story page (Lucian 265, batch 4 "authoring4").
--
--   next_chapter_at(story_id) -> timestamptz | null
--
-- Readers only ever see published chapters (chapters_read), so the time of the next scheduled one is otherwise
-- invisible to them. This function exposes exactly one value: the earliest future scheduled_for of the story's
-- non-deleted scheduled chapters. No id, title, slug, draft or count leaves the function.
--
-- Who gets an answer: anyone who can read the story (can_read_story: a public or unlisted story that is not a draft
-- and not deleted, or the team, or a moderator). Everybody else, an unknown story and a story with nothing scheduled
-- all get NULL, so the call cannot be used to probe for hidden stories. A schedule whose time has passed but that
-- the cron job has not published yet is not "next" (scheduled_for > now()).
-- STABLE, SECURITY DEFINER (it must look past chapters_read), search_path pinned. Granted to anon and authenticated.
--
-- Rollback: DROP FUNCTION public.next_chapter_at(uuid); DROP INDEX idx_chapters_story_scheduled;
BEGIN;

CREATE FUNCTION public.next_chapter_at(p_story_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT min(c.scheduled_for)
      FROM public.chapters c
     WHERE c.story_id = p_story_id
       AND c.status = 'scheduled'
       AND c.deleted_at IS NULL
       AND c.scheduled_for > now()
       AND public.can_read_story(p_story_id)
$$;

REVOKE ALL ON FUNCTION public.next_chapter_at(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_chapter_at(uuid) TO anon, authenticated, service_role;

-- The scheduled-chapter lookup per story (the existing indexes cover status + scheduled_for across all stories).
CREATE INDEX idx_chapters_story_scheduled ON chapters (story_id, scheduled_for) WHERE status = 'scheduled';

COMMIT;
