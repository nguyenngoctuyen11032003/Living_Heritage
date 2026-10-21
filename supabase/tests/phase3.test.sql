-- Phase 3: story photos follow story access; narrator lang/relation/generation; semantic match over public items.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now()),
  ('22222222-2222-4222-8222-222222222222', 'viewer.a@test.dev', '{}', false, now()),
  ('55555555-5555-4555-8555-555555555555', 'owner.b@test.dev', '{}', false, now());
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Gia đình A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Gia đình B', '55555555-5555-4555-8555-555555555555');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'viewer'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, relation, lang, generation) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Bà Tư', 'Bà nội', 'vi', 2);
insert into public.stories (id, family_id, narrator_id, kind, title, body, visibility) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'Chuyện riêng', 'Nội dung', 'private'),
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'Chuyện chung', 'Nội dung', 'family');

-- Narrator columns
select is((select lang from public.narrators where id = 'a1000000-0000-4000-8000-000000000001'), 'vi', 'narrator lang stored');
select throws_ok($$insert into public.narrators (family_id, display_name, lang) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'X', 'fr')$$,
  '23514', null, 'narrator lang restricted to vi/en');
select throws_ok($$insert into public.narrators (family_id, display_name, generation) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'X', 9)$$,
  '23514', null, 'generation range checked');

-- Owner A adds photos
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}';
select lives_ok($$insert into public.story_photos (story_id, family_id, storage_path, caption) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg', 'Ảnh cũ')$$,
  'owner can attach a photo to a private story');
select lives_ok($$insert into public.story_photos (story_id, family_id, storage_path) values
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/p2.jpg')$$,
  'owner can attach a photo to a family story');
select throws_ok($$insert into public.story_photos (story_id, family_id, storage_path) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b/x.jpg')$$,
  '23514', null, 'photo path must sit under its family folder');

-- Viewer A sees only the family story photo
set local request.jwt.claims = '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.story_photos), 1, 'viewer sees photos of family-visible stories only');
select throws_ok($$insert into public.story_photos (story_id, family_id, storage_path) values
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/p3.jpg')$$,
  '42501', null, 'viewer cannot attach photos');

-- Owner B sees nothing of family A
set local request.jwt.claims = '{"sub": "55555555-5555-4555-8555-555555555555", "role": "authenticated"}';
select is((select count(*)::int from public.story_photos), 0, 'other family sees no photos');
reset role;

-- Semantic match
insert into public.public_items (id, story_id, kind, title, body, narrator_label, embedding)
values ('e1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'story', 'Tuốt lá mai', 'Trước Tết...', 'Bà Tư',
  (select array_agg(case when i = 1 then 1.0 else 0.0 end)::extensions.vector(768) from generate_series(1, 768) i));
set local role anon;
select throws_ok($$select * from public.match_public_items(null, 5, 0.9)$$, '42501', null, 'anon cannot call match_public_items (only via the knowledge function)');
reset role;
set local role service_role;
select is((select count(*)::int from public.match_public_items(
  (select array_agg(case when i = 1 then 1.0 else 0.0 end)::extensions.vector(768) from generate_series(1, 768) i), 5, 0.9)), 1,
  'service role can match public items by embedding');
reset role;
update public.public_items set body = 'Đã sửa' where id = 'e1000000-0000-4000-8000-000000000001';
select is((select embedding is null from public.public_items where id = 'e1000000-0000-4000-8000-000000000001'), true,
  'content change clears the stale embedding');
select is((select count(*)::int from public.match_public_items(
  (select array_agg(case when i = 1 then 1.0 else 0.0 end)::extensions.vector(768) from generate_series(1, 768) i), 5, 0.0)), 0,
  'rows without embedding are not matched');

select * from finish();
rollback;
