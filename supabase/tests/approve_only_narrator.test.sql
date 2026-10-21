-- Only the narrator (or assisted consent while no narrator user exists) can approve a story.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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

set local role authenticated;
select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001')$$), '42501 not_narrator', 'an editor cannot approve');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001')$$), '42501 not_narrator', 'the owner cannot approve');
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001', true)$$), '42501 not_narrator',
  'assisted consent is refused while the narrator has their own device');
select public.t_as('22222222-2222-4222-8222-222222222222');
select is(public.t_err($$select public.approve_story('d2000000-0000-4000-8000-000000000002')$$), '42501 not_narrator', 'a viewer cannot approve');
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found',
  'a viewer does not even see a private story');
select public.t_as('55555555-5555-4555-8555-555555555555');
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found', 'another family cannot approve');
select public.t_as('77777777-7777-4777-8777-777777777777', true);
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found', 'an unbound device cannot approve');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err($$select public.approve_story('d3000000-0000-4000-8000-000000000003')$$), 'P0002 not_found',
  'a narrator cannot approve another narrator''s story');
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
select is(public.t_err($$select public.approve_story('d1000000-0000-4000-8000-000000000001')$$), '42501 not_authenticated', 'a user is required');

select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.approve_story('d1000000-0000-4000-8000-000000000001'), 2, 'the narrator approves');
select is((select edit_status::text || '/' || approved_by::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'),
  'approved/44444444-4444-4444-8444-444444444444', 'approved by the narrator');
select is((select edit_status::text || '/' || note from public.story_versions where story_id = 'd1000000-0000-4000-8000-000000000001' and version = 2),
  'approved/narrator', 'an approved version snapshot is stored');
select is(public.approve_story('d1000000-0000-4000-8000-000000000001'), 2, 'approving again is idempotent');
select is(left(public.t_err($$update public.stories set edit_status = 'approved' where id = 'd2000000-0000-4000-8000-000000000002'$$), 5), '42501',
  'edit_status cannot be set directly');
select is(public.save_story_draft('d1000000-0000-4000-8000-000000000001', 'Chuyện Tết xưa', 'Tóm tắt', 'Sửa một chút', '{}'), 3,
  'the narrator edits (version 3)');
select is((select edit_status::text || '/' || coalesce(approved_by::text, '-') from public.stories where id = 'd1000000-0000-4000-8000-000000000001'),
  'pending_review/-', 'an edit clears the approval');

-- Narrator nA2 has no device: assisted consent by owner/manager only.
select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.t_err($$select public.approve_story('d3000000-0000-4000-8000-000000000003', true)$$), '42501 not_narrator',
  'an editor cannot record assisted consent');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err($$select public.approve_story('d3000000-0000-4000-8000-000000000003')$$), '42501 not_narrator',
  'the owner must state assisted consent');
select is(public.t_err($$select public.approve_story('d3000000-0000-4000-8000-000000000003', true)$$), '22023 invalid_consent_method',
  'a bare consent checkbox is not enough: the method is required');
select is(public.t_err($$select public.approve_story('d3000000-0000-4000-8000-000000000003', true, 'assisted_in_person')$$),
  '22023 helper_relation_required', 'and so is the helper');
select is(public.approve_story('d3000000-0000-4000-8000-000000000003', true, 'assisted_in_person', 'Cháu nội'), 2,
  'the owner approves with recorded assisted consent');
select is((select details ->> 'method' from public.audit_log where action = 'approve_story' and target_id = 'd3000000-0000-4000-8000-000000000003'),
  'assisted', 'assisted consent is logged');

select * from finish();
rollback;
