-- StoryNest QA cleanup — DEVELOPMENT ONLY. Removes only data owned by the six QA accounts (@qa.storynest.test).
-- Review the SELECT first; nothing here touches rows of non-QA users.
-- 1) What will be removed
select 'qa users' as what, count(*) from auth.users where email like '%@qa.storynest.test'
union all
select 'qa stories', count(*) from public.stories s join auth.users u on u.id = s.owner_id where u.email like '%@qa.storynest.test'
union all
select 'non-QA rows referencing QA stories (must be 0)', count(*)
  from public.story_follows f join public.stories s on s.id = f.story_id join auth.users o on o.id = s.owner_id
  join auth.users fu on fu.id = f.user_id
 where o.email like '%@qa.storynest.test' and fu.email not like '%@qa.storynest.test';

-- 2) Remove (run inside one transaction after checking step 1). Order follows the ON DELETE RESTRICT keys
--    stories.owner_id, comments.author_id, content_reports.{reporter_id, reported_user_id, story_id},
--    chapter_drafts.updated_by, chapter_versions.created_by (the last two disappear with the QA stories).
-- begin;
--   create temp table qa_ids as select id from auth.users where email like '%@qa.storynest.test';
--   delete from public.content_reports
--    where reporter_id in (select id from qa_ids) or reported_user_id in (select id from qa_ids)
--       or story_id in (select id from public.stories where owner_id in (select id from qa_ids));
--   delete from public.comments where author_id in (select id from qa_ids);
--   delete from public.stories where owner_id in (select id from qa_ids);   -- cascades chapters, drafts, versions,
--                                                                          -- follows, saves, votes, list items
--   delete from auth.users where id in (select id from qa_ids);            -- cascades profiles, settings, lists,
--                                                                          -- progress, notifications, identities
-- commit;
-- moderation_actions rows about QA targets are kept as audit history unless the Product Owner asks otherwise.
-- Never widen the filters above: every statement is limited to the QA account ids.
