-- Migration 20261022000600_pilot_admin_ops: pilot events (B17/NT17), content counts (NT11), admin takedown (B11),
-- question library management (B4), deletion erase RPC (B12), consent method and helper on approval (B11/B13).
begin;
create extension if not exists pgtap with schema extensions;
select plan(50);

-- O1 owner A, V1 viewer A, N1 narrator device (nA1), O2 owner B, ADM admin.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now()),
  ('22222222-2222-4222-8222-222222222222', 'viewer.a@test.dev', '{}', false, now()),
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
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Bà Tư', '44444444-4444-4444-8444-444444444444'),
  ('a2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Ông Hai', null),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Ông Năm', null);
insert into public.sessions (id, family_id, narrator_id) values
  ('5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001'),
  ('5b000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001');
insert into public.recordings (id, family_id, narrator_id, session_id, storage_path) values
  ('ca000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   '5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/r1.webm'),
  ('cb000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   '5b000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b/b1000000-0000-4000-8000-000000000001/rb.webm');
insert into public.transcripts (recording_id, text) values ('ca000000-0000-4000-8000-000000000001', 'Lời kể');
-- s1 story + s2 experience from the same recording (approved), s3 approved text-only, s4 draft,
-- s5/s6 pending for the device-less narrator nA2, s7 pending for nA1, sB in family B.
insert into public.stories (id, family_id, narrator_id, recording_id, kind, title, body, visibility, edit_status) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'ca000000-0000-4000-8000-000000000001', 'story', 'S1', 'b', 'public', 'approved'),
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'ca000000-0000-4000-8000-000000000001', 'experience', 'S2', 'b', 'family', 'approved'),
  ('d3000000-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   null, 'story', 'S3', 'b', 'family', 'approved'),
  ('d4000000-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   null, 'story', 'S4', 'b', 'private', 'draft'),
  ('d5000000-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
   null, 'story', 'S5', 'b', 'private', 'pending_review'),
  ('d6000000-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
   null, 'story', 'S6', 'b', 'private', 'pending_review'),
  ('d7000000-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   null, 'story', 'S7', 'b', 'private', 'pending_review'),
  ('db000000-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   'cb000000-0000-4000-8000-000000000001', 'story', 'SB', 'b', 'family', 'draft');
insert into public.story_photos (story_id, family_id, storage_path) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg');
insert into public.public_items (id, story_id, kind, title, body, narrator_label, audio_allowed, audio_path) values
  ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'story', 'S1', 'b', 'Bà Tư', true,
   'items/e1000000-0000-4000-8000-000000000001.webm');
insert into public.publish_requests (story_id, family_id, status) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'approved');
insert into public.reports (id, public_item_id, reason) values
  ('f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'privacy');
insert into storage.objects (bucket_id, name) values
  ('recordings', 'bbbbbbbb-0000-4000-8000-00000000000b/b1000000-0000-4000-8000-000000000001/rb.webm'),
  ('media', 'bbbbbbbb-0000-4000-8000-00000000000b/orphan.jpg');

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

-- ===== 1. Pilot events =====
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select lives_ok($$select public.log_event('search', 'P-02', '2026.10')$$, 'anon logs an event');
select is(public.t_err($$select public.log_event('read_story_text')$$), '22023 invalid_event', 'unknown event codes are refused');
select is(public.t_err($$select public.log_event('search', 'P 01; drop')$$), '22023 invalid_participant',
  'malformed participant codes are refused');
select is(left(public.t_err($$select count(*) from public.app_events$$), 5), '42501', 'anon cannot read app_events');
select is(public.t_err($$select public.pilot_summary()$$), '42501 permission denied for function pilot_summary',
  'anon cannot call pilot_summary');
reset role;

set local role authenticated;
select public.t_as('11111111-1111-4111-8111-111111111111');
select public.log_event('topic_start', 'P-01');
select public.log_event('help_opened', 'P-01');
select public.log_event('approve', 'P-01');
select is(public.t_err($$insert into public.app_events (code) values ('search')$$) like '42501%', true,
  'clients cannot insert app_events directly');
select is(public.t_err($$select public.pilot_summary()$$), '42501 forbidden', 'a family owner cannot read the pilot summary');
select is(public.t_err($$select public.content_counts()$$), '42501 forbidden', 'nor the content counts');
select public.t_as('22222222-2222-4222-8222-222222222222');
select count(public.log_event('search')) from generate_series(1, 125);
reset role;
select is((select count(*)::integer from public.app_events where user_id = '22222222-2222-4222-8222-222222222222'), 120,
  'one user keeps at most 120 events per minute');
set local role authenticated;

select public.t_as('66666666-6666-4666-8666-666666666666');
select is((select event_count::integer || '/' || completed || '/' || help_opened || '/' || (counts ->> 'approve')
    from public.pilot_summary() where participant_code = 'P-01'), '3/true/1/1', 'P-01: 3 events, completed, help opened once');
select is((select completed from public.pilot_summary() where participant_code = 'P-02'), false, 'P-02 has not completed');
select is((select approved_sources || '/' || approved_items || '/' || public_items || '/' || drafts from public.content_counts()),
  '2/3/1/5', 'content counts: story+card of one recording count as one source');

-- ===== 2. Admin takedown =====
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err($$select public.admin_withdraw_public('e1000000-0000-4000-8000-000000000001', 'gỡ')$$), '42501 forbidden',
  'a family owner cannot use the admin takedown');
select public.t_as('66666666-6666-4666-8666-666666666666');
select is(public.t_err($$select public.admin_withdraw_public('e1000000-0000-4000-8000-000000000001', '  ')$$), '22023 reason_required',
  'a reason is mandatory');
select lives_ok($$select public.admin_withdraw_public('e1000000-0000-4000-8000-000000000001', 'Lộ thông tin riêng')$$,
  'the admin takes the item down');
select is((select count(*)::integer from public.public_items), 0, 'the item is gone from the hub');
select is((select status || '/' || coalesce(public_item_id::text, '-') from public.reports), 'resolved/-',
  'the report is kept and resolved');
select is((select details ->> 'reason' from public.audit_log where action = 'admin_withdraw'), 'Lộ thông tin riêng',
  'the takedown is logged with its reason');
select is((select details ->> 'audio_path' from public.audit_log where action = 'admin_withdraw'),
  'items/e1000000-0000-4000-8000-000000000001.webm', 'with the public audio path to clean up');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select visibility::text from public.stories where id = 'd1000000-0000-4000-8000-000000000001'), 'family',
  'the story is back to family visibility');

