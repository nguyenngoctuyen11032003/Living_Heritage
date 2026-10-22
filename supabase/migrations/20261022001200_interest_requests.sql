-- interest_requests: "register interest" for guests (no sign-in, no published item needed).
-- Mirrors connect_requests / reports: anon + authenticated may only insert; only admins read and triage.
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
