-- Di Sản Sống spec 1 §7: core schema — enums, profiles, families and members, invites, narrators and
-- narrator links, topics/questions, audit log, RLS helper functions and the family/link RPCs.
--
-- Conventions (all migrations):
-- * Every table has RLS enabled and explicit table privileges: we revoke Supabase's default grants and
--   grant back only what clients need (column-level where a policy alone is not enough).
-- * Every function is `set search_path = ''` with fully-qualified names. RLS helpers and RPCs are
--   security definer. Execute is revoked from public/anon and granted explicitly.
-- * Errors: `raise exception using errcode, message` with a short snake_case message the app can map
--   to a translated string (not_authenticated, forbidden, not_found, link_expired, ...).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (must match packages/shared/src/constants.ts)
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'manager', 'editor', 'viewer');
create type public.story_kind as enum ('story', 'experience');
create type public.edit_status as enum ('draft', 'pending_review', 'approved');
create type public.visibility as enum ('private', 'family', 'public');
create type public.job_status as enum ('queued', 'transcribing', 'drafting', 'done', 'error');
create type public.publish_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create or replace function public.lh_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- sha256 hex of a token (link / invite tokens are stored hashed only).
create or replace function public.lh_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

-- URL-safe random token (32 chars, 192 bits).
create or replace function public.lh_new_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
$$;

-- The uuid in path segment p_idx (1-based) of a storage object name, or null when it is not a uuid.
create or replace function public.lh_path_uuid(p_name text, p_idx integer)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', p_idx) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then split_part(p_name, '/', p_idx)::uuid
  end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user (created by trigger). is_admin is set by SQL only.';

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.families is 'A family vault. Created only through create_family().';

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'viewer',
  relation text check (relation is null or char_length(relation) <= 60),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254 and email like '%@%'),
  role public.member_role not null default 'viewer' check (role <> 'owner'),
  relation text check (relation is null or char_length(relation) <= 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index family_invites_family_idx on public.family_invites (family_id);

create table public.narrators (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  pen_name text check (pen_name is null or char_length(btrim(pen_name)) between 1 and 80),
  birth_year integer check (birth_year is null or birth_year between 1900 and 2030),
  region text check (region is null or region in ('bac', 'trung', 'nam')),
  user_id uuid references auth.users (id) on delete set null,
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, family_id)
);
create index narrators_family_idx on public.narrators (family_id);
create index narrators_user_idx on public.narrators (user_id) where user_id is not null;
comment on column public.narrators.user_id is 'The (usually anonymous) user bound by claim_narrator_link(). Set only by RPCs.';

