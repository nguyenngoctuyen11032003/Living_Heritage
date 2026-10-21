-- Di Sản Sống spec 1 §3, §8: data behind the ai-process Edge Function — job queue (idempotent per
-- recording + kind), daily quota and a content-free usage log.
-- Clients only read their jobs; every write is done by the Edge Function with the service role.
-- ai_quota_consume / ai_quota_refund are executable by service_role only: the function passes the user
-- id it verified from the caller's JWT.

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  family_id uuid,
  narrator_id uuid,
  kind text not null default 'transcribe_and_draft' check (kind ~ '^[a-z_]{1,40}$'),
  status public.job_status not null default 'queued',
  error text check (error is null or char_length(error) <= 500),
  attempts integer not null default 0 check (attempts between 0 and 100),
  story_ids uuid[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recording_id, kind)
);
create index ai_jobs_status_idx on public.ai_jobs (status, updated_at);
create index ai_jobs_family_idx on public.ai_jobs (family_id);
comment on column public.ai_jobs.error is 'Error code: quota_exceeded | ai_unavailable | audio_too_large | forbidden | not_found (+ optional detail).';

create table public.ai_quota (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
comment on table public.ai_quota is 'AI requests per user per day (Asia/Ho_Chi_Minh). Written only by ai_quota_consume/refund.';

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  job_id uuid references public.ai_jobs (id) on delete set null,
  action text not null check (action ~ '^[a-z_]{1,40}$'),
  model text check (model is null or char_length(model) <= 100),
  status text not null check (status ~ '^[a-z_]{1,40}$'),
  latency_ms integer not null default 0 check (latency_ms between 0 and 3600000),
  input_bytes integer not null default 0 check (input_bytes >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
comment on table public.ai_usage is 'One row per AI call: metadata only, never audio, transcript or output content.';

-- Fill family/narrator from the recording so the job's RLS cannot drift from its recording.
create or replace function public.lh_ai_job_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select r.family_id, r.narrator_id into new.family_id, new.narrator_id
  from public.recordings r where r.id = new.recording_id;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger ai_jobs_fill before insert or update on public.ai_jobs
  for each row execute function public.lh_ai_job_fill();

alter table public.ai_jobs enable row level security;
alter table public.ai_quota enable row level security;
alter table public.ai_usage enable row level security;

revoke all on public.ai_jobs, public.ai_quota, public.ai_usage from public, anon, authenticated;
grant select on public.ai_jobs to authenticated;
grant select on public.ai_usage to authenticated;

create policy "ai_jobs: family members and narrator user read" on public.ai_jobs
  for select to authenticated
  using (public.is_family_member(family_id) or public.is_narrator_user(narrator_id) or public.is_admin());
create policy "ai_usage: admin read" on public.ai_usage
  for select to authenticated
  using (public.is_admin());

-- Takes one request from p_user's quota for today when fewer than p_limit were used. Atomic.
-- Returns true when allowed. Also prunes quota rows older than 60 days.
create or replace function public.ai_quota_consume(p_user uuid, p_limit integer)
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
  if p_user is null or p_limit is null or p_limit < 0 or p_limit > 10000 then
    raise exception using errcode = '22023', message = 'invalid_argument';
  end if;
  delete from public.ai_quota q where q.day < v_today - 60;
  if p_limit = 0 then
    return false;
  end if;
  insert into public.ai_quota as q (user_id, day, used, updated_at)
  values (p_user, v_today, 1, now())
  on conflict (user_id, day) do update
    set used = q.used + 1, updated_at = now()
    where q.used < p_limit
  returning q.used into v_used;
  return v_used is not null;
end;
$$;

-- Gives back one request of today's quota (after a failed AI call).
create or replace function public.ai_quota_refund(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.ai_quota q
    set used = greatest(q.used - 1, 0), updated_at = now()
    where q.user_id = p_user and q.day = (now() at time zone 'Asia/Ho_Chi_Minh')::date;
end;
$$;

revoke execute on function public.lh_ai_job_fill(), public.ai_quota_consume(uuid, integer), public.ai_quota_refund(uuid)
  from public, anon, authenticated;
grant execute on function public.ai_quota_consume(uuid, integer), public.ai_quota_refund(uuid) to service_role;
