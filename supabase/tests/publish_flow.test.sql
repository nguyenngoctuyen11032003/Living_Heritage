-- NT06 (drafts never public, approval is not publication) and NT09 (withdraw), plus auto-withdraw on edit,
-- reject, and share settings tightening a live public item.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

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
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err($$select public.request_publish('d1000000-0000-4000-8000-000000000001')$$), '22023 story_not_approved',
  'a draft cannot be requested for publication');
select is((select count(*)::integer from public.public_items), 0, 'no public items exist for drafts');
select is((select count(*)::integer from public.search_public()), 0, 'search finds no drafts');
select is(public.approve_story('d1000000-0000-4000-8000-000000000001'), 2, 'the narrator approves (version 2)');
select is((select visibility::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'), 'private',
  'approval does not change visibility');
select is((select count(*)::integer from public.public_items), 0, 'approval alone publishes nothing');

select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.t_err($$select public.request_publish('d1000000-0000-4000-8000-000000000001')$$), '42501 forbidden',
  'an editor cannot request publication');

select public.t_as('44444444-4444-4444-8444-444444444444', true);
select set_config('test.req', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select is(public.request_publish('d1000000-0000-4000-8000-000000000001')::text, current_setting('test.req'),
  'a second request returns the pending one');
select is((select status::text from public.publish_requests where id = current_setting('test.req')::uuid), 'pending', 'the request is pending');
select ok(exists (select 1 from public.story_share_settings where story_id = 'd1000000-0000-4000-8000-000000000001'),
  'default share settings were created');

select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err(format('select public.review_publish(%L, true)', current_setting('test.req'))), '42501 forbidden',
  'only admins review');
select is((select count(*)::integer from public.public_items), 0, 'still nothing public');

select public.t_as('66666666-6666-4666-8666-666666666666');
select is((select array_agg(id::text) from public.stories), array['d1000000-0000-4000-8000-000000000001'],
  'the admin sees only stories with a publish request');
select is((public.preview_public_item('d1000000-0000-4000-8000-000000000001') ->> 'narrator_label'), 'Người kể ẩn danh',
  'the admin can preview the exact public snapshot');
select ok(public.review_publish(current_setting('test.req')::uuid, true, 'ok') is not null, 'the admin approves and gets the item id');
select is((select status::text from public.publish_requests where id = current_setting('test.req')::uuid), 'approved', 'request approved');
select is((select visibility::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'), 'public', 'the story is public');
select is((select narrator_label from public.public_items), 'Người kể ẩn danh', 'no pen name and real name hidden: anonymous label');
select is((select region from public.public_items), 'nam', 'region is shown by default');
select is((select audio_allowed from public.public_items), false, 'audio is off by default');
select is(public.t_err(format('select public.review_publish(%L, true)', current_setting('test.req'))), '22023 request_not_pending',
  'a request is reviewed once');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is((select count(*)::integer from public.public_items), 1, 'anon reads the public item');
select is((select count(*)::integer from public.search_public('tet xua')), 1, 'anon finds it by unaccented search');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'public_items'
    and column_name in ('family_id', 'narrator_id')), 'public_items exposes no family or narrator id');

-- ===== Edit after publication withdraws automatically =====
reset role;
set local role authenticated;
select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.save_story_draft('d1000000-0000-4000-8000-000000000001', 'Chuyện Tết xưa (sửa)', null, 'Ngày xưa, sửa lại...', '{}'), 3,
  'an edit creates version 3');
select is((select count(*)::integer from public.public_items), 0, 'editing a public story removes it from the hub');
select is((select visibility::text || '/' || edit_status::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'),
  'family/pending_review', 'the story is back to family / pending review');
select is((select status::text from public.publish_requests where id = current_setting('test.req')::uuid), 'withdrawn', 'the request is withdrawn');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select count(*)::integer from public.audit_log where action = 'auto_withdraw' and target_id = 'd1000000-0000-4000-8000-000000000001'), 1,
  'the auto-withdraw is logged');
select is((select count(*)::integer from public.story_versions where story_id = 'd1000000-0000-4000-8000-000000000001'), 3, 'all versions are kept');

-- ===== NT09: withdraw =====
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.approve_story('d1000000-0000-4000-8000-000000000001'), 4, 're-approved as version 4');
select set_config('test.req2', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select ok(public.review_publish(current_setting('test.req2')::uuid, true) is not null, 'published again');
select public.t_as('22222222-2222-4222-8222-222222222222');
select is(public.t_err($$select public.withdraw_public('d1000000-0000-4000-8000-000000000001')$$), '42501 forbidden', 'a viewer cannot withdraw');
select public.t_as('55555555-5555-4555-8555-555555555555');
select is(public.t_err($$select public.withdraw_public('d1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found',
  'another family cannot withdraw');
select public.t_as('11111111-1111-4111-8111-111111111111');
select lives_ok($$select public.withdraw_public('d1000000-0000-4000-8000-000000000001')$$, 'the owner withdraws');
select is((select count(*)::integer from public.public_items), 0, 'the withdrawn item is gone');
select is((select visibility::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'), 'family', 'the story is family-visible again');
select is((select status::text from public.publish_requests where id = current_setting('test.req2')::uuid), 'withdrawn', 'the request is withdrawn');
select is((select count(*)::integer from public.audit_log where action = 'withdraw_public'), 1, 'the withdrawal is logged');

-- ===== Reject =====
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select set_config('test.req3', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select is(public.review_publish(current_setting('test.req3')::uuid, false, 'Thiếu nguồn'), null, 'reject returns null');
select is((select status::text from public.publish_requests where id = current_setting('test.req3')::uuid), 'rejected', 'the request is rejected');
select is((select count(*)::integer from public.public_items), 0, 'a rejected request publishes nothing');

-- ===== Share settings =====
select public.t_as('11111111-1111-4111-8111-111111111111');
update public.story_share_settings set show_real_name = true where story_id = 'd1000000-0000-4000-8000-000000000001';
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select set_config('test.req4', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);
select public.t_as('66666666-6666-4666-8666-666666666666');
select ok(public.review_publish(current_setting('test.req4')::uuid, true) is not null, 'published with the real name allowed');
select is((select narrator_label from public.public_items), 'Nguyễn Văn Ba', 'the real name is shown when allowed');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
update public.story_share_settings set show_real_name = false, show_region = false
  where story_id = 'd1000000-0000-4000-8000-000000000001';
select is((select narrator_label || '/' || coalesce(region, '-') from public.public_items), 'Người kể ẩn danh/-',
  'turning settings off applies to the public item at once');
update public.story_share_settings set show_region = true where story_id = 'd1000000-0000-4000-8000-000000000001';
select is((select coalesce(region, '-') from public.public_items), '-', 'turning a setting on needs a new review');

select public.t_as('11111111-1111-4111-8111-111111111111');
select is(left(public.t_err($$update public.stories set visibility = 'public' where id = 'd2000000-0000-4000-8000-000000000002'$$), 5), '42501',
  'visibility public is reachable only through review');
select is(public.t_err($$update public.stories set visibility = 'private' where id = 'd1000000-0000-4000-8000-000000000001'$$), 'ok',
  'a direct update on a public story matches no row');
select is((select visibility::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'), 'public',
  'withdraw_public is the only way down');

select * from finish();
rollback;
