-- Migration 20261022000700_review_moderation: moderation history survives withdrawal and status changes are
-- audited; save_story_draft / approve_story optimistic version check; topic change through save_story_draft.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now()),
  ('44444444-4444-4444-8444-444444444444', null, '{}', true, now()),
  ('66666666-6666-4666-8666-666666666666', 'admin@test.dev', '{}', false, now()),
  ('77777777-7777-4777-8777-777777777777', 'learner@test.dev', '{}', false, now());
update public.profiles set is_admin = true where id = '66666666-6666-4666-8666-666666666666';
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'A', '11111111-1111-4111-8111-111111111111');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner');
insert into public.narrators (id, family_id, display_name, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Bà Tư', '44444444-4444-4444-8444-444444444444');
insert into public.stories (id, family_id, narrator_id, kind, title, body, visibility, edit_status, topic_id) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'S1', 'b', 'public', 'approved', 'a0000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'S2', 'b', 'private', 'draft', 'a0000000-0000-4000-8000-000000000001');
insert into public.public_items (id, story_id, kind, title, body, narrator_label) values
  ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'story', 'S1', 'b', 'Bà Tư');
insert into public.connect_requests (id, public_item_id, requester, name, contact, message) values
  ('c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777',
   'Lan', 'lan@test.dev', 'Muốn học');
insert into public.reports (id, public_item_id, reason) values
  ('f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'inaccurate');
update public.topics set active = false where id = 'a0000000-0000-4000-8000-000000000006';

create function public.t_as(p_user uuid, p_anon boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;
create function public.t_err(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;
grant execute on function public.t_as(uuid, boolean), public.t_err(text) to anon, authenticated;

set local role authenticated;

-- ===== Moderation =====
select public.t_as('77777777-7777-4777-8777-777777777777');
select is(left(public.t_err($$insert into public.connect_requests (public_item_id, requester, name, contact, message)
    values (null, '77777777-7777-4777-8777-777777777777', 'Lan', 'lan@test.dev', 'x')$$), 5), '42501',
  'a new connect request must name a public item');
select public.t_as('66666666-6666-4666-8666-666666666666');
update public.reports set status = 'dismissed';
update public.connect_requests set status = 'forwarded';
select is((select actor_role || '/' || (details ->> 'from') || '/' || (details ->> 'to') || '/' || family_id::text
    from public.audit_log where action = 'report_status'), 'admin/open/dismissed/aaaaaaaa-0000-4000-8000-00000000000a',
  'a report status change is audited with actor role, old/new status and family');
select is((select details ->> 'to' from public.audit_log where action = 'connect_status'), 'forwarded',
  'a connect request status change is audited');
select public.t_as('11111111-1111-4111-8111-111111111111');
select lives_ok($$select public.withdraw_public('d1000000-0000-4000-8000-000000000001')$$, 'the owner withdraws S1');
reset role;
select is((select count(*)::integer from public.connect_requests where public_item_id is null), 1,
  'the connect request survives the withdrawal');
select is((select count(*)::integer from public.reports where public_item_id is null), 1, 'so does the report');
set local role authenticated;

-- ===== save_story_draft: version check and topic =====
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err($$select public.save_story_draft('d2000000-0000-4000-8000-000000000002', 'T', null, 'B', '{}', 7)$$),
  '22023 stale_version', 'saving over a newer version is refused');
select is(public.save_story_draft('d2000000-0000-4000-8000-000000000002', 'T', null, 'B', '{"people": ["Bà Tư"], "places": ["Bến Tre"]}', 1), 2,
  'saving with the current version works');
select is((select fields -> 'people' ->> 0 || '/' || (fields -> 'places' ->> 0) from public.stories
    where id = 'd2000000-0000-4000-8000-000000000002'), 'Bà Tư/Bến Tre', 'people / places fields are kept');
select is(public.t_err($$select public.save_story_draft('d2000000-0000-4000-8000-000000000002', 'T', null, 'B', '{}', null,
    'a0000000-0000-4000-8000-000000000006')$$), '22023 invalid_topic', 'an inactive topic is refused');
select is(public.save_story_draft('d2000000-0000-4000-8000-000000000002', 'T', null, 'B', '{}', 2,
    'a0000000-0000-4000-8000-000000000005'), 3, 'the topic changes with the edit');
select is((select topic_id::text || '/' || edit_status::text from public.stories where id = 'd2000000-0000-4000-8000-000000000002'),
  'a0000000-0000-4000-8000-000000000005/pending_review', 'new topic, back to pending review');
select is(public.save_story_draft('d2000000-0000-4000-8000-000000000002', 'T2', null, 'B', '{}'), 4,
  'legacy 5-argument calls still work');

-- ===== approve_story: version check =====
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err($$select public.approve_story('d2000000-0000-4000-8000-000000000002', p_expected_version => 3)$$),
  '22023 stale_version', 'approving a version the narrator has not seen is refused');
select is(public.approve_story('d2000000-0000-4000-8000-000000000002', p_expected_version => 4), 5,
  'approving the current version works');
select is(public.approve_story('d2000000-0000-4000-8000-000000000002'), 5, 'a repeat call without a version is idempotent');

select * from finish();
rollback;
