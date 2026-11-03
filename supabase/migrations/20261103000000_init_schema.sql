-- Wattpad-like reading and publishing platform
-- PostgreSQL 15+; 25 tables, core features. Run in a clean database.
-- Application UUIDs may be generated client-side for offline synchronization.
-- Store book covers and chapter images in object storage, NOT bytea columns.
-- Security: all authorisation must also be enforced by the API / RLS policies.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 01. Accounts & author profiles. Optionally link id to auth.users(id) in Supabase.
CREATE TABLE app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username citext NOT NULL UNIQUE,
    display_name varchar(100) NOT NULL,
    bio text,
    avatar_storage_key text,
    account_status varchar(16) NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active','suspended','deactivated')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT chk_username CHECK (length(username::text) BETWEEN 3 AND 30
        AND lower(username::text) ~ '^[a-z0-9_]+$')
);

-- 02. Author-to-author follows.
CREATE TABLE user_follows (
    follower_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    followed_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
);

-- 03. Broad categories/genres (one primary category per story).
CREATE TABLE categories (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug varchar(80) NOT NULL UNIQUE,
    name varchar(120) NOT NULL,
    parent_id bigint REFERENCES categories(id) ON DELETE RESTRICT,
    sort_order integer NOT NULL DEFAULT 0
);

-- 04. Searchable tags (many per story).
CREATE TABLE tags (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug citext NOT NULL UNIQUE,
    display_name varchar(100) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 05. Story root. 'status' is creative completion state, visibility is ACL state.
CREATE TABLE stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    category_id bigint REFERENCES categories(id) ON DELETE SET NULL,
    slug varchar(120) NOT NULL,
    title varchar(200) NOT NULL,
    synopsis text NOT NULL DEFAULT '',
    cover_storage_key text,
    language_code varchar(12) NOT NULL DEFAULT 'vi',
    status varchar(16) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','ongoing','completed','hiatus')),
    visibility varchar(16) NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private','unlisted','public')),
    is_mature boolean NOT NULL DEFAULT false,
    first_published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (owner_id, slug),
    CHECK (length(btrim(title)) > 0),
    CHECK (length(btrim(slug)) > 0)
);

-- 06. Co-authors and editors. The story owner is always authoritative.
CREATE TABLE story_collaborators (
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    collaborator_role varchar(16) NOT NULL
        CHECK (collaborator_role IN ('co_author','editor')),
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (story_id, user_id)
);

-- 07. Story-tag intersection.
CREATE TABLE story_tags (
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    tag_id bigint NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    PRIMARY KEY (story_id, tag_id)
);

-- 08. Canonical chapter identity independent of revisions.
CREATE TABLE chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    slug varchar(120) NOT NULL,
    sort_order integer NOT NULL CHECK (sort_order > 0),
    status varchar(16) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','scheduled','published','archived')),
    scheduled_for timestamptz,
    published_version_id uuid,
    first_published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (story_id, slug),
    CONSTRAINT uq_chapter_position UNIQUE (story_id, sort_order) DEFERRABLE INITIALLY IMMEDIATE,
    UNIQUE (id, story_id),
    CHECK (status <> 'scheduled' OR scheduled_for IS NOT NULL),
    CHECK (status <> 'published' OR published_version_id IS NOT NULL)
);

-- 09. Permanent anchors for in-paragraph comments. Do not recycle block IDs.
CREATE TABLE chapter_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, chapter_id)
);

-- 10. Autosaved editor draft. Example body:
-- [{"block_id":"uuid","type":"paragraph","text":"...","marks":[]}, ...]
-- Persist chapter_blocks rows before using block_id in a published version.
CREATE TABLE chapter_drafts (
    chapter_id uuid PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
    title varchar(200) NOT NULL,
    body jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(body) = 'array'),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    updated_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Immutable publication snapshots (one per publication revision).
CREATE TABLE chapter_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    version_no integer NOT NULL CHECK (version_no > 0),
    title varchar(200) NOT NULL,
    word_count integer NOT NULL DEFAULT 0 CHECK (word_count >= 0),
    created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    UNIQUE (chapter_id, version_no),
    UNIQUE (id, chapter_id)
);

-- 12. Reading-optimised immutable snapshot blocks.
CREATE TABLE chapter_version_blocks (
    version_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    block_id uuid NOT NULL,
    sort_order integer NOT NULL CHECK (sort_order > 0),
    block_type varchar(16) NOT NULL DEFAULT 'paragraph'
        CHECK (block_type IN ('paragraph','heading','image','divider')),
    text_content text,
    rich_text jsonb,
    image_storage_key text,
    PRIMARY KEY (version_id, block_id),
    UNIQUE (version_id, sort_order),
    FOREIGN KEY (version_id, chapter_id)
        REFERENCES chapter_versions(id, chapter_id) ON DELETE CASCADE,
    FOREIGN KEY (block_id, chapter_id)
        REFERENCES chapter_blocks(id, chapter_id) ON DELETE RESTRICT,
    CHECK (
      (block_type IN ('paragraph','heading') AND text_content IS NOT NULL)
      OR (block_type = 'image' AND image_storage_key IS NOT NULL)
      OR (block_type = 'divider')
    )
);

