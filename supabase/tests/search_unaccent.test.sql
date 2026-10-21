-- search_public: accent-insensitive full text ('cham cay' finds 'chăm cây'), prefix, fuzzy title, filters,
-- ordering and paging; callable by anon.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

insert into public.public_items (story_id, kind, title, summary, body, topic_slug, region, decade, narrator_label, published_at) values
  ('d1000000-0000-4000-8000-000000000001', 'experience', 'Kinh nghiệm chăm cây bưởi', 'Tưới và bón phân', 'Mỗi sáng tưới gốc...',
   'lam-vuon', 'nam', 1970, 'Bà Tư', now() - interval '1 day'),
  ('d2000000-0000-4000-8000-000000000002', 'experience', 'Cách nấu canh chua cá lóc', null, 'Nấu nước dùng...',
   'mon-an', 'nam', 1980, 'Người kể ẩn danh', now() - interval '2 days'),
  ('d3000000-0000-4000-8000-000000000003', 'story', 'Đồng lúa quê tôi', null, 'Mùa gặt năm ấy cả làng ra đồng.',
   'que-huong', 'bac', 1960, 'Người kể ẩn danh', now() - interval '3 days'),
  ('d4000000-0000-4000-8000-000000000004', 'story', 'Tết ở làng', null, 'Bánh chưng xanh...',
   'tuoi-tho', 'trung', null, 'Người kể ẩn danh', now());

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select is(public.lh_unaccent('chăm cây Đồng lúa'), 'cham cay Dong lua', 'lh_unaccent strips Vietnamese marks (đ → d)');
select is((select array_agg(title) from public.search_public('cham cay')), array['Kinh nghiệm chăm cây bưởi'], '"cham cay" finds "chăm cây"');
select is((select array_agg(title) from public.search_public('CHĂM CÂY')), array['Kinh nghiệm chăm cây bưởi'], 'accented upper case works too');
select is((select array_agg(title) from public.search_public('dong lua')), array['Đồng lúa quê tôi'], '"dong lua" finds "Đồng lúa"');
select is((select array_agg(title) from public.search_public('buo')), array['Kinh nghiệm chăm cây bưởi'], 'word prefixes match');
select is((select array_agg(title) from public.search_public('mua gat')), array['Đồng lúa quê tôi'], 'the body is searched');
select is((select array_agg(title) from public.search_public('bon phan')), array['Kinh nghiệm chăm cây bưởi'], 'the summary is searched');
select is((select array_agg(title) from public.search_public('canh chuaa')), array['Cách nấu canh chua cá lóc'], 'small typos match the title');
select is((select count(*)::integer from public.search_public('xyzxyz')), 0, 'nonsense finds nothing');
select is((select array_agg(title) from public.search_public($$ cham' & | ! (cay $$)), array['Kinh nghiệm chăm cây bưởi'],
  'operators in the query are ignored, not errors');
select is((select array_agg(story_id::text) from public.search_public()),
  array['d4000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000001',
        'd2000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000003'],
  'no query: newest first');
select is((select array_agg(title) from public.search_public(p_topic => 'mon-an')), array['Cách nấu canh chua cá lóc'], 'topic filter');
select is((select count(*)::integer from public.search_public(p_kind => 'story')), 2, 'kind filter');
select is((select count(*)::integer from public.search_public(p_region => 'nam')), 2, 'region filter');
select is((select array_agg(title) from public.search_public(p_decade => 1960)), array['Đồng lúa quê tôi'], 'decade filter');
select is((select array_agg(title) from public.search_public('cay', p_region => 'bac')), null, 'query and filters combine');
select is((select array_agg(story_id::text) from public.search_public(lim => 2, off => 2)),
  array['d2000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000003'], 'paging with lim/off');
select is((select count(*)::integer from public.search_public(lim => 0)), 1, 'lim is clamped to at least 1');

select * from finish();
rollback;
