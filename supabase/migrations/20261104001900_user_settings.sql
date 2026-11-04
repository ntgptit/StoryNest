-- Account settings that follow the reader to every device (WBS WP 6.3): language, adult-content choice, which in-app
-- notifications to receive. (Reading preferences keep their own table, user_reader_preferences, from WP 2.7.)
--
--   user_settings        one row per account, created on first save; no row means the defaults below
--   notification_enabled(user, event_type) -> boolean   SECURITY DEFINER, not callable by clients
--   trigger notifications_respect_settings              the single place that drops a notification the recipient
--                                                       switched off, whichever function created it
--
-- Adult content: show_mature may be true only together with age_confirmed (CHECK), the same rule the device copy
-- enforces. There is no age verification beyond the reader's own confirmation.
-- Notifications: three switches, all on by default: new chapters of followed stories, replies to my comments, and the
-- answers to the invitations I sent. Invitations addressed TO me are always delivered (they need an answer). The
-- push/e-mail channels are not built yet (push: WP 6.7); their switches arrive with them.
-- A switched-off event is dropped at insert time: nothing is stored, nothing is shown later when it is switched on again.
--
-- Access: a user reads and writes only their own row (RLS). Rollback: DROP TRIGGER notifications_respect_settings ON
-- notifications; DROP the function; DROP TABLE user_settings.
BEGIN;

CREATE TABLE public.user_settings (
    user_id uuid PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
    language_code varchar(12) NOT NULL DEFAULT 'vi' CHECK (language_code IN ('vi', 'en')),
    age_confirmed boolean NOT NULL DEFAULT false,
    show_mature boolean NOT NULL DEFAULT false,
    notify_chapter_published boolean NOT NULL DEFAULT true,
    notify_comment_replied boolean NOT NULL DEFAULT true,
    notify_collaboration_answers boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (NOT show_mature OR age_confirmed)
);
CREATE TRIGGER user_settings_touch BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.user_settings TO authenticated;
GRANT INSERT (user_id, language_code, age_confirmed, show_mature, notify_chapter_published,
              notify_comment_replied, notify_collaboration_answers),
      UPDATE (user_id, language_code, age_confirmed, show_mature, notify_chapter_published,
              notify_comment_replied, notify_collaboration_answers)
    ON public.user_settings TO authenticated;
CREATE POLICY user_settings_own ON public.user_settings FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.notification_enabled(p_user_id uuid, p_event_type text)
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
$$;

REVOKE ALL ON FUNCTION public.notification_enabled(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.drop_switched_off_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF public.notification_enabled(NEW.recipient_id, NEW.event_type) THEN
        RETURN NEW;
    END IF;
    RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.drop_switched_off_notification() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notifications_respect_settings BEFORE INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.drop_switched_off_notification();

COMMIT;