-- Published pointer must reference a version of this SAME chapter.
ALTER TABLE chapters
    ADD CONSTRAINT fk_chapter_published_version
    FOREIGN KEY (published_version_id, id)
    REFERENCES chapter_versions(id, chapter_id)
    DEFERRABLE INITIALLY IMMEDIATE;

-- 13. Wattpad-style votes on story PARTS (chapters).
CREATE TABLE chapter_votes (
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, chapter_id)
);

-- 14. Comments can address a chapter or a stable paragraph/block.
CREATE TABLE comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    block_id uuid,
    parent_comment_id uuid,
    author_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    body text NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'visible'
        CHECK (status IN ('visible','hidden','deleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (id, chapter_id),
    FOREIGN KEY (block_id, chapter_id)
        REFERENCES chapter_blocks(id, chapter_id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_comment_id, chapter_id)
        REFERENCES comments(id, chapter_id) ON DELETE CASCADE,
    CHECK (length(btrim(body)) BETWEEN 1 AND 10000),
    CHECK (parent_comment_id IS NULL OR parent_comment_id <> id)
);

-- 15. Comment likes.
CREATE TABLE comment_likes (
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, comment_id)
);

-- 16. Follow a story to receive new-chapter notifications.
CREATE TABLE story_follows (
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, story_id)
);

-- 17. Private saved library is intentionally independent from story follows.
CREATE TABLE story_saves (
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    saved_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, story_id)
);

-- 18. Named user reading lists.
CREATE TABLE reading_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title varchar(120) NOT NULL,
    description text NOT NULL DEFAULT '',
    visibility varchar(12) NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private','unlisted','public')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(btrim(title)) > 0)
);

-- 19. A story may belong to many lists.
CREATE TABLE reading_list_items (
    reading_list_id uuid NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (reading_list_id, story_id)
);

-- 20. Fast 'Continue reading' at story level.
CREATE TABLE user_story_progress (
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    current_chapter_id uuid NOT NULL,
    last_read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, story_id),
    FOREIGN KEY (current_chapter_id, story_id)
        REFERENCES chapters(id, story_id) ON DELETE CASCADE
);

-- 21. Exact last paragraph and completion per chapter.
CREATE TABLE user_chapter_progress (
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    last_block_id uuid,
    last_version_id uuid,
    percent_complete numeric(5,2) NOT NULL DEFAULT 0
        CHECK (percent_complete BETWEEN 0 AND 100),
    completed_at timestamptz,
    last_read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, chapter_id),
    FOREIGN KEY (last_block_id, chapter_id)
        REFERENCES chapter_blocks(id, chapter_id) ON DELETE RESTRICT,
    FOREIGN KEY (last_version_id, chapter_id)
        REFERENCES chapter_versions(id, chapter_id) ON DELETE RESTRICT
);

-- 22. In-app notifications; dedupe_key enables idempotent event handling.
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    event_type varchar(40) NOT NULL,
    story_id uuid REFERENCES stories(id) ON DELETE SET NULL,
    chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
    comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key text,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (recipient_id, dedupe_key)
);

-- 23. Moderation reports with real FKs and exactly one target.
CREATE TABLE content_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    story_id uuid REFERENCES stories(id) ON DELETE RESTRICT,
    chapter_id uuid REFERENCES chapters(id) ON DELETE RESTRICT,
    comment_id uuid REFERENCES comments(id) ON DELETE RESTRICT,
    reported_user_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
    reason varchar(40) NOT NULL,
    description text,
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','reviewing','resolved','dismissed')),
    reviewed_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(story_id, chapter_id, comment_id, reported_user_id) = 1)
);

