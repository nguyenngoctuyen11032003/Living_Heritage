-- Public hub: search_public exposes no internal columns, the snapshot carries duration_s only with audio,
-- saved_items are private to their owner.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ===== Fixture (as postgres) =====
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('91000000-0000-4000-8000-000000000001', 'hub.owner@test.dev', '{}', false, now()),
  ('92000000-0000-4000-8000-000000000002', 'hub.visitor1@test.dev', '{}', false, now()),
  ('93000000-0000-4000-8000-000000000003', 'hub.visitor2@test.dev', '{}', false, now());
insert into public.families (id, name, owner_id) values
  ('9f000000-0000-4000-8000-00000000000f', 'Gia đình Hub', '91000000-0000-4000-8000-000000000001');
insert into public.narrators (id, family_id, display_name, region) values
  ('9a000000-0000-4000-8000-000000000001', '9f000000-0000-4000-8000-00000000000f', 'Bà Hai', 'nam');
insert into public.sessions (id, family_id, narrator_id) values
  ('9b000000-0000-4000-8000-000000000001', '9f000000-0000-4000-8000-00000000000f', '9a000000-0000-4000-8000-000000000001');
insert into public.recordings (id, family_id, narrator_id, session_id, storage_path, duration_s) values
  ('9c000000-0000-4000-8000-000000000001', '9f000000-0000-4000-8000-00000000000f', '9a000000-0000-4000-8000-000000000001',
   '9b000000-0000-4000-8000-000000000001',
   '9f000000-0000-4000-8000-00000000000f/9a000000-0000-4000-8000-000000000001/rec-hub.webm', 125.5);
insert into public.stories (id, family_id, narrator_id, recording_id, kind, title, body, fields, visibility) values
  ('9d000000-0000-4000-8000-000000000001', '9f000000-0000-4000-8000-00000000000f', '9a000000-0000-4000-8000-000000000001',
   '9c000000-0000-4000-8000-000000000001', 'story', 'Chợ nổi ngày xưa', 'Hồi đó...', '{"duration_s": 999}', 'family'),
  ('9d000000-0000-4000-8000-000000000002', '9f000000-0000-4000-8000-00000000000f', '9a000000-0000-4000-8000-000000000001',
   '9c000000-0000-4000-8000-000000000001', 'story', 'Ghe xuồng', 'Bà kể...', '{}', 'family');
insert into public.story_share_settings (story_id, show_audio) values
  ('9d000000-0000-4000-8000-000000000001', false),
  ('9d000000-0000-4000-8000-000000000002', true)
  on conflict (story_id) do update set show_audio = excluded.show_audio;

-- ===== 2. duration_s only with audio =====
select is(public.lh_public_snapshot('9d000000-0000-4000-8000-000000000001') -> 'fields' ? 'duration_s', false,
  'no audio: the snapshot has no duration_s (a stray one in story fields is dropped)');
select is((public.lh_public_snapshot('9d000000-0000-4000-8000-000000000002') -> 'fields' ->> 'duration_s')::numeric, 125.5,
  'audio allowed: the snapshot carries the recording duration');
select is((public.lh_public_snapshot('9d000000-0000-4000-8000-000000000002') ->> 'audio_allowed')::boolean, true,
  'audio allowed flag in the snapshot');

insert into public.public_items (id, story_id, kind, title, body, fields, narrator_label, audio_allowed, audio_path, embedding) values
  ('9e000000-0000-4000-8000-000000000001', '9d000000-0000-4000-8000-000000000001', 'story', 'Chợ nổi ngày xưa', 'Hồi đó...',
   '{"duration_s": 999}', 'Bà Hai', false, null,
   (select array_agg(0.01)::extensions.vector(768) from generate_series(1, 768))),
  ('9e000000-0000-4000-8000-000000000002', '9d000000-0000-4000-8000-000000000002', 'story', 'Ghe xuồng', 'Bà kể...',
   '{"duration_s": 125.5}', 'Bà Hai', true, 'items/9e000000-0000-4000-8000-000000000002.webm', null);
select is((select fields ? 'duration_s' from public.public_items where id = '9e000000-0000-4000-8000-000000000001'), false,
  'guard trigger: a public item without audio never stores duration_s');
update public.public_items set audio_allowed = false, audio_path = null where id = '9e000000-0000-4000-8000-000000000002';
select is((select fields ? 'duration_s' from public.public_items where id = '9e000000-0000-4000-8000-000000000002'), false,
  'switching audio off removes duration_s');
update public.public_items set audio_allowed = true, fields = '{"duration_s": 125.5}'
  where id = '9e000000-0000-4000-8000-000000000002';

-- ===== 1. anon search has no internal columns =====
set local role anon;
select is((select count(*)::int from public.search_public()), 2, 'anon search returns the public items');
select ok(not exists (select 1 from public.search_public() r where to_jsonb(r) ?| array['embedding', 'embedded_at', 'story_id', 'search_tsv']),
  'search_public rows carry no embedding / embedded_at / story_id / search_tsv');
select is((select (to_jsonb(r) -> 'fields' ->> 'duration_s')::numeric from public.search_public('ghe xuong') r), 125.5,
  'search_public returns duration_s for the item with audio');
select throws_ok($$select embedding from public.public_items$$, '42501', null, 'anon cannot select public_items.embedding');
select throws_ok($$select embedded_at from public.public_items$$, '42501', null, 'anon cannot select public_items.embedded_at');
select is((select count(*)::int from (select id, story_id, title, fields, audio_path from public.public_items) x), 2,
  'anon still reads the columns the web selects');
reset role;

-- ===== 3. saved_items isolation =====
set local role authenticated;
set local request.jwt.claims = '{"sub": "92000000-0000-4000-8000-000000000002", "role": "authenticated"}';
insert into public.saved_items (public_item_id) values ('9e000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.saved_items), 1, 'visitor 1 sees their saved item');
select throws_ok($$insert into public.saved_items (user_id, public_item_id)
    values ('93000000-0000-4000-8000-000000000003', '9e000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'visitor 1 cannot save on behalf of visitor 2');

set local request.jwt.claims = '{"sub": "93000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select is((select count(*)::int from public.saved_items), 0, 'visitor 2 sees none of visitor 1''s saved items');
delete from public.saved_items;
reset role;
select is((select count(*)::int from public.saved_items), 1, 'visitor 2 cannot delete visitor 1''s saved item');

set local role anon;
select throws_ok($$select * from public.saved_items$$, '42501', null, 'anon has no access to saved_items');
reset role;

select * from finish();
rollback;
