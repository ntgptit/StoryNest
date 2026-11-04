-- "Someone replied to your comment" through the outbox (WBS WP 4.7).
--
--   trigger comments_emit_reply   AFTER INSERT of a reply (parent_comment_id set) writes the event `comment.replied` into
--                                 outbox_events in the same transaction as the comment, whatever path inserted it. The
--                                 dedupe key makes a second emission a no-op.
--   private.notify_comment_replied(reply_id)   the handler the worker calls. At-least-once delivery, so it is idempotent:
--                                 the notification has a per-recipient dedupe key and a retry creates nothing new.
--
-- Who is told: the author of the comment that was replied to. Nobody is told when
--   * the reply or the parent comment is gone, hidden or deleted by the time the worker runs,
--   * the replier is the parent's author (talking to yourself is not news),
--   * the parent's author no longer has an active account,
--   * the chapter is no longer published (the notification would lead nowhere).
-- The notification carries what the screen needs to word it and to link to the thread: the replier (actor), the story and
-- chapter titles and slugs, the paragraph the thread belongs to (if any) and a short excerpt of the reply.
--
-- Collaboration invitations (WP 3.8) keep inserting their notifications in the same transaction as the invitation: they
-- have no side effect outside the database, so an outbox hop would only delay them by up to a minute.
--
-- Rollback: DROP TRIGGER comments_emit_reply ON comments; DROP the two functions; restore handle_outbox_event from the
-- outbox migration.
BEGIN;

CREATE FUNCTION public.emit_comment_replied()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.outbox_events (event_type, aggregate_id, payload, dedupe_key)
    VALUES ('comment.replied', NEW.id,
            jsonb_build_object('chapter_id', NEW.chapter_id, 'parent_comment_id', NEW.parent_comment_id,
                               'replied_by', NEW.author_id),
            'comment.replied:' || NEW.id)
    ON CONFLICT (dedupe_key) DO NOTHING;
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.emit_comment_replied() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER comments_emit_reply AFTER INSERT ON comments
    FOR EACH ROW WHEN (NEW.parent_comment_id IS NOT NULL) EXECUTE FUNCTION public.emit_comment_replied();

-- Returns the number of notifications created (0 or 1).
CREATE FUNCTION private.notify_comment_replied(p_reply_id uuid) RETURNS integer
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_count integer;
BEGIN
    INSERT INTO public.notifications (recipient_id, actor_id, event_type, story_id, chapter_id, comment_id, payload, dedupe_key)
    SELECT parent.author_id, reply.author_id, 'comment_replied', s.id, c.id, reply.id,
           jsonb_build_object('story_title', s.title, 'story_slug', s.slug, 'chapter_title', v.title,
                              'chapter_slug', c.slug, 'chapter_sort_order', c.sort_order,
                              'block_id', reply.block_id, 'parent_comment_id', parent.id,
                              'excerpt', left(btrim(reply.body), 140)),
           'comment_replied:' || reply.id
      FROM public.comments reply
      JOIN public.comments parent ON parent.id = reply.parent_comment_id
      JOIN public.chapters c ON c.id = reply.chapter_id
      JOIN public.stories s ON s.id = c.story_id
      JOIN public.chapter_versions v ON v.id = c.published_version_id
      JOIN public.app_users u ON u.id = parent.author_id AND u.account_status = 'active' AND u.deleted_at IS NULL
     WHERE reply.id = p_reply_id
       AND reply.status = 'visible' AND reply.deleted_at IS NULL
       AND parent.status = 'visible' AND parent.deleted_at IS NULL
       AND parent.author_id IS DISTINCT FROM reply.author_id
       AND c.status = 'published' AND c.deleted_at IS NULL AND s.deleted_at IS NULL
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
        ELSE
            RAISE EXCEPTION 'unknown outbox event type "%"', p_event_type USING ERRCODE = '22023';
    END CASE;
END $$;

REVOKE ALL ON FUNCTION private.notify_comment_replied(uuid), private.handle_outbox_event(text, uuid, jsonb)
    FROM PUBLIC, anon, authenticated;

COMMIT;
