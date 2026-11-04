-- Reader preferences per account (WBS WP 2.7): font size, line spacing, font and background of the chapter reader.
-- The device keeps its own copy in localStorage (instant, works for guests); this table lets a signed-in reader find the
-- same settings on another device.
--
-- Private to the owner: RLS lets a user read and write only their own row. The JSON shape is validated by the client
-- schema (readerPreferencesSchema in @storynest/validation, which falls back to defaults for anything unknown); the
-- database only guarantees it is a small JSON object so the column cannot be used as free storage.
--
-- Rollback: DROP TABLE user_reader_preferences;
BEGIN;

CREATE TABLE user_reader_preferences (
    user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(preferences) = 'object' AND octet_length(preferences::text) <= 512),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_reader_preferences_touch BEFORE UPDATE ON user_reader_preferences
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE user_reader_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_reader_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON user_reader_preferences TO authenticated;
-- UPDATE includes user_id because an upsert (INSERT .. ON CONFLICT DO UPDATE) sets every column it was given; RLS
-- (USING + WITH CHECK on user_id = auth.uid()) is what stops a row from being moved to another user.
GRANT INSERT (user_id, preferences), UPDATE (user_id, preferences) ON user_reader_preferences TO authenticated;
CREATE POLICY user_reader_preferences_own ON user_reader_preferences FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

COMMIT;
