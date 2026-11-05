-- Weekly update schedule: the days a story usually gets a new chapter ("updates on Mon and Thu"), set in the story
-- form and shown on the story page (Lucian 109, batch 4 "authoring4").
--
--   stories.update_days smallint   bit mask of ISO weekdays: bit 0 = Monday ... bit 6 = Sunday; 0 = no schedule.
--
-- It is a promise the author makes to readers, not a rule: nothing is published or scheduled from it.
-- Access: readable wherever the story is (stories_read, the existing table-level SELECT); writable by the owner and
-- co-authors only, through the existing stories_update policy plus a column grant (editors cannot update stories);
-- a new story may set it at creation (stories_insert: the owner).
-- Error contract: 23514 (check violation) for a value outside 0..127.
--
-- Rollback:
--   REVOKE INSERT (update_days), UPDATE (update_days) ON stories FROM authenticated;
--   ALTER TABLE stories DROP COLUMN update_days;
BEGIN;

ALTER TABLE stories ADD COLUMN update_days smallint NOT NULL DEFAULT 0
    CONSTRAINT chk_story_update_days CHECK (update_days BETWEEN 0 AND 127);

GRANT INSERT (update_days), UPDATE (update_days) ON stories TO authenticated;

COMMIT;
