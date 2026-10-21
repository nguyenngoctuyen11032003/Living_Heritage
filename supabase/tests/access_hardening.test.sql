-- Migration 20261022000400_access_hardening: private story photos stay private from viewers (B9/B11), a story
-- cannot borrow another family's recording (NT07/NT08), admin reads private content only for a pending review and
-- the preview is logged (B11), audit rows carry role/version/scope (B12), deletion requests follow
-- open → processing → done and stay inside their family (B12).
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- O1 owner A, V1 viewer A, E1 editor A, N1 narrator device A, O2 owner B, ADM admin.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now()),
  ('22222222-2222-4222-8222-222222222222', 'viewer.a@test.dev', '{}', false, now()),
  ('33333333-3333-4333-8333-333333333333', 'editor.a@test.dev', '{}', false, now()),
  ('44444444-4444-4444-8444-444444444444', null, '{}', true, now()),
  ('55555555-5555-4555-8555-555555555555', 'owner.b@test.dev', '{}', false, now()),
  ('66666666-6666-4666-8666-666666666666', 'admin@test.dev', '{}', false, now());
update public.profiles set is_admin = true where id = '66666666-6666-4666-8666-666666666666';
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'B', '55555555-5555-4555-8555-555555555555');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'viewer'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'editor'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Bà Tư', '44444444-4444-4444-8444-444444444444'),
  ('a2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Ông Hai', null),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Ông Năm', null);
insert into public.sessions (id, family_id, narrator_id) values
  ('5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001');
insert into public.recordings (id, family_id, narrator_id, session_id, storage_path) values
  ('ca000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   '5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/rec-a.webm');
insert into public.stories (id, family_id, narrator_id, kind, title, body, visibility) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'Riêng tư', 'Nội dung riêng', 'private'),
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'story', 'Cả nhà', 'Nội dung chung', 'family');
insert into public.story_photos (story_id, family_id, storage_path) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/private.jpg'),
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/shared.jpg');
insert into storage.objects (bucket_id, name) values
  ('media', 'aaaaaaaa-0000-4000-8000-00000000000a/private.jpg'),
  ('media', 'aaaaaaaa-0000-4000-8000-00000000000a/shared.jpg'),
  ('media', 'aaaaaaaa-0000-4000-8000-00000000000a/orphan.jpg');

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

-- ===== 1. media files follow the story =====
select public.t_as('22222222-2222-4222-8222-222222222222');
select is((select array_agg(name order by name) from storage.objects where bucket_id = 'media'),
  array['aaaaaaaa-0000-4000-8000-00000000000a/shared.jpg'],
  'a viewer sees only the photo of the family-shared story (not the private one, not orphans)');
select public.t_as('33333333-3333-4333-8333-333333333333');
select is((select count(*)::integer from storage.objects where bucket_id = 'media'), 3, 'an editor reads every family media file');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is((select count(*)::integer from storage.objects where bucket_id = 'media'), 2, 'the narrator device reads its story photos');
select public.t_as('55555555-5555-4555-8555-555555555555');
select is((select count(*)::integer from storage.objects where bucket_id = 'media'), 0, 'another family reads no media file');

-- ===== 2. a story cannot borrow another family's (or narrator's) recording =====
select public.t_as('55555555-5555-4555-8555-555555555555');
select is(public.t_err($$insert into public.stories (family_id, narrator_id, recording_id, title, body)
    values ('bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
            'ca000000-0000-4000-8000-000000000001', 'Mượn', '...')$$),
  '22023 recording_mismatch', 'family B cannot attach family A''s recording to its story');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err($$insert into public.stories (family_id, narrator_id, recording_id, title, body)
    values ('aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
            'ca000000-0000-4000-8000-000000000001', 'Khác người kể', '...')$$),
  '22023 recording_mismatch', 'a story cannot use another narrator''s recording');
select is(public.t_err($$insert into public.stories (family_id, narrator_id, recording_id, title, body)
    values ('aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
            'ca000000-0000-4000-8000-000000000001', 'Đúng nguồn', '...')$$),
  'ok', 'a story of the recording''s own narrator is accepted');

-- ===== 3. admin: only pending reviews, preview logged =====
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select ok(public.approve_story('d1000000-0000-4000-8000-000000000001') > 0, 'the narrator approves');
select set_config('test.req', public.request_publish('d1000000-0000-4000-8000-000000000001')::text, true);

select public.t_as('66666666-6666-4666-8666-666666666666');
select is((select count(*)::integer from public.stories), 1, 'the admin reads the story under pending review');
select is((public.preview_public_item('d1000000-0000-4000-8000-000000000001') ->> 'title'), 'Riêng tư', 'the admin previews it');
select is((select details ->> 'reason' from public.audit_log where action = 'admin_preview'), 'publish_review',
  'the admin preview is logged with its reason');
select is((select actor_role from public.audit_log where action = 'admin_preview'), 'admin', 'with the admin role');
select is(public.review_publish(current_setting('test.req')::uuid, false, 'Chưa phù hợp'), null, 'the admin rejects');
select is((select count(*)::integer from public.stories), 0, 'after the review the admin no longer reads the private story');
select is((select count(*)::integer from public.story_share_settings), 0, 'nor its share settings');
select is(public.t_err($$select public.preview_public_item('d1000000-0000-4000-8000-000000000001')$$), 'P0002 not_found',
  'nor previews it');

-- ===== 4. audit rows carry role, version and scope =====
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select actor_role || '/' || (details ->> 'version') || '/' || (details ->> 'scope')
    from public.audit_log where action = 'request_publish'), 'narrator/2/private',
  'request_publish row: narrator role, story version 2, scope private');
select is((select actor_role from public.audit_log where action = 'reject_publish'), 'admin', 'review rows carry the admin role');

-- ===== 5. deletion requests =====
select public.t_as('55555555-5555-4555-8555-555555555555');
select is(public.t_err($$insert into public.deletion_requests (family_id, story_id, reason)
    values ('bbbbbbbb-0000-4000-8000-00000000000b', 'd1000000-0000-4000-8000-000000000001', 'xóa giúp')$$),
  '22023 story_not_in_family', 'family B cannot file a deletion request for family A''s story');
select public.t_as('22222222-2222-4222-8222-222222222222');
insert into public.deletion_requests (family_id, story_id, reason)
  values ('aaaaaaaa-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000002', 'xóa giúp');
select is((select status from public.deletion_requests), 'open', 'a new request is received (open)');

select public.t_as('66666666-6666-4666-8666-666666666666');
update public.deletion_requests set status = 'processing';
select is((select status || '/' || coalesce(resolved_at::text, '-') from public.deletion_requests), 'processing/-',
  'processing is a valid, unfinished state');
select is(public.t_err($$update public.deletion_requests set status = 'done'$$), '22023 erase_required',
  'a story request cannot be marked done by hand (it must go through admin_process_deletion)');
select count(*) from public.admin_process_deletion((select id from public.deletion_requests));
select ok((select resolved_at is not null and resolved_by = '66666666-6666-4666-8666-666666666666' from public.deletion_requests),
  'done stamps resolved_at / resolved_by');
select is((select string_agg(details ->> 'to', ',' order by id) from public.audit_log where action = 'deletion_status'), 'processing,done',
  'every status change is logged');
select is(public.t_err($$update public.deletion_requests set status = 'archived'$$), '23514 new row for relation "deletion_requests" violates check constraint "deletion_requests_status_check"',
  'unknown statuses are rejected');

select * from finish();
rollback;
