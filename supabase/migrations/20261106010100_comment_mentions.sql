-- "Someone mentioned you in a comment" (Lucian 268, batch 4 · community4), through the outbox like comment_replied.
--
-- Rollback (exact statements, in this order):
--   DROP TRIGGER comments_emit_mentions ON public.comments;
--   DROP FUNCTION public.emit_comment_mentioned();
--   -- restore private.handle_outbox_event from 20261104001100 and public.notification_enabled from 20261104001900, then:
--   DROP FUNCTION private.notify_comment_mentioned(uuid);
--   DROP FUNCTION public.comment_mentioned_usernames(text);
--   DELETE FROM public.abuse_limits WHERE code = 'comment_max_mentions';
--
-- A mention is `@username` in the text of a NEW comment (or reply): an @ at the start or after a character that is not a
-- letter, digit, underscore or @, then 3 to 30 of [A-Za-z0-9_] (the username rule of app_users), not followed by another
-- such character. So `a@b.com`-style text is not a mention. Case is ignored (username is citext).
--
--   trigger comments_emit_mentions      AFTER INSERT of a comment whose text contains a possible mention writes the
--                                       event `comment.mentioned` into outbox_events (dedupe key per comment), whatever
--                                       path inserted it. Edits never notify (no trigger on UPDATE): changing a comment
--                                       cannot be used to ping people again.
--   private.notify_comment_mentioned(comment_id)   the worker's handler; idempotent (per-recipient dedupe key).
--   comment_mentioned_usernames(text)   the distinct names, in order of appearance, capped by abuse_limits row
--                                       comment_max_mentions (10): later names are ignored, the comment still posts.
--
-- Who is told: every mentioned account that exists, is active and not deleted, is not the comment's author, and can read
-- the chapter (published chapter of a public / unlisted, non-draft, non-deleted story, or the recipient owns or
-- collaborates on the story). Nobody is told when the comment is gone, hidden or deleted by the time the worker runs.
-- The author of the parent comment of a reply is skipped: they already get comment_replied for the same reply (one
-- notification per event, not two).
-- Settings: comment_mentioned follows the existing "replies to my comments" switch (notify_comment_replied); the
-- notifications_respect_settings trigger drops it when that switch is off. A suspended author cannot comment at all,
-- so cannot mention. There is no user-block feature in the schema yet; when one arrives, this handler is the one place
-- to add "skip when the recipient blocked the author".
-- Clients never write notifications: the handler runs inside the worker (service role).
BEGIN;

INSERT INTO public.abuse_limits (code, max_value, window_seconds, note) VALUES
    ('comment_max_mentions', 10, NULL, 'people one comment can notify by @mention');

CREATE FUNCTION public.comment_mentioned_usernames(p_body text)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT coalesce(array_agg(n.name ORDER BY n.first_at), ARRAY[]::text[])
      FROM (SELECT lower(m.name) AS name, min(m.ord) AS first_at
              FROM regexp_matches(coalesce(p_body, ''), '(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,30})(?![A-Za-z0-9_])', 'g')
                   WITH ORDINALITY AS r(parts, ord)
                   CROSS JOIN LATERAL (SELECT r.parts[2] AS name, r.ord) m
             GROUP BY lower(m.name)
             ORDER BY min(m.ord)
             LIMIT coalesce((SELECT max_value FROM public.abuse_limits WHERE code = 'comment_max_mentions'), 10)) n
$$;

REVOKE ALL ON FUNCTION public.comment_mentioned_usernames(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.emit_comment_mentioned()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF cardinality(public.comment_mentioned_usernames(NEW.body)) > 0 THEN
        INSERT INTO public.outbox_events (event_type, aggregate_id, payload, dedupe_key)
        VALUES ('comment.mentioned', NEW.id,
                jsonb_build_object('chapter_id', NEW.chapter_id, 'mentioned_by', NEW.author_id),
                'comment.mentioned:' || NEW.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.emit_comment_mentioned() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER comments_emit_mentions AFTER INSERT ON public.comments
    FOR EACH ROW WHEN (NEW.body LIKE '%@%') EXECUTE FUNCTION public.emit_comment_mentioned();

-- Returns the number of notifications created.
CREATE FUNCTION private.notify_comment_mentioned(p_comment_id uuid) RETURNS integer
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_count integer;
BEGIN
    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, chapter_id, comment_id, payload, dedupe_key)
    SELECT u.id, cm.author_id, 'comment_mentioned', s.id, c.id, cm.id,
           jsonb_build_object('story_title', s.title, 'story_slug', s.slug, 'chapter_title', v.title,
                              'chapter_slug', c.slug, 'chapter_sort_order', c.sort_order,
                              'block_id', cm.block_id, 'parent_comment_id', cm.parent_comment_id,
                              'excerpt', left(btrim(cm.body), 140)),
           'comment_mentioned:' || cm.id
      FROM public.comments cm
      JOIN public.chapters c ON c.id = cm.chapter_id
      JOIN public.stories s ON s.id = c.story_id
      JOIN public.chapter_versions v ON v.id = c.published_version_id
      CROSS JOIN LATERAL unnest(public.comment_mentioned_usernames(cm.body)) AS name
      JOIN public.app_users u ON u.username OPERATOR(extensions.=) name::extensions.citext
     WHERE cm.id = p_comment_id
       AND cm.status = 'visible' AND cm.deleted_at IS NULL
       AND c.status = 'published' AND c.deleted_at IS NULL AND s.deleted_at IS NULL
       AND u.account_status = 'active' AND u.deleted_at IS NULL
       AND u.id <> cm.author_id
       AND NOT EXISTS (SELECT 1 FROM public.comments p
                        WHERE p.id = cm.parent_comment_id AND p.author_id = u.id)
       AND ((s.visibility IN ('public', 'unlisted') AND s.status <> 'draft')
            OR s.owner_id = u.id
            OR EXISTS (SELECT 1 FROM public.story_collaborators sc WHERE sc.story_id = s.id AND sc.user_id = u.id))
    ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION private.handle_outbox_event(p_event_type text, p_aggregate_id uuid, p_payload jsonb) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    CASE p_event_type
        WHEN 'chapter.published' THEN
            PERFORM private.notify_chapter_published(p_aggregate_id, (p_payload ->> 'published_by')::uuid);
        WHEN 'comment.replied' THEN
            PERFORM private.notify_comment_replied(p_aggregate_id);
        WHEN 'comment.mentioned' THEN
            PERFORM private.notify_comment_mentioned(p_aggregate_id);
        ELSE
            RAISE EXCEPTION 'unknown outbox event type "%"', p_event_type USING ERRCODE = '22023';
    END CASE;
END $$;

REVOKE ALL ON FUNCTION private.notify_comment_mentioned(uuid), private.handle_outbox_event(text, uuid, jsonb)
    FROM PUBLIC, anon, authenticated;

-- Mentions share the "replies to my comments" switch.
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
$$;

COMMIT;
