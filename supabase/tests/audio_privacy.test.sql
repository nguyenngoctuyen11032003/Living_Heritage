-- NT08: audio that is not public stays locked; public audio only via the public-audio copy when allowed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- ===== Fixture =====
-- O1 owner A, V1 viewer A, E1 editor A, N1 anonymous narrator device (narrator nA), O2 owner B,
-- ADM admin, N2 another anonymous device.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{"display_name": "Chủ A"}', false, now()),
  ('22222222-2222-4222-8222-222222222222', 'viewer.a@test.dev', '{}', false, now()),
  ('33333333-3333-4333-8333-333333333333', 'editor.a@test.dev', '{}', false, now()),
  ('44444444-4444-4444-8444-444444444444', null, '{}', true, now()),
  ('55555555-5555-4555-8555-555555555555', 'owner.b@test.dev', '{}', false, now()),
  ('66666666-6666-4666-8666-666666666666', 'admin@test.dev', '{}', false, now()),
  ('77777777-7777-4777-8777-777777777777', null, '{}', true, now());
update public.profiles set is_admin = true where id = '66666666-6666-4666-8666-666666666666';
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Gia đình A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Gia đình B', '55555555-5555-4555-8555-555555555555');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'viewer'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'editor'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, pen_name, birth_year, region, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Nguyễn Văn Ba', null, 1945, 'nam', '44444444-4444-4444-8444-444444444444'),
  ('a2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Trần Thị Tư', 'Bà Tư', 1950, 'bac', null),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Lê Văn Năm', null, 1948, 'trung', null);
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
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   null, 'experience', 'Kinh nghiệm chăm cây', 'Tưới nước...', 'family'),
  ('d3000000-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
   null, 'story', 'Chuyện của bà Tư', 'Bà kể...', 'private'),
  ('d4000000-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   'cb000000-0000-4000-8000-000000000001', 'story', 'Chuyện nhà B', 'Nhà B...', 'family');
insert into storage.objects (bucket_id, name) values
  ('recordings', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/rec-a.webm'),
  ('recordings', 'bbbbbbbb-0000-4000-8000-00000000000b/b1000000-0000-4000-8000-000000000001/rec-b.webm');

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

select is((select public from storage.buckets where id = 'recordings'), false, 'recordings bucket is private');
select is((select public from storage.buckets where id = 'media'), false, 'media bucket is private');
select is((select public from storage.buckets where id = 'public-audio'), true, 'public-audio bucket is public');

create function public.t_count(p_sql text) returns integer language plpgsql as $$
declare v integer;
begin
  execute p_sql into v;
  return v;
exception when insufficient_privilege then
  return -1;
end $$;
grant execute on function public.t_count(text) to anon, authenticated;

set local role authenticated;
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.approve_story('d1000000-0000-4000-8000-000000000001'), 2, 'the narrator approves the recorded story');
select set_config('test.req', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select ok(public.review_publish(current_setting('test.req')::uuid, true) is not null, 'published with default settings');
select is((select audio_allowed::text || '/' || coalesce(audio_path, '-') from public.public_items), 'false/-',
  'audio not allowed: no public audio path');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings'), 0,
  'the admin cannot read the family recording');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select ok(public.t_count($$select count(*)::integer from storage.objects where bucket_id = 'recordings'$$) <= 0,
  'anon cannot read the recording of a public story');
select ok(public.t_count($$select count(*)::integer from public.recordings$$) <= 0, 'anon cannot read recordings rows');

reset role;
set local role authenticated;
select public.t_as('55555555-5555-4555-8555-555555555555');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings' and name like 'aaaaaaaa%'), 0,
  'a stranger cannot read the recording of a public story');
select public.t_as('22222222-2222-4222-8222-222222222222');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings'), 1,
  'a family viewer reads the audio once the story is shared beyond private');

-- allow audio: withdraw, switch on, publish again
select public.t_as('11111111-1111-4111-8111-111111111111');
select lives_ok($$select public.withdraw_public('d1000000-0000-4000-8000-000000000001')$$, 'withdrawn');
update public.story_share_settings set show_audio = true where story_id = 'd1000000-0000-4000-8000-000000000001';
select set_config('test.req2', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select set_config('test.item', public.review_publish(current_setting('test.req2')::uuid, true)::text, true);
select is((select audio_path from public.public_items), 'items/' || current_setting('test.item') || '.webm',
  'audio allowed: path reserved in public-audio');
select ok((select audio_allowed from public.public_items), 'audio_allowed is true');

select public.t_as('44444444-4444-4444-8444-444444444444', true);
update public.story_share_settings set show_audio = false where story_id = 'd1000000-0000-4000-8000-000000000001';
select is((select audio_allowed::text || '/' || coalesce(audio_path, '-') from public.public_items), 'false/-',
  'switching audio off removes it from the public item at once');

-- a story without a recording never gets public audio
select public.t_as('11111111-1111-4111-8111-111111111111');
insert into public.story_share_settings (story_id, show_audio) values ('d2000000-0000-4000-8000-000000000002', true);
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.approve_story('d2000000-0000-4000-8000-000000000002'), 2, 'approved');
select set_config('test.req3', public.request_publish('d2000000-0000-4000-8000-000000000002')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select ok(public.review_publish(current_setting('test.req3')::uuid, true) is not null, 'published');
select is((select audio_allowed from public.public_items where story_id = 'd2000000-0000-4000-8000-000000000002'), false,
  'no recording: audio_allowed stays false');

-- clients cannot write the public-audio bucket; recording paths are strict
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(left(public.t_err($$insert into storage.objects (bucket_id, name) values ('public-audio', 'items/x.webm')$$), 5), '42501',
  'clients cannot upload to public-audio');
select is(left(public.t_err($$insert into storage.objects (bucket_id, name) values
    ('recordings', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/a/b.webm')$$), 5), '42501',
  'recording uploads must be exactly {family}/{narrator}/{file}');
select is(left(public.t_err($$insert into storage.objects (bucket_id, name) values ('recordings', 'not-a-uuid/x/y.webm')$$), 5), '42501',
  'a malformed path is refused by policy, not a cast error');

select * from finish();
rollback;
