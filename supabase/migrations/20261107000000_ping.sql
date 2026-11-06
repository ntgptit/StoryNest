-- Keep-alive ping for the scheduled GitHub workflow (.github/workflows/supabase-keep-alive.yml).
--
--   ping() -> 'ok'
--
-- A free Supabase project is paused after a week without activity. The workflow calls this function once a day through
-- the REST API with the publishable key, which reaches the database like any other request. It reads nothing, writes
-- nothing and returns a constant, so it exposes no data and needs no user: callable by anon, authenticated and
-- service_role. STABLE, SECURITY INVOKER (no table access, so no definer rights are needed), search_path pinned.
--
-- Rollback: DROP FUNCTION public.ping();
BEGIN;

CREATE FUNCTION public.ping()
RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT 'ok'::text
$$;

REVOKE ALL ON FUNCTION public.ping() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ping() TO anon, authenticated, service_role;

COMMIT;
