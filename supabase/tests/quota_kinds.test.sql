-- Separate daily quotas for 'ai' and 'tts'; question_text on recordings.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'u@test.dev', '{}', false, now());

select is(public.ai_quota_consume('11111111-1111-4111-8111-111111111111', 1), true, 'ai request allowed');
select is(public.ai_quota_consume('11111111-1111-4111-8111-111111111111', 1), false, 'ai limit reached');
select is(public.ai_quota_consume_kind('11111111-1111-4111-8111-111111111111', 'tts', 1), true, 'tts still allowed after ai limit');
select is(public.ai_quota_consume_kind('11111111-1111-4111-8111-111111111111', 'tts', 1), false, 'tts has its own limit');
select lives_ok($$select public.ai_quota_refund_kind('11111111-1111-4111-8111-111111111111', 'tts')$$, 'tts refund');
select is(public.ai_quota_consume_kind('11111111-1111-4111-8111-111111111111', 'tts', 1), true, 'tts refund gives one back');
select throws_ok($$select public.ai_quota_consume_kind('11111111-1111-4111-8111-111111111111', 'other', 1)$$, '22023', null, 'unknown kind rejected');
select ok(not has_function_privilege('authenticated', 'public.ai_quota_consume_kind(uuid, text, integer)', 'execute'), 'clients cannot consume kind quota');

select * from finish();
rollback;
