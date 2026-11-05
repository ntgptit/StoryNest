-- StoryNest QA test accounts — DEVELOPMENT ONLY (project storynest-dev). Never run on production.
-- Run through the project owner's Supabase admin channel (SQL editor / admin connector). No service_role key needed.
-- Replace :password_bcrypt with a bcrypt hash ($2a$10$...) of a generated password computed locally.
-- The plaintext password is never written into SQL, the repository, logs or reports.
-- Emails use the reserved .test TLD, so no email can be delivered; accounts are created already confirmed.
with v(id, email, username, display_name) as (values
  ('38c95cf0-c4e9-5fa3-87c3-2bedac2dd576', 'qa.reader@qa.storynest.test',    'qa_reader',    'QA Reader'),
  ('32b32b80-c29b-51b8-9181-251ec49fea60', 'qa.author@qa.storynest.test',    'qa_author',    'QA Author'),
  ('d6744201-7c68-545d-91ab-d4eea041b23a', 'qa.coauthor@qa.storynest.test',  'qa_coauthor',  'QA Co-author'),
  ('e06e5e9a-8bad-53f1-a778-e27cb01efd13', 'qa.editor@qa.storynest.test',    'qa_editor',    'QA Editor'),
  ('fac65d99-76fe-58ea-a0f8-e1e6b0aa4faf', 'qa.moderator@qa.storynest.test', 'qa_moderator', 'QA Moderator'),
  ('b84b312c-abf7-5e88-bc61-70472603b598', 'qa.outsider@qa.storynest.test',  'qa_outsider',  'QA Outsider')),
ins as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email,
         ':password_bcrypt', now(),
         jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
         jsonb_build_object('username', v.username, 'display_name', v.display_name), now(), now(), '', '', '', ''
    from v where not exists (select 1 from auth.users u where u.email = v.email)
  returning id, email)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), ins.id, ins.id::text, 'email',
       jsonb_build_object('sub', ins.id::text, 'email', ins.email, 'email_verified', true, 'phone_verified', false),
       now(), now(), now()
  from ins;

-- Moderator role (server-set claim, read by requireUser/is_moderator). Only for the QA moderator account.
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"moderator"}'::jsonb, updated_at = now()
 where email = 'qa.moderator@qa.storynest.test';
