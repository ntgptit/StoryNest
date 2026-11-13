-- FP-013 (safety): a notification must not keep quoting a comment that was hidden or deleted afterwards.
--
-- Reply and mention notifications carry a 140-character excerpt of the comment in `payload`. When the comment leaves
-- "visible" (hidden by the author of the story, a moderator, or deleted), the excerpt is removed from every
-- notification about it; the rest of the notification stays, so the recipient still learns that something happened.
-- Restoring the comment does not bring the excerpt back (it is not stored anywhere else). A one-time clean-up
-- removes the excerpts that already outlived their comment.
--
-- Rollback: DROP TRIGGER comments_blank_notification_excerpt ON public.comments;
--           DROP FUNCTION public.blank_notification_excerpt();
BEGIN;

CREATE FUNCTION public.blank_notification_excerpt()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE public.notifications
       SET payload = payload - 'excerpt'
     WHERE comment_id = NEW.id AND payload ? 'excerpt';
    RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.blank_notification_excerpt() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_blank_notification_excerpt AFTER UPDATE OF status, deleted_at ON public.comments
    FOR EACH ROW
    WHEN ((OLD.status = 'visible' AND NEW.status <> 'visible') OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL))
    EXECUTE FUNCTION public.blank_notification_excerpt();

-- Excerpts that already outlived their comment.
UPDATE public.notifications n
   SET payload = n.payload - 'excerpt'
  FROM public.comments c
 WHERE c.id = n.comment_id AND n.payload ? 'excerpt' AND (c.status <> 'visible' OR c.deleted_at IS NOT NULL);

COMMIT;
