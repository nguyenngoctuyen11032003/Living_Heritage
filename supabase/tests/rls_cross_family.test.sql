-- NT07: no access across families; viewers only see shared stories; the narrator user sees only their
-- own narrator's content; anon sees nothing private. Also schema-wide RLS / function hygiene checks.
begin;
create extension if not exists pgtap with schema extensions;
select plan(48);

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

-- ===== Schema hygiene =====
select is((select count(*)::integer from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity), 0,
  'every public table has RLS enabled');
select is((select count(*)::integer from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)), 0,
  'every security definer function pins search_path to empty');
select is((select count(*)::integer from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef and p.proname not like 't\_%'
      and has_function_privilege('anon', p.oid, 'execute')), 0,
  'anon cannot execute any security definer function');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'insert'), 'clients cannot insert audit_log');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'update'), 'is_admin is not user-updatable');
select ok(not has_column_privilege('authenticated', 'public.narrators', 'user_id', 'update'), 'narrators.user_id is set only by RPCs');
select ok(not has_table_privilege('anon', 'public.stories', 'select'), 'anon has no privilege on stories');
select is((select display_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'Chủ A',
  'profile created by trigger with display_name from metadata');
select is((select locale from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'vi', 'locale defaults to vi');

-- ===== Owner of B looks at family A =====
set local role authenticated;
select public.t_as('55555555-5555-4555-8555-555555555555');
select is((select count(*)::integer from public.families), 1, 'O2 sees only their own family');
select is((select count(*)::integer from public.stories where family_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 0, 'O2 sees no stories of A');
select is((select count(*)::integer from public.narrators where family_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 0, 'O2 sees no narrators of A');
select is((select count(*)::integer from public.recordings where family_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 0, 'O2 sees no recordings of A');
select is((select count(*)::integer from public.sessions where family_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 0, 'O2 sees no sessions of A');
select is((select count(*)::integer from public.family_members where family_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 0, 'O2 sees no members of A');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings' and name like 'aaaaaaaa%'), 0,
  'O2 cannot see A''s audio objects');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings' and name like 'bbbbbbbb%'), 1,
  'O2 sees their own audio object');
select is(left(public.t_err($$insert into public.stories (family_id, narrator_id, title) values
    ('aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001', 'x')$$), 5), '42501',
  'O2 cannot insert a story into A');
select is(left(public.t_err($$insert into public.narrators (family_id, display_name) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'x')$$), 5),
  '42501', 'O2 cannot add a narrator to A');
select is(public.t_err($$select public.create_narrator_link('a1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found',
  'O2 cannot create a link for A''s narrator');
select is(public.t_err($$select public.save_story_draft('d1000000-0000-4000-8000-000000000001', 'x', null, 'x', '{}')$$), 'P0002 not_found',
  'O2 cannot edit A''s story');
select is(public.t_err($$select public.can_upload_recording_object('aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/z.webm')::text$$),
  'ok', 'upload check runs');
select ok(not public.can_upload_recording_object('aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/z.webm'),
  'O2 may not upload into A''s recordings folder');
select is(left(public.t_err($$insert into storage.objects (bucket_id, name) values
    ('recordings', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/z.webm')$$), 5), '42501',
  'storage rejects O2''s upload into A');

-- ===== Viewer of A =====
select public.t_as('22222222-2222-4222-8222-222222222222');
select is((select array_agg(id::text order by id) from public.stories),
  array['d2000000-0000-4000-8000-000000000002'], 'viewer sees only the family-visible story of A');
select is((select count(*)::integer from public.recordings), 0, 'viewer cannot see a recording behind a private story');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings'), 0, 'viewer cannot read private audio objects');
select is(left(public.t_err($$insert into public.stories (family_id, narrator_id, title) values
    ('aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001', 'x')$$), 5), '42501',
  'viewer cannot insert stories');
select is((select count(*)::integer from public.family_members), 3, 'viewer sees the member list of A');
select is((select count(*)::integer from public.audit_log), 0, 'viewer cannot read the audit log');

-- ===== Editor of A =====
select public.t_as('33333333-3333-4333-8333-333333333333');
select is((select count(*)::integer from public.stories), 3, 'editor sees all three stories of A');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings'), 1, 'editor reads A''s audio object');
select is(public.t_err($$insert into public.stories (family_id, narrator_id, title) values
    ('aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002', 'Mới')$$), 'ok', 'editor can insert a story');
select is(left(public.t_err($$insert into public.stories (family_id, narrator_id, title) values
    ('aaaaaaaa-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-000000000001', 'x')$$), 5), '23503',
  'a story cannot point at another family''s narrator');

-- ===== Narrator device of nA =====
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is((select array_agg(id::text order by id) from public.stories),
  array['d1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002'],
  'narrator user sees only their narrator''s stories (private ones included)');
select is((select count(*)::integer from public.narrators), 1, 'narrator user sees only their own narrator row');
select is((select count(*)::integer from public.family_members), 0, 'narrator user cannot see family members');
select is((select count(*)::integer from public.families), 1, 'narrator user can read the family name');
select is((select count(*)::integer from storage.objects where bucket_id = 'recordings'), 1, 'narrator user reads their own audio');
select is(public.t_err($$insert into public.sessions (family_id, narrator_id) values
    ('aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001')$$), 'ok', 'narrator user starts a session');
select is(left(public.t_err($$insert into public.sessions (family_id, narrator_id) values
    ('aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002')$$), 5), '42501',
  'narrator user cannot start a session for another narrator');
select is(public.t_err($$insert into storage.objects (bucket_id, name) values
    ('recordings', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/new.webm')$$), 'ok',
  'narrator user uploads into their narrator folder');
select is(left(public.t_err($$insert into storage.objects (bucket_id, name) values
    ('recordings', 'aaaaaaaa-0000-4000-8000-00000000000a/a2000000-0000-4000-8000-000000000002/new.webm')$$), 5), '42501',
  'narrator user cannot upload into another narrator''s folder');
select is(public.t_err($$select public.create_narrator_link('a1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found',
  'narrator user cannot create links');
select is(public.t_err($$select public.create_family('Mới')$$), '42501 anonymous_not_allowed', 'anonymous users cannot create families');

-- ===== Another anonymous device =====
select public.t_as('77777777-7777-4777-8777-777777777777', true);
select is((select count(*)::integer from public.stories), 0, 'an unbound anonymous user sees no stories');

-- ===== anon role =====
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(left(public.t_err('select count(*) from public.stories'), 5), '42501', 'anon cannot query stories');
select is((select count(*)::integer from public.topics), 6, 'anon reads the topic catalogue');

select * from finish();
rollback;
