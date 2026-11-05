-- Per-type in-app notification preferences (Lucian 023 expanding notification settings).
--
-- Rollback:
--   DROP TABLE public.notification_preferences;
--   then restore public.notification_enabled(uuid, text) from 20261104001900_user_settings.sql (the group switches only).
--
-- The three switches of user_settings (notify_chapter_published, notify_comment_replied, notify_collaboration_answers)
-- stay the group switches. Under them, a reader can switch off a single event type of the notifications pipeline:
--
--   notification_preferences(user_id, event_type, in_app)   one row per switched type; no row means on
--
-- The types are exactly the ones the server writes today and a reader may mute: chapter_published (outbox worker),
-- comment_replied (outbox worker), collaboration_accepted and collaboration_declined (respond_invitation).
-- collaboration_invited is not in the list: an invitation addressed to the reader needs an answer and is always
-- delivered (BR of WP 6.3, unchanged). Only the in-app channel exists: there is no e-mail or push sender, so there is no
-- column for them.
--
-- Enforcement stays in one place: public.notification_enabled (used by the BEFORE INSERT trigger
-- notifications_respect_settings on notifications, whichever function creates the row) now requires the group switch
-- AND the type switch. A muted event is dropped at insert time, as before.
--
-- Access: a reader reads and writes only their own rows (RLS); updated_at is server-owned.
BEGIN;

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    event_type varchar(40) NOT NULL CHECK (event_type IN ('chapter_published', 'comment_replied',
                                                          'collaboration_accepted', 'collaboration_declined')),
    in_app boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, event_type)
);
CREATE TRIGGER notification_preferences_touch BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.notification_preferences TO authenticated;
-- UPDATE covers the key columns too because an upsert (PostgREST) sets every column it inserts; RLS keeps the row the
-- caller's own, and a valid type is all event_type can become.
GRANT INSERT (user_id, event_type, in_app), UPDATE (user_id, event_type, in_app)
    ON public.notification_preferences TO authenticated;
CREATE POLICY notification_preferences_own ON public.notification_preferences FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Same signature, same privileges (still not callable by clients): group switch AND type switch, both default on.
CREATE OR REPLACE FUNCTION public.notification_enabled(p_user_id uuid, p_event_type text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce((
        SELECT CASE p_event_type
                 WHEN 'chapter_published' THEN s.notify_chapter_published
                 WHEN 'comment_replied' THEN s.notify_comment_replied
                 WHEN 'collaboration_accepted' THEN s.notify_collaboration_answers
                 WHEN 'collaboration_declined' THEN s.notify_collaboration_answers
               END
          FROM public.user_settings s WHERE s.user_id = p_user_id), true)
       AND coalesce((
        SELECT p.in_app FROM public.notification_preferences p
         WHERE p.user_id = p_user_id AND p.event_type = p_event_type), true)
$$;

REVOKE ALL ON FUNCTION public.notification_enabled(uuid, text) FROM PUBLIC, anon, authenticated;

COMMIT;