-- 24. Denormalized read model for discovery and rankings. Never the source of truth.
CREATE TABLE story_stats (
    story_id uuid PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
    reads bigint NOT NULL DEFAULT 0 CHECK (reads >= 0),
    votes bigint NOT NULL DEFAULT 0 CHECK (votes >= 0),
    comments bigint NOT NULL DEFAULT 0 CHECK (comments >= 0),
    followers bigint NOT NULL DEFAULT 0 CHECK (followers >= 0),
    saves bigint NOT NULL DEFAULT 0 CHECK (saves >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 25. Per-chapter counters.
CREATE TABLE chapter_stats (
    chapter_id uuid PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
    reads bigint NOT NULL DEFAULT 0 CHECK (reads >= 0),
    votes bigint NOT NULL DEFAULT 0 CHECK (votes >= 0),
    comments bigint NOT NULL DEFAULT 0 CHECK (comments >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Required before trigram indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Access patterns and pagination: predicates first, ordering columns last.
CREATE INDEX idx_user_follows_followed ON user_follows (followed_id, created_at DESC);
CREATE INDEX idx_stories_discover ON stories (language_code, category_id, updated_at DESC, id)
    WHERE visibility = 'public' AND deleted_at IS NULL AND status <> 'draft';
CREATE INDEX idx_stories_owner ON stories (owner_id, updated_at DESC);
CREATE INDEX idx_stories_category ON stories (category_id, updated_at DESC);
CREATE INDEX idx_story_tags_tag ON story_tags (tag_id, story_id);
CREATE INDEX idx_stories_title_trgm ON stories USING gin (title gin_trgm_ops);
CREATE INDEX idx_chapters_published ON chapters (story_id, sort_order, id)
    WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_chapter_versions_recent ON chapter_versions (chapter_id, version_no DESC);
CREATE INDEX idx_chapter_version_blocks_sort ON chapter_version_blocks (version_id, sort_order);
CREATE INDEX idx_chapter_votes_chapter ON chapter_votes (chapter_id, created_at DESC);
CREATE INDEX idx_comments_chapter ON comments (chapter_id, created_at DESC, id)
    WHERE status = 'visible';
CREATE INDEX idx_comments_block ON comments (block_id, created_at, id)
    WHERE block_id IS NOT NULL AND status = 'visible';
CREATE INDEX idx_comments_parent ON comments (parent_comment_id, created_at)
    WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_author ON comments (author_id, created_at DESC);
CREATE INDEX idx_comment_likes_comment ON comment_likes (comment_id);
CREATE INDEX idx_story_follows_story ON story_follows (story_id);
CREATE INDEX idx_story_saves_recent ON story_saves (user_id, saved_at DESC);
CREATE INDEX idx_reading_lists_user ON reading_lists (owner_id, created_at DESC);
CREATE INDEX idx_reading_list_items_order ON reading_list_items (reading_list_id, sort_order, added_at);
CREATE INDEX idx_user_story_progress_recent ON user_story_progress (user_id, last_read_at DESC);
CREATE INDEX idx_user_chapter_progress_recent ON user_chapter_progress (user_id, last_read_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (recipient_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_content_reports_queue ON content_reports (status, created_at);
CREATE INDEX idx_story_stats_ranking ON story_stats (votes DESC, reads DESC);

-- Automatically maintain updated_at on mutable entities.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
CREATE TRIGGER app_users_touch BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER stories_touch BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER chapters_touch BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER chapter_drafts_touch BEFORE UPDATE ON chapter_drafts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER comments_touch BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER reading_lists_touch BEFORE UPDATE ON reading_lists FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Published chapter versions and blocks are immutable. This trigger protects snapshots
-- after their published_at is set (including older, superseded versions).
CREATE OR REPLACE FUNCTION deny_published_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.published_at IS NOT NULL THEN
        RAISE EXCEPTION 'Published chapter version % is immutable', OLD.id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER chapter_version_immutable
    BEFORE UPDATE OR DELETE ON chapter_versions FOR EACH ROW
    EXECUTE FUNCTION deny_published_version_mutation();

CREATE OR REPLACE FUNCTION deny_published_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
    v_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.version_id ELSE OLD.version_id END;
    IF EXISTS (SELECT 1 FROM chapter_versions WHERE id = v_id AND published_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Blocks of published chapter version % are immutable', v_id;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.version_id <> OLD.version_id THEN
        RAISE EXCEPTION 'Moving snapshot blocks between versions is not allowed';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER chapter_version_blocks_immutable
    BEFORE INSERT OR UPDATE OR DELETE ON chapter_version_blocks FOR EACH ROW
    EXECUTE FUNCTION deny_published_block_mutation();

COMMIT;

-- IMPORTANT PUBLISHING TRANSACTION (API / service responsibility):
-- 1. Authorize owner/co_author/editor; lock chapters row FOR UPDATE.
-- 2. Validate chapter_drafts.body and referenced chapter_blocks.
-- 3. Create chapter_versions snapshot with published_at NULL.
-- 4. Insert chapter_version_blocks in intended order.
-- 5. Set chapter_versions.published_at = now().
-- 6. Set chapters.published_version_id, status='published', first_published_at.
-- 7. Enqueue notifications and statistics job after commit (outbox preferred).
-- 8. Published versions/blocks cannot be modified; create a NEW version to edit.
-- SECURITY NOTE: permissions / RLS not included: they depend on auth architecture.
-- SCALE NOTE: implement reads with deduped tracking/events, not a counter increment
-- on every UI refresh; snapshots of stats should be maintained asynchronously.
