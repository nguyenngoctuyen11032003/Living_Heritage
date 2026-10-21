-- Media files follow story access (narrator device can see its story photos); editors may delete orphaned files.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now()),
  ('33333333-3333-4333-8333-333333333333', 'editor.a@test.dev', '{}', false, now()),
  ('44444444-4444-4444-8444-444444444444', null, '{}', true, now()),
  ('55555555-5555-4555-8555-555555555555', 'owner.b@test.dev', '{}', false, now());
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'B', '55555555-5555-4555-8555-555555555555');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'editor'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Bà Tư', '44444444-4444-4444-8444-444444444444');
insert into public.stories (id, family_id, narrator_id, kind, title, body, visibility) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'Chuyện', 'Nội dung', 'private');
insert into public.story_photos (story_id, family_id, storage_path) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg');

set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}';
select is(public.can_read_media_object('aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg'), true, 'narrator device can read its story photo');
select is(public.can_read_media_object('aaaaaaaa-0000-4000-8000-00000000000a/other.jpg'), false, 'unreferenced file is not readable through stories');

set local request.jwt.claims = '{"sub": "55555555-5555-4555-8555-555555555555", "role": "authenticated"}';
select is(public.can_read_media_object('aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg'), false, 'other family cannot read the photo');

set local request.jwt.claims = '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}';
select is(public.media_object_unreferenced('aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg'), false, 'referenced file is not deletable as orphan');
select is(public.media_object_unreferenced('aaaaaaaa-0000-4000-8000-00000000000a/gone.jpg'), true, 'unreferenced file counts as orphan');
reset role;

set local role anon;
select throws_ok($$select public.can_read_media_object('x')$$, '42501', null, 'anon cannot call can_read_media_object');
select throws_ok($$select public.media_object_unreferenced('x')$$, '42501', null, 'anon cannot call media_object_unreferenced');
reset role;

select * from finish();
rollback;
