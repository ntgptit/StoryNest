-- Story parts (volumes): a named group of chapters for the chapter manager tree and the reader's table of contents
-- (Lucian 102, batch 4 "authoring4").
--
--   story_parts(id, story_id, title, created_at, updated_at)   owned by the story team
--   chapters.part_id                                             optional; the part must belong to the same story
--
-- Reading order does not change: chapters.sort_order stays the only order (reader next/previous, table of contents,
-- reorder_chapters). A part labels the chapters assigned to it; screens show a part heading at the start of each run
-- of consecutive chapters in the same part. No publish, schedule or unpublish function reads part_id, so publishing
-- rules are unchanged, and readers still only ever see published chapters (a part with none is not shown to them).
--
-- Access (RLS + column grants; there is no RPC because every write is a plain row of the team's own data):
--   read            anyone who can read the story (can_read_story): part titles appear in the public contents.
--   insert          owner, co-author or editor of the story (story_role IS NOT NULL) with an active account; at most
--                   100 parts per story (trigger, under the story row lock so two inserts cannot both pass).
--   rename          owner, co-author or editor (title only; id, story_id and timestamps are not writable).
--   delete          owner or co-author; its chapters become ungrouped (ON DELETE SET NULL (part_id)), nothing else
--                   changes.
--   chapters.part_id  written by the team through the existing chapters_update policy (new column grant). The
--                   composite foreign key (part_id, story_id) makes a part of another story impossible.
-- Error contract: 42501 not allowed (grant/RLS), 23503 part of another story or unknown part, 23514 empty title,
-- PT409 too many parts.
--
-- Rollback:
--   REVOKE UPDATE (part_id) ON chapters FROM authenticated;
--   ALTER TABLE chapters DROP CONSTRAINT fk_chapter_part;
--   DROP INDEX idx_chapters_part;
--   ALTER TABLE chapters DROP COLUMN part_id;
--   DROP TABLE story_parts;            -- drops its policies and triggers
--   DROP FUNCTION private.limit_story_parts();
BEGIN;

CREATE TABLE story_parts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    title varchar(120) NOT NULL CHECK (length(btrim(title)) > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, story_id)
);
CREATE INDEX idx_story_parts_story ON story_parts (story_id, created_at);

ALTER TABLE chapters ADD COLUMN part_id uuid;
ALTER TABLE chapters ADD CONSTRAINT fk_chapter_part
    FOREIGN KEY (part_id, story_id) REFERENCES story_parts (id, story_id) ON DELETE SET NULL (part_id);
CREATE INDEX idx_chapters_part ON chapters (part_id) WHERE part_id IS NOT NULL;

CREATE TRIGGER story_parts_touch BEFORE UPDATE ON story_parts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE FUNCTION private.limit_story_parts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    PERFORM 1 FROM public.stories WHERE id = NEW.story_id FOR UPDATE;
    IF (SELECT count(*) FROM public.story_parts WHERE story_id = NEW.story_id) >= 100 THEN
        RAISE EXCEPTION 'a story can have at most 100 parts' USING ERRCODE = 'PT409';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.limit_story_parts() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER story_parts_limit BEFORE INSERT ON story_parts
    FOR EACH ROW EXECUTE FUNCTION private.limit_story_parts();

ALTER TABLE story_parts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON story_parts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON story_parts TO anon, authenticated;
GRANT INSERT (id, story_id, title), UPDATE (title), DELETE ON story_parts TO authenticated;

CREATE POLICY story_parts_read ON story_parts FOR SELECT USING (public.can_read_story(story_id));
CREATE POLICY story_parts_insert ON story_parts FOR INSERT
    WITH CHECK (public.story_role(story_id) IS NOT NULL AND public.is_active_account());
CREATE POLICY story_parts_update ON story_parts FOR UPDATE
    USING (public.story_role(story_id) IS NOT NULL) WITH CHECK (public.story_role(story_id) IS NOT NULL);
CREATE POLICY story_parts_delete ON story_parts FOR DELETE
    USING (public.story_role(story_id) IN ('owner', 'co_author'));

GRANT UPDATE (part_id) ON chapters TO authenticated;

COMMIT;