-- ===== 3. Question library =====
select is(public.t_err($$insert into public.questions (topic_id, prompt_vi, prompt_en) values
    ('a0000000-0000-4000-8000-000000000001', 'Câu hỏi?', 'Question?')$$) like '42501%', true,
  'a family owner cannot add questions');
select public.t_as('66666666-6666-4666-8666-666666666666');
select lives_ok($$insert into public.questions (topic_id, prompt_vi, prompt_en, sort) values
    ('a0000000-0000-4000-8000-000000000001', 'Câu hỏi mới?', 'New question?', 99)$$,
  'the admin adds a question');
select lives_ok($$update public.questions set active = false where id = 'b0000000-0000-4000-8000-000000000101'$$,
  'the admin disables a question');
select is(left(public.t_err($$delete from public.questions where id = 'b0000000-0000-4000-8000-000000000101'$$), 5), '42501',
  'questions are never deleted, only disabled');
select is((select count(*)::integer from public.questions where id = 'b0000000-0000-4000-8000-000000000101'), 1,
  'the admin still sees the disabled question');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select count(*)::integer from public.questions where id = 'b0000000-0000-4000-8000-000000000101'), 0,
  'signed-in users no longer see it');
reset role;
set local role anon;
select is((select count(*)::integer from public.questions where id = 'b0000000-0000-4000-8000-000000000101'), 0,
  'anon no longer sees it');
reset role;
set local role authenticated;

-- ===== 4. Consent method and helper =====
select public.t_as('11111111-1111-4111-8111-111111111111');
select is(public.t_err($$select public.approve_story('d5000000-0000-4000-8000-000000000005', false, 'assisted_magic', 'Con gái')$$),
  '22023 invalid_consent_method', 'unknown consent methods are refused');
select is(public.t_err($$select public.approve_story('d5000000-0000-4000-8000-000000000005', false, 'assisted_phone', ' ')$$),
  '22023 helper_relation_required', 'the helper relation is required');
select is(public.approve_story('d5000000-0000-4000-8000-000000000005', false, 'assisted_phone', 'Con gái'), 2,
  'the owner records phone-assisted consent');
select is((select note from public.story_versions where story_id = 'd5000000-0000-4000-8000-000000000005' and version = 2),
  'assisted:assisted_phone:Con gái', 'method and helper are stored on the approved version');
select is((select details ->> 'consent_method' || '/' || (details ->> 'helper_relation') from public.audit_log
    where action = 'approve_story' and target_id = 'd5000000-0000-4000-8000-000000000005'),
  'assisted_phone/Con gái', 'and in the audit row');
select is(left(public.t_err($$update public.narrators set consent_method = 'checkbox' where id = 'a2000000-0000-4000-8000-000000000002'$$), 5),
  '23514', 'narrators.consent_method only takes known methods');
