-- Completion migration: narrator helper columns and the 'in_progress' deletion status.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{}', false, now());
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Gia đình A', '11111111-1111-4111-8111-111111111111');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner');

select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;

select lives_ok(
  $$insert into public.narrators (family_id, display_name, assisted_by, consent_method)
    values ('aaaaaaaa-0000-4000-8000-00000000000a', 'Bà nội Lan', 'Con gái Lan', 'Nói trực tiếp và ghi âm')$$,
  'an editor can record the helper and the consent method');

select lives_ok(
  $$insert into public.narrators (family_id, display_name) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'Ông ngoại')$$,
  'both helper columns stay optional');

select throws_ok(
  $$insert into public.narrators (family_id, display_name, assisted_by) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'Cụ Tư', '   ')$$,
  '23514', null, 'a blank helper is rejected');

select throws_ok(
  $$insert into public.narrators (family_id, display_name, consent_method)
    values ('aaaaaaaa-0000-4000-8000-00000000000a', 'Cụ Năm', repeat('x', 201))$$,
  '23514', null, 'an over-long consent method is rejected');

select lives_ok(
  $$insert into public.deletion_requests (family_id, reason) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'Xoá toàn bộ')$$,
  'a family owner files a deletion request');

reset role;
select lives_ok(
  $$update public.deletion_requests set status = 'in_progress' where family_id = 'aaaaaaaa-0000-4000-8000-00000000000a'$$,
  'a deletion request can be marked in_progress');

-- interest_requests: guests may register interest, only admins read.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('66666666-6666-4666-8666-666666666666', 'admin@test.dev', '{}', false, now());
update public.profiles set is_admin = true where id = '66666666-6666-4666-8666-666666666666';

select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select lives_ok(
  $$insert into public.interest_requests (plan, topic, format, name, contact, message, consent)
    values ('year', 'Kho cá', 'question', 'Khách', 'khach@example.com', 'Quan tâm gói năm', true)$$,
  'a guest can register interest with consent');

select throws_ok(
  $$insert into public.interest_requests (name, contact, consent) values ('Khách', 'khach@example.com', false)$$,
  '23514', null, 'interest without consent is rejected');

select throws_ok($$select count(*) from public.interest_requests$$, '42501', null, 'a guest cannot read interest requests');

select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
select is((select count(*) from public.interest_requests), 0::bigint, 'a signed-in non-admin sees no interest requests');

select set_config('request.jwt.claims',
  json_build_object('sub', '66666666-6666-4666-8666-666666666666', 'role', 'authenticated', 'is_anonymous', false)::text, true);
select is((select count(*) from public.interest_requests), 1::bigint, 'an admin reads interest requests');
reset role;

select * from finish();
rollback;
