-- Announcements (Lucian 073 rolling banner at the top of every page, Lucian 311 event popup on the home page).
--
-- Rollback:
--   DROP FUNCTION public.active_announcements(text, text);
--   DROP TABLE public.announcements;
--
--   announcements                              one short message: a banner line or a popup card, with an optional link,
--                                              shown between starts_at and ends_at, to one interface language or to all
--   active_announcements(kind?, locale?)       what is showing right now (server clock), newest first, at most 20;
--                                              SECURITY INVOKER: it reads through the RLS below like a direct query
--
-- Access
--   * Guests and signed-in readers read an announcement only while it is active (starts_at <= now() < ends_at).
--     Scheduled and ended ones stay invisible to them, so nothing leaks before it starts.
--   * Moderators (JWT app_metadata.role = 'moderator', public.is_moderator(), the same rule as the moderation console)
--     with an active account read every announcement and are the only ones who create, change or delete them.
--   * created_by (which moderator wrote it) is set by the column default from auth.uid() and is not readable or
--     writable by clients; created_at / updated_at are server-owned too.
-- Content rules (CHECK): kind banner | popup; title 1 to 80 characters, body up to 280, link either an internal path
-- ("/..." but not "//...") or an https:// address (up to 500); locale vi | en or NULL for every language; ends_at after
-- starts_at. "Don't show today" is not stored here: it is a per-device choice kept in the browser.
BEGIN;

CREATE TABLE public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind varchar(12) NOT NULL CHECK (kind IN ('banner', 'popup')),
    title varchar(80) NOT NULL CHECK (length(btrim(title)) > 0),
    body varchar(280) CHECK (body IS NULL OR length(btrim(body)) > 0),
    link_url varchar(500) CHECK (link_url IS NULL OR link_url ~ '^/([^/\\]|$)' OR link_url ~ '^https://[^[:space:]]+$'),
    locale varchar(12) CHECK (locale IN ('vi', 'en')),
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz NOT NULL,
    created_by uuid DEFAULT auth.uid(),   -- plain id, no FK (like moderation_actions.actor_id)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);
CREATE INDEX idx_announcements_window ON public.announcements (ends_at, starts_at);
CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.announcements FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, kind, title, body, link_url, locale, starts_at, ends_at, created_at, updated_at)
    ON public.announcements TO anon, authenticated;
GRANT INSERT (kind, title, body, link_url, locale, starts_at, ends_at),
      UPDATE (kind, title, body, link_url, locale, starts_at, ends_at),
      DELETE
    ON public.announcements TO authenticated;

CREATE POLICY announcements_read ON public.announcements FOR SELECT
    USING ((starts_at <= now() AND ends_at > now()) OR (SELECT public.is_moderator()));
CREATE POLICY announcements_insert ON public.announcements FOR INSERT
    WITH CHECK ((SELECT public.is_moderator()) AND (SELECT public.is_active_account()));
CREATE POLICY announcements_update ON public.announcements FOR UPDATE
    USING ((SELECT public.is_moderator()) AND (SELECT public.is_active_account()))
    WITH CHECK ((SELECT public.is_moderator()) AND (SELECT public.is_active_account()));
CREATE POLICY announcements_delete ON public.announcements FOR DELETE
    USING ((SELECT public.is_moderator()) AND (SELECT public.is_active_account()));

CREATE FUNCTION public.active_announcements(p_kind text DEFAULT NULL, p_locale text DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    kind text,
    title text,
    body text,
    link_url text,
    locale text,
    starts_at timestamptz,
    ends_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
    SELECT a.id, a.kind::text, a.title::text, a.body::text, a.link_url::text, a.locale::text, a.starts_at, a.ends_at
      FROM public.announcements a
     WHERE a.starts_at <= now() AND a.ends_at > now()
       AND (p_kind IS NULL OR a.kind = p_kind)
       AND (p_locale IS NULL OR a.locale IS NULL OR a.locale = p_locale)
     ORDER BY a.starts_at DESC, a.id
     LIMIT 20
$$;

REVOKE ALL ON FUNCTION public.active_announcements(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_announcements(text, text) TO anon, authenticated, service_role;

COMMIT;
