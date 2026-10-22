-- Static-audit hardening: story/recording family match, deletion request scope, admin takedown.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now()),
  ('44444444-4444-4444-8444-444444444444', null, '{}', true, now()),
  ('55555555-5555-4555-8555-555555555555', 'owner.b@test.dev', '{}', false, now()),
  ('66666666-6666-4666-8666-666666666666', 'admin@test.dev', '{}', false, now());
update public.profiles set is_admin = true where id = '66666666-6666-4666-8666-666666666666';
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Gia đình A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Gia đình B', '55555555-5555-4555-8555-555555555555');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Nguyễn Văn Ba', '44444444-4444-4444-8444-444444444444'),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Lê Văn Năm', null);
insert into public.sessions (id, family_id, narrator_id) values
  ('5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001'),
  ('5b000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001');
insert into public.recordings (id, family_id, narrator_id, session_id, storage_path) values
  ('ca000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   '5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/rec-a.webm'),
  ('cb000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   '5b000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b/b1000000-0000-4000-8000-000000000001/rec-b.webm');
insert into public.stories (id, family_id, narrator_id, recording_id, kind, title, body, visibility) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'ca000000-0000-4000-8000-000000000001', 'story', 'Chuyện Tết xưa', 'Ngày xưa...', 'private'),
  ('d4000000-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   null, 'story', 'Chuyện nhà B', 'Nhà B...', 'family');

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
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(left(public.t_err($$insert into public.stories (family_id, narrator_id, recording_id, title, body) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000001', 'x', 'y')$$), 5),
  '23514', 'a story cannot reference another family''s recording');
select is(public.t_err($$insert into public.stories (family_id, narrator_id, recording_id, title, body) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'x', 'y')$$),
  'ok', 'a story can reference its own recording');

select is(left(public.t_err($$insert into public.deletion_requests (family_id, story_id, requested_by) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'd4000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111')$$), 5),
  '42501', 'a deletion request cannot name another family''s story');
select is(public.t_err($$insert into public.deletion_requests (family_id, story_id, requested_by) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'd1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111')$$),
  'ok', 'a deletion request for an own story is accepted');

-- publish d1 then take it down as admin
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select public.approve_story('d1000000-0000-4000-8000-000000000001');
select set_config('test.req', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select public.review_publish(current_setting('test.req')::uuid, true);
select is((select count(*)::integer from public.public_items), 1, 'published');

select public.t_as('55555555-5555-4555-8555-555555555555');
select is(left(public.t_err($$select public.admin_withdraw_public('d1000000-0000-4000-8000-000000000001')$$), 5), '42501',
  'a non-admin cannot use admin_withdraw_public');

select public.t_as('66666666-6666-4666-8666-666666666666');
select lives_ok($$select public.admin_withdraw_public('d1000000-0000-4000-8000-000000000001', 'privacy report')$$,
  'the admin takes the item down');
select is((select count(*)::integer from public.public_items), 0, 'public item removed from search');

reset role;
select is((select visibility::text || '/' || (select status::text from public.publish_requests where story_id = s.id)
  from public.stories s where s.id = 'd1000000-0000-4000-8000-000000000001'), 'family/withdrawn',
  'story back to family, publish request withdrawn');

select * from finish();
rollback;
