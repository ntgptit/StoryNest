-- Sign-up keeps the username as typed (F-AUTH-01). Rolled back at the end.
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000005b1', 'un.one@example.com', '{"username":"MyName_2026"}'),
  ('00000000-0000-0000-0000-0000000005b2', 'un.two@example.com', '{"username":"myname_2026"}'),
  ('00000000-0000-0000-0000-0000000005b3', 'un.long@example.com', '{"username":"A_very_long_username_of_30_ch"}'),
  ('00000000-0000-0000-0000-0000000005b4', 'un.none@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000005b5', 'un.short@example.com', '{"username":"ab"}'),
  ('00000000-0000-0000-0000-0000000005b6', 'un.junk@example.com', '{"username":"Né.Tên-xấu!"}');

DO $$
BEGIN
  RESET ROLE;
  PERFORM tests.ok('a free name is kept exactly as typed, case included',
    (SELECT username::text = 'MyName_2026' FROM app_users WHERE id = '00000000-0000-0000-0000-0000000005b1'));
  PERFORM tests.ok('the same name in another case counts as taken and gets a suffix, within 30 characters',
    (SELECT username::text LIKE 'myname_2026\_%' AND length(username::text) <= 30 AND username::text <> 'myname_2026'
       FROM app_users WHERE id = '00000000-0000-0000-0000-0000000005b2'));
  PERFORM tests.ok('a 30-character name is kept whole',
    (SELECT username::text = 'A_very_long_username_of_30_ch' FROM app_users WHERE id = '00000000-0000-0000-0000-0000000005b3'));
  PERFORM tests.ok('with no name given the part before the @ is used',
    (SELECT username::text = 'unnone' FROM app_users WHERE id = '00000000-0000-0000-0000-0000000005b4'));
  PERFORM tests.ok('a too short name is padded, never rejected',
    (SELECT length(username::text) >= 3 FROM app_users WHERE id = '00000000-0000-0000-0000-0000000005b5'));
  PERFORM tests.ok('a name the form would not accept is cleaned to a valid lower-case one, as before',
    (SELECT username::text ~ '^[a-z0-9_]{3,30}$' FROM app_users WHERE id = '00000000-0000-0000-0000-0000000005b6'));
END $$;

ROLLBACK;
