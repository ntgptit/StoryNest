-- ping(): the keep-alive call of the scheduled workflow. A guest and a signed-in user get "ok"; it needs no data and
-- changes none. Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000561', 'ping.user@example.com');

DO $$
DECLARE
  u constant uuid := '00000000-0000-0000-0000-000000000561';
BEGIN
  RESET ROLE;
  PERFORM tests.act_as(NULL, 'anon');
  PERFORM tests.ok('a guest gets ok', public.ping() = 'ok');
  RESET ROLE; PERFORM tests.act_as(u);
  PERFORM tests.ok('a signed-in user gets ok', public.ping() = 'ok');
  RESET ROLE;
  PERFORM tests.ok('service_role may execute it', has_function_privilege('service_role', 'public.ping()', 'execute'));
  PERFORM tests.ok('anon and authenticated may execute it',
    has_function_privilege('anon', 'public.ping()', 'execute') AND has_function_privilege('authenticated', 'public.ping()', 'execute'));
  PERFORM tests.ok('it is not open to PUBLIC beyond those roles',
    NOT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                 WHERE p.oid = 'public.ping()'::regprocedure AND a.grantee = 0));
END $$;

ROLLBACK;
