-- Merge of two batch-4 definitions of public.notification_enabled (Lucian 268 mentions + Lucian 023 per-type settings).
--
-- 20261106010100_comment_mentions.sql added `comment_mentioned` (governed by the replies group switch) and
-- 20261106050100_notification_preferences.sql later replaced the whole function to add the per-type switch, written
-- without the mention branch. Applied in timestamp order, the CASE then had no branch for mentions, returned NULL,
-- and coalesce(..., true) let a mention through even when the recipient had switched replies off (caught by
-- supabase/tests/360_comment_mentions.test.sql).
-- This restores the intended rule: a notification is delivered when its group switch AND its own per-type switch
-- (if the type has one) are on; mentions follow the "Replies and mentions" group and have no per-type switch.
--
-- Rollback: re-run the CREATE OR REPLACE from 20261106050100_notification_preferences.sql (mentions then lose
-- their group mapping again), or drop the mention feature with the rollback of 20261106010100.

CREATE OR REPLACE FUNCTION public.notification_enabled(p_user_id uuid, p_event_type text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce((
        SELECT CASE p_event_type
                 WHEN 'chapter_published' THEN s.notify_chapter_published
                 WHEN 'comment_replied' THEN s.notify_comment_replied
                 WHEN 'comment_mentioned' THEN s.notify_comment_replied
                 WHEN 'collaboration_accepted' THEN s.notify_collaboration_answers
                 WHEN 'collaboration_declined' THEN s.notify_collaboration_answers
               END
          FROM public.user_settings s WHERE s.user_id = p_user_id), true)
       AND coalesce((
        SELECT p.in_app FROM public.notification_preferences p
         WHERE p.user_id = p_user_id AND p.event_type = p_event_type), true)
$$;

-- CREATE OR REPLACE keeps the existing privileges; restated so this migration is self-describing.
REVOKE ALL ON FUNCTION public.notification_enabled(uuid, text) FROM PUBLIC, anon, authenticated;
