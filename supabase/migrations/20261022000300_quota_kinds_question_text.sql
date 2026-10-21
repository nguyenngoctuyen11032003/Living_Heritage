-- 1. Separate daily quotas per kind of AI request, so reading questions aloud (tts) cannot use up the
--    transcription/draft allowance (ai). ai_quota_consume/refund keep their signatures and count kind 'ai'.
-- 2. recordings.question_text: the exact question the narrator answered (AI follow-ups have no questions row).

alter table public.ai_quota
  add column kind text not null default 'ai' check (kind in ('ai', 'tts'));
alter table public.ai_quota drop constraint ai_quota_pkey;
alter table public.ai_quota add primary key (user_id, day, kind);

create or replace function public.ai_quota_consume_kind(p_user uuid, p_kind text, p_limit integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_used integer;
begin
  if p_user is null or p_limit is null or p_limit < 0 or p_limit > 10000 or p_kind is null or p_kind not in ('ai', 'tts') then
    raise exception using errcode = '22023', message = 'invalid_argument';
  end if;
  delete from public.ai_quota q where q.day < v_today - 60;
  if p_limit = 0 then
    return false;
  end if;
  insert into public.ai_quota as q (user_id, day, kind, used, updated_at)
  values (p_user, v_today, p_kind, 1, now())
  on conflict (user_id, day, kind) do update
    set used = q.used + 1, updated_at = now()
    where q.used < p_limit
  returning q.used into v_used;
  return v_used is not null;
end;
$$;

create or replace function public.ai_quota_refund_kind(p_user uuid, p_kind text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.ai_quota q
    set used = greatest(q.used - 1, 0), updated_at = now()
    where q.user_id = p_user and q.kind = p_kind and q.day = (now() at time zone 'Asia/Ho_Chi_Minh')::date;
end;
$$;

-- The original pair now counts kind 'ai' (the old ON CONFLICT target no longer exists).
create or replace function public.ai_quota_consume(p_user uuid, p_limit integer)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select public.ai_quota_consume_kind(p_user, 'ai', p_limit);
$$;

create or replace function public.ai_quota_refund(p_user uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select public.ai_quota_refund_kind(p_user, 'ai');
$$;

revoke execute on function public.ai_quota_consume_kind(uuid, text, integer), public.ai_quota_refund_kind(uuid, text)
  from public, anon, authenticated;
grant execute on function public.ai_quota_consume_kind(uuid, text, integer), public.ai_quota_refund_kind(uuid, text)
  to service_role;

alter table public.recordings
  add column question_text text check (question_text is null or char_length(question_text) <= 500);
comment on column public.recordings.question_text is 'Question shown to the narrator for this take (seeded or AI follow-up), in their language.';
grant insert (question_text) on public.recordings to authenticated;
