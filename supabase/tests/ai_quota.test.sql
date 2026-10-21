-- ai_jobs visibility and idempotency key; the service-role-only quota RPCs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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

select ok(not has_function_privilege('authenticated', 'public.ai_quota_consume(uuid, integer)', 'execute')
  and not has_function_privilege('anon', 'public.ai_quota_consume(uuid, integer)', 'execute'), 'clients cannot consume quota');
select ok(not has_function_privilege('authenticated', 'public.ai_quota_refund(uuid)', 'execute'), 'clients cannot refund quota');
select ok(has_function_privilege('service_role', 'public.ai_quota_consume(uuid, integer)', 'execute'), 'service_role can consume quota');

insert into public.ai_jobs (recording_id, created_by) values ('ca000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444');
select is((select family_id::text || '/' || narrator_id::text from public.ai_jobs),
  'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001', 'family and narrator are filled from the recording');
select is(left(public.t_err($$insert into public.ai_jobs (recording_id) values ('ca000000-0000-4000-8000-000000000001')$$), 5), '23505',
  'one job per recording and kind');

set local role authenticated;
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is((select count(*)::integer from public.ai_jobs), 1, 'the narrator user sees the job');
select is(left(public.t_err($$insert into public.ai_jobs (recording_id, kind) values ('ca000000-0000-4000-8000-000000000001', 'other')$$), 5), '42501',
  'clients cannot create jobs');
select public.t_as('22222222-2222-4222-8222-222222222222');
select is((select count(*)::integer from public.ai_jobs), 1, 'family members see the job');
select public.t_as('55555555-5555-4555-8555-555555555555');
select is((select count(*)::integer from public.ai_jobs), 0, 'other families do not');

reset role;
set local role service_role;
select is(public.ai_quota_consume('11111111-1111-4111-8111-111111111111', 2), true, 'first request allowed');
select is(public.ai_quota_consume('11111111-1111-4111-8111-111111111111', 2), true, 'second request allowed');
select is(public.ai_quota_consume('11111111-1111-4111-8111-111111111111', 2), false, 'third request is over the limit');
select lives_ok($$select public.ai_quota_refund('11111111-1111-4111-8111-111111111111')$$, 'refund');
select is(public.ai_quota_consume('11111111-1111-4111-8111-111111111111', 2), true, 'a refunded request can be used again');
select is(public.ai_quota_consume('22222222-2222-4222-8222-222222222222', 0), false, 'limit 0 allows nothing');
select is(public.t_err($$select public.ai_quota_consume('22222222-2222-4222-8222-222222222222', -1)$$), '22023 invalid_argument',
  'a negative limit is rejected');

select * from finish();
rollback;
