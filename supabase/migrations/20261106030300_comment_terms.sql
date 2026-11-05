-- What readers say, month by month (Lucian 399, review word cloud): the most frequent terms of a story's comments.
--
-- Rollback:
--   DROP FUNCTION public.author_comment_terms(uuid, integer, integer);
--   DROP FUNCTION public.comment_tokens(text);
--   DROP TABLE public.term_stopwords;
--
--   term_stopwords                     words never counted (Vietnamese and English function words, URL pieces).
--                                      RLS on, no policy, no grant: edited by an administrator (SQL / service role).
--   comment_tokens(text) -> setof text the terms of one text: lower-cased (ASCII by lower(), Vietnamese capitals by
--                                      an explicit map, NFC first), split on whitespace, ASCII punctuation and
--                                      digits, typographic quotes and dashes trimmed, 2 to 30 characters, stopwords
--                                      removed. Pure; not granted to API roles.
--   author_comment_terms(story_id, months, limit)
--                                      per UTC calendar month of the last `months` months (1 to 12, default 3, this
--                                      month included), the top `limit` terms (1 to 50, default 30):
--                                        month, term, mentions (comments that contain the term), commenters
--                                        (distinct authors of those comments), rank_position (1 = most mentioned)
--
-- Only visible comments (status 'visible', not deleted) of the story's chapters count, so a hidden or removed comment
-- never shows up. No comment text, comment id or author id is returned: only terms and counts. A term must come from
-- at least two different commenters to be listed, so a word only one person wrote (a name, a phrase of their own)
-- cannot be read back from the cloud. Vietnamese is split by syllable ("chương", "hay"), which is what a simple
-- tokeniser can do without a dictionary.
-- Encoding: Supabase databases are UTF-8. On a non-UTF-8 test cluster (SQL_ASCII), normalisation and the Vietnamese
-- capital map are skipped (they need characters, not bytes) and only ASCII letters are lower-cased.
-- Who: the owner and the co-authors (private.story_audience_gate).
-- Cost: tokenises every visible comment of the story in the window on each call (comments are bounded by the abuse
-- limits); cache on the client.
-- Error contract: 42501 not allowed, PT404 story not found (or not manageable by the caller), 22023 months / limit out
-- of range.
BEGIN;

CREATE TABLE public.term_stopwords (
    term text PRIMARY KEY CHECK (term = btrim(term) AND length(term) BETWEEN 1 AND 30)
);
ALTER TABLE public.term_stopwords ENABLE ROW LEVEL SECURITY;   -- no policy, no grant: administrator only
REVOKE ALL ON public.term_stopwords FROM PUBLIC, anon, authenticated;

INSERT INTO public.term_stopwords (term)
SELECT DISTINCT unnest(ARRAY[
    -- Vietnamese function words, pronouns, particles
    'và', 'là', 'của', 'có', 'không', 'ko', 'k', 'thì', 'mà', 'này', 'đó', 'đây', 'kia', 'cho', 'với', 'được', 'đc',
    'một', 'những', 'các', 'cái', 'con', 'rất', 'quá', 'lắm', 'nhé', 'nha', 'nhỉ', 'ạ', 'ơi', 'à', 'ừ', 'ừm', 'thế',
    'vậy', 'như', 'khi', 'đã', 'đang', 'sẽ', 'bị', 'ra', 'vào', 'lên', 'xuống', 'trong', 'ngoài', 'nữa', 'cũng', 'vẫn',
    'còn', 'chỉ', 'hơn', 'nhất', 'đến', 'tới', 'từ', 'tôi', 'mình', 'bạn', 'em', 'anh', 'chị', 'ta', 'tao', 'mày', 'nó',
    'họ', 'ai', 'gì', 'sao', 'nào', 'đâu', 'ở', 'về', 'hả', 'hở', 'thôi', 'luôn', 'lại', 'đi', 'nhưng', 'nếu', 'vì',
    'nên', 'để', 'thật', 'ơ', 'ờ', 'nhiều', 'ít', 'rồi', 'chưa', 'mới', 'cả', 'mọi', 'người', 'làm', 'thấy', 'biết',
    -- ("hay" is kept on purpose: in comments it is mostly "good", the most common praise, not "or")
    'muốn', 'phải', 'bao', 'giờ', 'lúc', 'nhà', 'chứ', 'hoặc', 'bởi', 'theo', 'trên', 'dưới', 'sau', 'trước',
    -- English function words
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'to', 'of', 'in', 'on',
    'at', 'for', 'with', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'my',
    'your', 'his', 'her', 'our', 'their', 'me', 'him', 'us', 'them', 'so', 'not', 'no', 'yes', 'just', 'very', 'too',
    'really', 'what', 'when', 'how', 'why', 'who', 'which', 'there', 'here', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'can', 'could', 'should', 'all', 'any', 'some', 'more', 'most', 'from', 'by', 'as', 'if', 'then',
    'than', 'about', 'up', 'out', 'im', 'its', 'dont', 'cant', 'one', 'also', 'get', 'got', 'like', 'lol', 'oh',
    -- pieces of links
    'http', 'https', 'www', 'com', 'vn', 'net', 'org', 'html'
]);

