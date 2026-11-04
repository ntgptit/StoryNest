-- Live notifications (WBS WP 4.6): publish INSERTs of `notifications` to Supabase Realtime.
--
-- Realtime sends a change only to a subscriber who may read the row, using the subscriber's own JWT and the table's RLS
-- (`notifications_own_read`: recipient_id = auth.uid()). So the signed-in reader's channel, filtered on their id, receives
-- their notifications and nobody else's.
--
-- The publication `supabase_realtime` exists on Supabase; the throwaway verification database does not have it, so the
-- statement is conditional. Running it twice is harmless.
--
-- Rollback: ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

COMMIT;
