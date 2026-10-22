-- interest_requests: guests may register interest, only admins read and triage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'user@test.dev', '{}', false, now()),
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
select throws_ok(
  $$insert into public.interest_requests (plan, name, contact, consent) values ('forever', 'Khách', 'khach@example.com', true)$$,
  '23514', null, 'an unknown plan is rejected');
select throws_ok($$select count(*) from public.interest_requests$$, '42501', null, 'a guest cannot read interest requests');

select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated', 'is_anonymous', false)::text, true);
set local role authenticated;
select is((select count(*) from public.interest_requests), 0::bigint, 'a signed-in non-admin sees no interest requests');
select is_empty(
  $$update public.interest_requests set status = 'closed' returning id$$,
  'a non-admin cannot triage interest requests');

select set_config('request.jwt.claims',
  json_build_object('sub', '66666666-6666-4666-8666-666666666666', 'role', 'authenticated', 'is_anonymous', false)::text, true);
select is((select count(*) from public.interest_requests), 1::bigint, 'an admin reads interest requests');
select lives_ok(
  $$update public.interest_requests set status = 'forwarded', resolved_at = now(), resolved_by = auth.uid()$$,
  'an admin can triage interest requests');
reset role;

select * from finish();
rollback;