update public.narrators set consent_method = 'assisted_in_person', helper_note = 'Cháu nội'
  where id = 'a2000000-0000-4000-8000-000000000002';
select is(public.t_err($$select public.approve_story('d6000000-0000-4000-8000-000000000006', true)$$), '22023 invalid_consent_method',
  'a boolean-only (catch-all checkbox) call is refused, even when the narrator has a stored method');
select is((select edit_status::text from public.stories where id = 'd6000000-0000-4000-8000-000000000006'), 'pending_review',
  'and the story stays unapproved');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.approve_story('d7000000-0000-4000-8000-000000000007'), 2, 'the narrator device approves');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select details ->> 'consent_method' from public.audit_log
    where action = 'approve_story' and target_id = 'd7000000-0000-4000-8000-000000000007'), 'self_device',
  'own-device approval is logged as self_device');

-- ===== 5. Deletion erase =====
select public.t_as('22222222-2222-4222-8222-222222222222');
insert into public.deletion_requests (family_id, story_id, reason) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'd1000000-0000-4000-8000-000000000001', 'xóa S1'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000002', 'xóa S2'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', null, '[account] xóa tài khoản');
select public.t_as('55555555-5555-4555-8555-555555555555');
insert into public.deletion_requests (family_id, story_id, reason) values ('bbbbbbbb-0000-4000-8000-00000000000b', null, 'xóa nhà B');
select is(public.t_err(format('select * from public.admin_process_deletion(%L)',
    (select id from public.deletion_requests where reason = 'xóa nhà B'))), '42501 forbidden', 'only an admin erases');

select public.t_as('66666666-6666-4666-8666-666666666666');
select is((select string_agg(scope, ',' order by scope) from public.deletion_requests), 'account,family,story,story',
  'scope is fixed when the request is filed');
select is(public.t_err($$select * from public.admin_process_deletion('00000000-0000-4000-8000-000000000000')$$),
  'P0002 not_found', 'unknown request');
select set_config('test.r1', (select id::text from public.deletion_requests where reason = 'xóa S1'), true);
select results_eq(format('select bucket, path from public.admin_process_deletion(%L)', current_setting('test.r1')),
  $$values ('media'::text, 'aaaaaaaa-0000-4000-8000-00000000000a/p1.jpg'::text)$$,
  'erasing S1 returns its photo; the recording is kept while S2 still uses it');
select set_config('test.r2', (select id::text from public.deletion_requests where reason = 'xóa S2'), true);
select results_eq(format('select bucket, path from public.admin_process_deletion(%L)', current_setting('test.r2')),
  $$values ('recordings'::text, 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/r1.webm'::text)$$,
  'erasing S2 returns the now-unused recording');
reset role;
select is((select count(*)::integer from public.stories where id in ('d1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002'))
    + (select count(*)::integer from public.recordings where id = 'ca000000-0000-4000-8000-000000000001')
    + (select count(*)::integer from public.transcripts where recording_id = 'ca000000-0000-4000-8000-000000000001'), 0,
  'stories, recording and transcript are gone');
set local role authenticated;
select results_eq(format('select bucket, path from public.admin_process_deletion(%L)', current_setting('test.r2')),
  $$values ('recordings'::text, 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/r1.webm'::text)$$,
  'a repeat call returns the same objects');
update public.deletion_requests set status = 'processing' where id = current_setting('test.r2')::uuid;
select results_eq(format('select bucket, path from public.admin_process_deletion(%L)', current_setting('test.r2')),
  $$values ('recordings'::text, 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/r1.webm'::text)$$,
  'a request reopened after a failed storage cleanup still returns the earlier objects');
select is((select status || '/' || jsonb_array_length(erased_objects) from public.deletion_requests where id = current_setting('test.r2')::uuid),
  'done/1', 'and keeps them stored');
select is(public.t_err(format('select * from public.admin_process_deletion(%L)',
    (select id from public.deletion_requests where scope = 'account'))), '22023 account_scope_not_supported',
  'account erasure is not handled by this RPC');
select set_config('test.rb', (select id::text from public.deletion_requests where reason = 'xóa nhà B'), true);
select is((select count(*)::integer from public.admin_process_deletion(current_setting('test.rb')::uuid)), 2,
  'erasing family B returns its recording and its orphan media file');
reset role;
select is((select count(*)::integer from public.families where id = 'bbbbbbbb-0000-4000-8000-00000000000b'), 0, 'family B is gone');
select is((select status || '/' || coalesce(family_id::text, '-') from public.deletion_requests where id = current_setting('test.rb')::uuid),
  'done/-', 'its request survives as done');

select * from finish();
rollback;