create table public.narrator_links (
  id uuid primary key default gen_random_uuid(),
  narrator_id uuid not null references public.narrators (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  claimed_at timestamptz,
  claimed_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index narrator_links_narrator_idx on public.narrator_links (narrator_id);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  title_vi text not null,
  title_en text not null,
  icon text,
  sort integer not null default 0
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  prompt_vi text not null,
  prompt_en text not null,
  kind_hint public.story_kind,
  sort integer not null default 0
);
create index questions_topic_idx on public.questions (topic_id, sort);

create table public.audit_log (
  id bigint generated always as identity primary key,
  family_id uuid references public.families (id) on delete cascade,
  actor uuid,
  action text not null check (action ~ '^[a-z_]{1,40}$'),
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index audit_log_family_idx on public.audit_log (family_id, at desc);
comment on table public.audit_log is 'Written only by security definer RPCs (no client insert).';

create trigger profiles_touch before update on public.profiles
  for each row execute function public.lh_touch_updated_at();
create trigger families_touch before update on public.families
  for each row execute function public.lh_touch_updated_at();
create trigger narrators_touch before update on public.narrators
  for each row execute function public.lh_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.family_role(fid uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.family_members m
  where m.family_id = fid and m.user_id = (select auth.uid());
$$;

-- True when the caller is the user bound to narrator nid (via a claimed narrator link).
create or replace function public.is_narrator_user(nid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.narrators n
    where n.id = nid and n.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;

-- Caller is the narrator user of some narrator of family fid (read-only access to the family name).
create or replace function public.is_family_narrator_user(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.narrators n
    where n.family_id = fid and n.user_id = (select auth.uid())
  );
$$;

-- Caller shares at least one family with p_user (members can see each other's display names).
create or replace function public.shares_family_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members a
    join public.family_members b on b.family_id = a.family_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  );
$$;

create or replace function public.is_anonymous_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- Internal: append an audit row. Not executable by clients; called from security definer RPCs.
create or replace function public.lh_audit(p_family uuid, p_action text, p_target_type text, p_target uuid, p_details jsonb default '{}'::jsonb)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.audit_log (family_id, actor, action, target_type, target_id, details)
  values (p_family, (select auth.uid()), p_action, p_target_type, p_target, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Profile trigger
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), ''), 80);
  v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'vi');
begin
  if v_locale not in ('vi', 'en') then
    v_locale := 'vi';
  end if;
  insert into public.profiles (id, display_name, locale)
  values (new.id, v_name, v_locale)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS and privileges
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.narrators enable row level security;
alter table public.narrator_links enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.profiles, public.families, public.family_members, public.family_invites, public.narrators,
  public.narrator_links, public.topics, public.questions, public.audit_log from public, anon, authenticated;

grant select on public.profiles, public.families, public.family_members, public.family_invites, public.narrators,
  public.narrator_links, public.audit_log to authenticated;
grant select on public.topics, public.questions to anon, authenticated;
grant update (display_name, locale) on public.profiles to authenticated;
grant update (name) on public.families to authenticated;
grant delete on public.families to authenticated;
grant update (role, relation) on public.family_members to authenticated;
grant delete on public.family_members to authenticated;
grant delete on public.family_invites to authenticated;
grant insert (family_id, display_name, pen_name, birth_year, region, avatar_path) on public.narrators to authenticated;
grant update (display_name, pen_name, birth_year, region, avatar_path) on public.narrators to authenticated;
grant delete on public.narrators to authenticated;

-- profiles
create policy "profiles: read own or co-members" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_family_with(id) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- families
create policy "families: members and narrator users read" on public.families
  for select to authenticated
  using (public.is_family_member(id) or public.is_family_narrator_user(id) or public.is_admin());
create policy "families: owner/manager rename" on public.families
  for update to authenticated
  using (public.family_role(id) in ('owner', 'manager'))
  with check (public.family_role(id) in ('owner', 'manager'));
create policy "families: owner deletes" on public.families
  for delete to authenticated
  using (public.family_role(id) = 'owner');

-- family_members (rows are added only by create_family / accept_invite)
create policy "family_members: members read" on public.family_members
  for select to authenticated
  using (public.is_family_member(family_id));
create policy "family_members: owner/manager change non-owner roles" on public.family_members
  for update to authenticated
  using (public.family_role(family_id) in ('owner', 'manager') and role <> 'owner')
  with check (public.family_role(family_id) in ('owner', 'manager') and role <> 'owner');
create policy "family_members: owner/manager remove, or leave" on public.family_members
  for delete to authenticated
  using (role <> 'owner' and (public.family_role(family_id) in ('owner', 'manager') or user_id = (select auth.uid())));

-- family_invites (created by create_family_invite, accepted by accept_invite)
create policy "family_invites: owner/manager read" on public.family_invites
  for select to authenticated
  using (public.family_role(family_id) in ('owner', 'manager'));
create policy "family_invites: owner/manager delete" on public.family_invites
  for delete to authenticated
  using (public.family_role(family_id) in ('owner', 'manager'));

-- narrators
create policy "narrators: members and own narrator user read" on public.narrators
  for select to authenticated
  using (public.is_family_member(family_id) or user_id = (select auth.uid()));
create policy "narrators: editors insert" on public.narrators
  for insert to authenticated
  with check (public.family_role(family_id) in ('owner', 'manager', 'editor'));
create policy "narrators: editors update" on public.narrators
  for update to authenticated
  using (public.family_role(family_id) in ('owner', 'manager', 'editor'))
  with check (public.family_role(family_id) in ('owner', 'manager', 'editor'));
create policy "narrators: owner/manager delete" on public.narrators
  for delete to authenticated
  using (public.family_role(family_id) in ('owner', 'manager'));

-- narrator_links (written only by RPCs)
create policy "narrator_links: owner/manager read" on public.narrator_links
  for select to authenticated
  using (exists (
    select 1 from public.narrators n
    where n.id = narrator_id and public.family_role(n.family_id) in ('owner', 'manager')
  ));

-- topics / questions: public catalogue
create policy "topics: public read" on public.topics for select to anon, authenticated using (true);
create policy "questions: public read" on public.questions for select to anon, authenticated using (true);

-- audit_log
create policy "audit_log: owner/manager or admin read" on public.audit_log
  for select to authenticated
  using (public.is_admin() or (family_id is not null and public.family_role(family_id) in ('owner', 'manager')));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_family(name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(name, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if public.is_anonymous_user() then
    raise exception using errcode = '42501', message = 'anonymous_not_allowed';
  end if;
  if char_length(v_name) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;
  insert into public.families (name, owner_id) values (v_name, v_uid) returning id into v_id;
  insert into public.family_members (family_id, user_id, role) values (v_id, v_uid, 'owner');
  perform public.lh_audit(v_id, 'create_family', 'family', v_id, '{}'::jsonb);
  return v_id;
end;
$$;

-- Owner/manager invites a person by email. Returns the raw token once (only its sha256 is stored).
create or replace function public.create_family_invite(p_family uuid, p_email text, p_role public.member_role default 'viewer', p_relation text default null, p_ttl_days integer default 14)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text := public.lh_new_token();
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if public.family_role(p_family) is distinct from 'owner' and public.family_role(p_family) is distinct from 'manager' then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_role is null or p_role = 'owner' then
    raise exception using errcode = '22023', message = 'invalid_role';
  end if;
  if char_length(v_email) not between 3 and 254 or position('@' in v_email) = 0 then
    raise exception using errcode = '22023', message = 'invalid_email';
  end if;
  if p_ttl_days is null or p_ttl_days not between 1 and 60 then
    raise exception using errcode = '22023', message = 'invalid_ttl';
  end if;
  insert into public.family_invites (family_id, email, role, relation, token_hash, invited_by, expires_at)
  values (p_family, v_email, p_role, nullif(btrim(p_relation), ''), public.lh_token_hash(v_token), auth.uid(),
          now() + make_interval(days => p_ttl_days))
  returning id into v_id;
  perform public.lh_audit(p_family, 'create_invite', 'family_invite', v_id, jsonb_build_object('role', p_role));
  return v_token;
end;
$$;

-- Accepts an invite. The caller must be signed in with a real (non-anonymous) account whose email
-- matches the invite. Returns the family id. Already a member: keeps the existing role.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.family_invites%rowtype;
  v_email text;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if public.is_anonymous_user() then
    raise exception using errcode = '42501', message = 'anonymous_not_allowed';
  end if;
  select * into v_inv from public.family_invites i
  where i.token_hash = public.lh_token_hash(coalesce(p_token, ''))
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'invite_not_found';
  end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = v_uid then
      return v_inv.family_id;
    end if;
    raise exception using errcode = '22023', message = 'invite_used';
  end if;
  if v_inv.expires_at <= now() then
    raise exception using errcode = '22023', message = 'invite_expired';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is distinct from v_inv.email then
    raise exception using errcode = '42501', message = 'invite_email_mismatch';
  end if;
  insert into public.family_members (family_id, user_id, role, relation)
  values (v_inv.family_id, v_uid, v_inv.role, v_inv.relation)
  on conflict (family_id, user_id) do nothing;
  update public.family_invites set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  perform public.lh_audit(v_inv.family_id, 'accept_invite', 'family_invite', v_inv.id, jsonb_build_object('role', v_inv.role));
  return v_inv.family_id;
end;
$$;

-- Owner/manager creates a storytelling link for a narrator. Returns the raw token once; only its
-- sha256 hex is stored. The app shows it as `${site}/k/${token}` + QR.
create or replace function public.create_narrator_link(p_narrator uuid, p_ttl_days integer default 30)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family uuid;
  v_token text := public.lh_new_token();
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select n.family_id into v_family from public.narrators n where n.id = p_narrator;
  if v_family is null or public.family_role(v_family) is null then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if public.family_role(v_family) not in ('owner', 'manager') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_ttl_days is null or p_ttl_days not between 1 and 365 then
    raise exception using errcode = '22023', message = 'invalid_ttl';
  end if;
  insert into public.narrator_links (narrator_id, token_hash, expires_at, created_by)
  values (p_narrator, public.lh_token_hash(v_token), now() + make_interval(days => p_ttl_days), auth.uid())
  returning id into v_id;
  perform public.lh_audit(v_family, 'create_narrator_link', 'narrator_link', v_id,
    jsonb_build_object('narrator_id', p_narrator, 'ttl_days', p_ttl_days));
  return v_token;
end;
$$;

-- Binds the caller (normally an anonymous user from signInAnonymously) to the link's narrator and
-- returns the narrator id.
--
-- Binding rule (one narrator ↔ one device user at a time; a link is single-use):
--   * revoked → link_revoked; expired → link_expired (expiry only matters before the first claim).
--   * A link already claimed by the SAME user is idempotent (re-opening the link returns the narrator).
--   * A link already claimed by a DIFFERENT user → link_already_claimed. A leaked, used link can
--     never be used to take over a narrator.
--   * An unclaimed, valid link sets narrators.user_id = caller even if the narrator was bound to an
--     earlier user. That is the sanctioned way to move a narrator to a new device: an owner/manager
--     issues a fresh link, and the previous device loses access immediately.
-- The narrator user is NOT added to family_members; access comes only from is_narrator_user().
create or replace function public.claim_narrator_link(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_link public.narrator_links%rowtype;
  v_family uuid;
  v_prev uuid;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_link from public.narrator_links l
  where l.token_hash = public.lh_token_hash(coalesce(p_token, ''))
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'link_not_found';
  end if;
  if v_link.revoked_at is not null then
    raise exception using errcode = '22023', message = 'link_revoked';
  end if;
  if v_link.claimed_by is not null then
    if v_link.claimed_by = v_uid then
      return v_link.narrator_id;
    end if;
    raise exception using errcode = '22023', message = 'link_already_claimed';
  end if;
  if v_link.expires_at <= now() then
    raise exception using errcode = '22023', message = 'link_expired';
  end if;

  select n.family_id, n.user_id into v_family, v_prev from public.narrators n where n.id = v_link.narrator_id for update;
  update public.narrators set user_id = v_uid where id = v_link.narrator_id;
  update public.narrator_links set claimed_at = now(), claimed_by = v_uid where id = v_link.id;
  perform public.lh_audit(v_family, 'claim_narrator_link', 'narrator_link', v_link.id,
    jsonb_build_object('narrator_id', v_link.narrator_id, 'rebound', v_prev is not null and v_prev <> v_uid));
  return v_link.narrator_id;
end;
$$;

-- Owner/manager revokes a link. If that link's claimer is the narrator's current user, the narrator is
-- unbound too (the device loses access at once).
create or replace function public.revoke_narrator_link(p_link uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_link public.narrator_links%rowtype;
  v_family uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_link from public.narrator_links l where l.id = p_link for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  select n.family_id into v_family from public.narrators n where n.id = v_link.narrator_id;
  if public.family_role(v_family) is null then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if public.family_role(v_family) not in ('owner', 'manager') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  update public.narrator_links set revoked_at = coalesce(revoked_at, now()) where id = p_link;
  if v_link.claimed_by is not null then
    update public.narrators set user_id = null where id = v_link.narrator_id and user_id = v_link.claimed_by;
  end if;
  perform public.lh_audit(v_family, 'revoke_narrator_link', 'narrator_link', p_link,
    jsonb_build_object('narrator_id', v_link.narrator_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.lh_touch_updated_at(), public.lh_token_hash(text), public.lh_new_token(),
  public.lh_audit(uuid, text, text, uuid, jsonb), public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.lh_path_uuid(text, integer), public.is_family_member(uuid), public.family_role(uuid),
  public.is_narrator_user(uuid), public.is_admin(), public.is_family_narrator_user(uuid), public.shares_family_with(uuid),
  public.is_anonymous_user(), public.create_family(text),
  public.create_family_invite(uuid, text, public.member_role, text, integer), public.accept_invite(text),
  public.create_narrator_link(uuid, integer), public.claim_narrator_link(text), public.revoke_narrator_link(uuid)
  from public, anon;
grant execute on function public.lh_path_uuid(text, integer), public.is_family_member(uuid), public.family_role(uuid),
  public.is_narrator_user(uuid), public.is_admin(), public.is_family_narrator_user(uuid), public.shares_family_with(uuid),
  public.is_anonymous_user(), public.create_family(text),
  public.create_family_invite(uuid, text, public.member_role, text, integer), public.accept_invite(text),
  public.create_narrator_link(uuid, integer), public.claim_narrator_link(text), public.revoke_narrator_link(uuid)
  to authenticated;
