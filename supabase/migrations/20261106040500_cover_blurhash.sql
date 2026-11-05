-- Blur-up cover loading (Lucian 258, batch 4 "authoring4").
--
--   stories.cover_blurhash text   a BlurHash (https://blurha.sh, base 83) of the cover, about 30 characters
--
-- The client computes it from the cropped picture at upload (no server image processing, no new service) and writes
-- it together with cover_storage_key through the existing cover update path (stories_update: owner or co-author,
-- column grant). Readers paint it as a blurred placeholder and fade the real cover in over it.
--
-- Validation (CHECK chk_story_cover_blurhash): only base-83 characters, 6..100 characters, and exactly the length its
-- first character (the component counts, 1..9 x 1..9) announces: 4 + 2 x components. Anything else is 23514.
-- A cover change that does not send a new hash clears the old one (trigger), so a placeholder never belongs to a
-- different picture; removing the cover clears it too.
--
-- Rollback:
--   REVOKE INSERT (cover_blurhash), UPDATE (cover_blurhash) ON stories FROM authenticated;
--   DROP TRIGGER stories_cover_blurhash ON stories; DROP FUNCTION private.clear_stale_cover_blurhash();
--   ALTER TABLE stories DROP COLUMN cover_blurhash;
BEGIN;

-- Written out inline (no function call) so the CHECK needs no extra privilege for the writing role.
ALTER TABLE stories ADD COLUMN cover_blurhash text
    CONSTRAINT chk_story_cover_blurhash CHECK (
        cover_blurhash IS NULL OR (
            char_length(cover_blurhash) BETWEEN 6 AND 100
            AND cover_blurhash ~ '^[0-9A-Za-z#$%*+,.:;=?@^_{|}~\[\]-]+$'
            AND strpos('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~', left(cover_blurhash, 1)) BETWEEN 1 AND 81
            AND char_length(cover_blurhash) = 4 + 2
                * (((strpos('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~', left(cover_blurhash, 1)) - 1) % 9) + 1)
                * (((strpos('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~', left(cover_blurhash, 1)) - 1) / 9) + 1)));

CREATE FUNCTION private.clear_stale_cover_blurhash() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.cover_storage_key IS DISTINCT FROM OLD.cover_storage_key
       AND NEW.cover_blurhash IS NOT DISTINCT FROM OLD.cover_blurhash THEN
        NEW.cover_blurhash := NULL;
    END IF;
    IF NEW.cover_storage_key IS NULL THEN
        NEW.cover_blurhash := NULL;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.clear_stale_cover_blurhash() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stories_cover_blurhash BEFORE UPDATE OF cover_storage_key, cover_blurhash ON stories
    FOR EACH ROW EXECUTE FUNCTION private.clear_stale_cover_blurhash();

GRANT INSERT (cover_blurhash), UPDATE (cover_blurhash) ON stories TO authenticated;

COMMIT;
