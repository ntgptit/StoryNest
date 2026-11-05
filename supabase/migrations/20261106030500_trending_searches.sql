-- Trending searches (Lucian 322, rolling trending searches): an anonymous count of search terms and a public top list
-- with rank changes.
--
-- Rollback:
--   DROP FUNCTION public.purge_search_log();
--   DROP FUNCTION public.trending_searches(integer);
--   DROP FUNCTION public.log_search(text, uuid);
--   DROP TABLE public.search_term_blocklist, public.search_log_quota, public.search_log_seen, public.search_term_daily;
--   DELETE FROM public.abuse_limits WHERE code = 'search_log_rate_hour';
--
-- Tables (all: RLS on, no policy, no grant to anon / authenticated; reached only through the functions):
--   search_term_daily(term, day, searchers)   how many different searchers searched the normalised term on a UTC day.
--                                             Holds no user, no id, no time finer than the day.
--   search_log_seen(key, day)                 sha256(searcher, term, day): makes a second search of the same term by the
--                                             same searcher on the same day count nothing. One-way, purged after a day.
--   search_log_quota(key, window_start, used) sha256(searcher, hour) and a counter, for the rate limit. Holds no term.
--   search_term_blocklist(term)               terms a moderator / administrator never wants listed (edited with SQL).
--
-- Never who searched: no table stores a user id or an anonymous id in clear, and no table links a term to a searcher
-- except through a salted-by-day hash in search_log_seen, which is deleted the day after (purge_search_log). The three
-- tables share no key, so the quota (who searched how often) cannot be joined to the terms.
--
--   log_search(query, anon_id?) -> boolean    anon + authenticated, SECURITY DEFINER. Counts one search of the
--       normalised query (search_normalize, spaces collapsed, 3 to 100 characters like search_stories) for the caller
--       (auth.uid(), else the client's anonymous id, as record_chapter_read). Returns true when it was counted, false
--       when it was not: a repeat by the same searcher today, or a term that finds no public story, tag or author (so
--       random text, a phone number or a person's name that is not an author never enters the log).
--       Rate limit: abuse_limits 'search_log_rate_hour' (30 calls per searcher per hour, repeats included) -> PT429.
--   trending_searches(limit) -> (term, searchers, rank_position, previous_rank, rank_change)   anon + authenticated
--       Top `limit` (1 to 20, default 10) terms of the last 7 UTC days (today included) by searchers, ties by term.
--       previous_rank is the term's place over the 7 days before (NULL = new in the list); rank_change =
--       previous_rank - rank_position (positive = climbed). A term needs at least 3 searchers in a window to be ranked
--       in it, so one person cannot put a word on the public list. Blocklisted terms are skipped.
--   purge_search_log() -> integer             service_role: deletes seen keys older than yesterday, quota windows
--       older than two hours and daily counts older than 60 days. Not scheduled here; run it daily, e.g.
--       SELECT cron.schedule('storynest-purge-search-log', '23 4 * * *', 'SELECT public.purge_search_log()');
--
-- Limits worth knowing: like reads, an anonymous id is client-chosen, so a script inventing ids can still push a term;
-- the 3-searcher floor, the per-id quota and the "must find something public" rule keep that to terms that already
-- match public content, and the blocklist removes anything unwanted at once.
-- Error contract: 22023 query too short / too long, no signed-in user and no anonymous id, limit out of range;
-- PT429 rate limit (HINT = the limit's code).
BEGIN;

INSERT INTO public.abuse_limits (code, max_value, window_seconds, note)
VALUES ('search_log_rate_hour', 30, 3600, 'logged searches per searcher (account or anonymous id) per hour');

CREATE TABLE public.search_term_daily (
    term text NOT NULL CHECK (length(term) BETWEEN 3 AND 100),
    day date NOT NULL,
    searchers integer NOT NULL DEFAULT 0 CHECK (searchers >= 0),
    PRIMARY KEY (term, day)
);
CREATE INDEX idx_search_term_daily_day ON public.search_term_daily (day);

CREATE TABLE public.search_log_seen (
    key bytea PRIMARY KEY,
    day date NOT NULL
);
CREATE INDEX idx_search_log_seen_day ON public.search_log_seen (day);

CREATE TABLE public.search_log_quota (
    key bytea PRIMARY KEY,
    window_start timestamptz NOT NULL,
    used integer NOT NULL DEFAULT 0 CHECK (used >= 0)
);
CREATE INDEX idx_search_log_quota_window ON public.search_log_quota (window_start);

CREATE TABLE public.search_term_blocklist (
    term text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_term_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_log_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_log_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_term_blocklist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_term_daily, public.search_log_seen, public.search_log_quota, public.search_term_blocklist
    FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.log_search(p_query text, p_anon_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_searcher uuid := coalesce((SELECT auth.uid()), p_anon_id);
    v_day date := (timezone('UTC', clock_timestamp()))::date;
    v_hour timestamptz := date_trunc('hour', clock_timestamp());
    v_q text;
    v_pattern text;
    v_max integer;
    v_used integer;
    v_new integer;
BEGIN
    IF v_searcher IS NULL THEN
        RAISE EXCEPTION 'a signed-in user or an anonymous id is required' USING ERRCODE = '22023';
    END IF;
    SELECT s.q, s.pattern INTO v_q, v_pattern FROM public.search_prepare(p_query, 1, 0) s;

    -- Rate limit first, counting every call (a repeat costs quota too).
    SELECT l.max_value INTO v_max FROM public.abuse_limits l WHERE l.code = 'search_log_rate_hour';
    INSERT INTO public.search_log_quota AS q (key, window_start, used)
    VALUES (sha256(convert_to(v_searcher::text || '|' || extract(epoch FROM v_hour)::bigint::text, 'UTF8')), v_hour, 1)
    ON CONFLICT (key) DO UPDATE SET used = q.used + 1
    RETURNING q.used INTO v_used;
    IF v_max IS NOT NULL AND v_used > v_max THEN
        RAISE EXCEPTION 'too many requests' USING ERRCODE = 'PT429', HINT = 'search_log_rate_hour';
    END IF;

    -- Only a term that finds something public enters the log.
    IF NOT (EXISTS (SELECT 1 FROM public.stories st
                     WHERE public.search_normalize(st.title) LIKE v_pattern
                       AND st.visibility = 'public' AND st.deleted_at IS NULL AND st.status <> 'draft')
            OR EXISTS (SELECT 1 FROM public.tags t
                        WHERE public.search_normalize(t.display_name) LIKE v_pattern
                           OR public.search_normalize(t.slug::text) LIKE v_pattern)
            OR EXISTS (SELECT 1 FROM public.app_users u
                        WHERE (public.search_normalize(u.username::text) LIKE v_pattern
                               OR public.search_normalize(u.display_name) LIKE v_pattern)
                          AND u.account_status = 'active' AND u.deleted_at IS NULL
                          AND EXISTS (SELECT 1 FROM public.stories st
                                       WHERE st.owner_id = u.id AND st.visibility = 'public'
                                         AND st.deleted_at IS NULL AND st.status <> 'draft'))) THEN
        RETURN false;
    END IF;

    INSERT INTO public.search_log_seen (key, day)
    VALUES (sha256(convert_to(v_searcher::text || '|' || v_q || '|' || to_char(v_day, 'YYYY-MM-DD'), 'UTF8')), v_day)
    ON CONFLICT (key) DO NOTHING;
    GET DIAGNOSTICS v_new = ROW_COUNT;
    IF v_new = 0 THEN
        RETURN false;
    END IF;

    INSERT INTO public.search_term_daily AS d (term, day, searchers) VALUES (v_q, v_day, 1)
    ON CONFLICT (term, day) DO UPDATE SET searchers = d.searchers + 1;
    RETURN true;
END $$;

CREATE FUNCTION public.trending_searches(p_limit integer DEFAULT 10)
RETURNS TABLE (term text, searchers bigint, rank_position integer, previous_rank integer, rank_change integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
    v_min constant integer := 3;
    v_today date := (timezone('UTC', clock_timestamp()))::date;
BEGIN
    IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 THEN
        RAISE EXCEPTION 'limit must be between 1 and 20' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    WITH windowed AS (
        SELECT d.term, (d.day > v_today - 7) AS is_current, sum(d.searchers) AS n
          FROM public.search_term_daily d
         WHERE d.day > v_today - 14 AND d.day <= v_today
           AND NOT EXISTS (SELECT 1 FROM public.search_term_blocklist b WHERE b.term = d.term)
         GROUP BY d.term, (d.day > v_today - 7)
        HAVING sum(d.searchers) >= v_min),
    cur AS (
        SELECT w.term, w.n, row_number() OVER (ORDER BY w.n DESC, w.term)::integer AS pos
          FROM windowed w WHERE w.is_current),
    prev AS (
        SELECT w.term, row_number() OVER (ORDER BY w.n DESC, w.term)::integer AS pos
          FROM windowed w WHERE NOT w.is_current)
    SELECT c.term, c.n::bigint, c.pos, p.pos, p.pos - c.pos
      FROM cur c LEFT JOIN prev p ON p.term = c.term
     WHERE c.pos <= p_limit
     ORDER BY c.pos;
END $$;

CREATE FUNCTION public.purge_search_log()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_today date := (timezone('UTC', clock_timestamp()))::date;
    v_total integer := 0;
    v_n integer;
BEGIN
    DELETE FROM public.search_log_seen WHERE day < v_today - 1;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
    DELETE FROM public.search_log_quota WHERE window_start < clock_timestamp() - interval '2 hours';
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
    DELETE FROM public.search_term_daily WHERE day < v_today - 60;
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
    RETURN v_total;
END $$;

REVOKE ALL ON FUNCTION public.log_search(text, uuid), public.trending_searches(integer), public.purge_search_log()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_search(text, uuid), public.trending_searches(integer)
    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_search_log() TO service_role;

COMMIT;
