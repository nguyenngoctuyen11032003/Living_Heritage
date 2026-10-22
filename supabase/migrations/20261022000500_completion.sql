-- Completion pass (additive, backwards compatible):
--  1. narrators.assisted_by / consent_method (B11/B13): who helps a narrator and how consent is confirmed.
--  2. deletion_requests.status gains 'in_progress' (B12: received -> in progress -> done).

alter table public.narrators
  add column assisted_by text check (assisted_by is null or char_length(btrim(assisted_by)) between 1 and 120),
  add column consent_method text check (consent_method is null or char_length(btrim(consent_method)) between 1 and 200);

comment on column public.narrators.assisted_by is 'Name/relation of the person who helps this narrator operate the app (B11). Null when the narrator acts alone.';
comment on column public.narrators.consent_method is 'How the narrator''s consent is confirmed when assisted (e.g. spoken on a recording, in person). Null when not recorded.';

grant insert (assisted_by, consent_method) on public.narrators to authenticated;
grant update (assisted_by, consent_method) on public.narrators to authenticated;

alter table public.deletion_requests drop constraint deletion_requests_status_check;
alter table public.deletion_requests
  add constraint deletion_requests_status_check check (status in ('open', 'in_progress', 'done', 'rejected'));

-- 3. interest_requests: "register interest" for guests (no sign-in, no published item needed).
--    Mirrors connect_requests / reports: anon+authenticated may only insert; only admins read and triage.
create table public.interest_requests (
  id uuid primary key default gen_random_uuid(),
  plan text check (plan is null or plan in ('month', 'year', 'book')),
  topic text check (topic is null or char_length(btrim(topic)) between 1 and 120),
  format text check (format is null or char_length(format) <= 40),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  contact text not null check (char_length(btrim(contact)) between 3 and 200),
  message text check (message is null or char_length(message) <= 1000),
  consent boolean not null check (consent = true),
  status text not null default 'new' check (status in ('new', 'forwarded', 'closed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index interest_requests_status_idx on public.interest_requests (status, created_at);

alter table public.interest_requests enable row level security;
revoke all on public.interest_requests from public, anon, authenticated;
grant insert (plan, topic, format, name, contact, message, consent) on public.interest_requests to anon, authenticated;
grant select on public.interest_requests to authenticated;
grant update (status, resolved_at, resolved_by) on public.interest_requests to authenticated;

create policy "interest_requests: anyone insert" on public.interest_requests
  for insert to anon, authenticated with check (true);
create policy "interest_requests: admin read" on public.interest_requests
  for select to authenticated using (public.is_admin());
create policy "interest_requests: admin update" on public.interest_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