CREATE FUNCTION public.comment_tokens(p_text text)
RETURNS SETOF text
LANGUAGE sql STABLE PARALLEL SAFE SET search_path = '' AS $$
    WITH prepared AS (
        SELECT CASE WHEN current_setting('server_encoding') = 'UTF8'
                    THEN translate(lower(normalize(p_text, NFC)),
                                   'ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
                                   'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ')
                    ELSE lower(p_text) END AS body),
    pieces AS (
        -- Whitespace, ASCII punctuation (! to @, [ to `, { to ~, which includes the digits) separate terms.
        SELECT CASE WHEN current_setting('server_encoding') = 'UTF8' THEN btrim(piece, '“”‘’«»…–—·') ELSE piece END AS term
          FROM prepared, regexp_split_to_table(prepared.body, '[[:space:]!-@\[-`{-~]+') AS piece)
    SELECT p.term
      FROM pieces p
     WHERE char_length(p.term) BETWEEN 2 AND 30
       AND NOT EXISTS (SELECT 1 FROM public.term_stopwords s WHERE s.term = p.term)
$$;
REVOKE ALL ON FUNCTION public.comment_tokens(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.author_comment_terms(p_story_id uuid, p_months integer DEFAULT 3, p_limit integer DEFAULT 30)
RETURNS TABLE (month date, term text, mentions bigint, commenters bigint, rank_position integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_first date;
BEGIN
    PERFORM private.story_audience_gate(p_story_id);
    IF p_months IS NULL OR p_months NOT BETWEEN 1 AND 12 THEN
        RAISE EXCEPTION 'months must be between 1 and 12' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'limit must be between 1 and 50' USING ERRCODE = '22023';
    END IF;
    v_first := (date_trunc('month', timezone('UTC', clock_timestamp())) - make_interval(months => p_months - 1))::date;

    RETURN QUERY
    WITH visible AS (
        SELECT m.id, m.author_id, date_trunc('month', timezone('UTC', m.created_at))::date AS month, m.body
          FROM public.chapters c
          JOIN public.comments m ON m.chapter_id = c.id
         WHERE c.story_id = p_story_id AND c.deleted_at IS NULL
           AND m.status = 'visible' AND m.deleted_at IS NULL
           AND m.created_at >= v_first::timestamp AT TIME ZONE 'UTC'),
    hits AS (
        -- DISTINCT: a word repeated inside one comment is one mention.
        SELECT DISTINCT v.month, v.id, v.author_id, t.term
          FROM visible v CROSS JOIN LATERAL public.comment_tokens(v.body) AS t(term)),
    counted AS (
        SELECT h.month, h.term, count(*) AS mentions, count(DISTINCT h.author_id) AS commenters
          FROM hits h GROUP BY h.month, h.term
        HAVING count(DISTINCT h.author_id) >= 2),
    ranked AS (
        SELECT k.*, row_number() OVER (PARTITION BY k.month ORDER BY k.mentions DESC, k.commenters DESC, k.term) AS pos
          FROM counted k)
    SELECT r.month, r.term, r.mentions, r.commenters, r.pos::integer
      FROM ranked r
     WHERE r.pos <= p_limit
     ORDER BY r.month, r.pos;
END $$;

REVOKE ALL ON FUNCTION public.author_comment_terms(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_comment_terms(uuid, integer, integer) TO authenticated;

COMMIT;
