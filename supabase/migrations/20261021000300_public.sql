-- Di Sản Sống spec 1 §7: the public knowledge hub — publish requests, public_items snapshots with
-- accent-insensitive search, the public-audio bucket, connect requests, reports and deletion requests.
--
-- Invariants:
--   * Only an approved story can be requested; only an admin can publish (review_publish).
--   * public_items is a snapshot built from story + story_share_settings + narrator; drafts never appear.
--   * Editing (save_story_draft) or withdrawing (withdraw_public) deletes the public_items row.
--   * Turning a share setting off on a public story takes effect at once (audio/name/region removed);
--     turning one on needs a new publish request.
--   * public_items never exposes family_id or narrator_id.

-- ---------------------------------------------------------------------------
-- Search helper
-- ---------------------------------------------------------------------------

-- IMMUTABLE wrapper so unaccent can be used in generated columns and indexes ('đ' → 'd', 'ă' → 'a', ...).
create or replace function public.lh_unaccent(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, p_text);
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.publish_requests (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  status public.publish_status not null default 'pending',
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewer uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  note text check (note is null or char_length(note) <= 2000)
);
create unique index publish_requests_one_pending_idx on public.publish_requests (story_id) where status = 'pending';
create index publish_requests_status_idx on public.publish_requests (status, requested_at);

create table public.public_items (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories (id) on delete cascade,
  kind public.story_kind not null,
  title text not null,
  summary text,
  body text not null,
  fields jsonb not null default '{}'::jsonb,
  topic_id uuid references public.topics (id) on delete set null,
  topic_slug text,
  lang text not null default 'vi',
  region text check (region is null or region in ('bac', 'trung', 'nam')),
  decade integer check (decade is null or (decade between 1900 and 2090 and decade % 10 = 0)),
  narrator_label text not null,
  audio_allowed boolean not null default false,
  -- Path inside the public `public-audio` bucket: 'items/{public_item_id}.webm'. Set by review_publish
  -- only when audio_allowed; the file itself is copied from `recordings` by the service-role function/app.
  audio_path text check (audio_path is null or audio_allowed),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, public.lh_unaccent(coalesce(title, ''))), 'A')
    || setweight(to_tsvector('simple'::regconfig, public.lh_unaccent(coalesce(summary, ''))), 'B')
    || setweight(to_tsvector('simple'::regconfig, public.lh_unaccent(coalesce(body, '') || ' ' || coalesce(fields::text, ''))), 'C')
  ) stored
);
create index public_items_search_idx on public.public_items using gin (search_tsv);
create index public_items_title_trgm_idx on public.public_items using gin (public.lh_unaccent(lower(title)) extensions.gin_trgm_ops);
create index public_items_published_idx on public.public_items (published_at desc);
create index public_items_topic_idx on public.public_items (topic_slug);

create table public.connect_requests (
  id uuid primary key default gen_random_uuid(),
  public_item_id uuid not null references public.public_items (id) on delete cascade,
  requester uuid default auth.uid() references auth.users (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  contact text not null check (char_length(btrim(contact)) between 3 and 200),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'forwarded', 'closed')),
  created_at timestamptz not null default now()
);
create index connect_requests_status_idx on public.connect_requests (status, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  public_item_id uuid references public.public_items (id) on delete cascade,
  reporter uuid default auth.uid() references auth.users (id) on delete set null,
  reason text not null check (reason in ('inaccurate', 'unsafe', 'privacy', 'copyright', 'offensive', 'other')),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index reports_status_idx on public.reports (status, created_at);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  story_id uuid references public.stories (id) on delete set null,
  requested_by uuid default auth.uid() references auth.users (id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 1000),
  status text not null default 'open' check (status in ('open', 'done', 'rejected')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index deletion_requests_status_idx on public.deletion_requests (status, created_at);

create trigger public_items_touch before update on public.public_items
  for each row execute function public.lh_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS and privileges
-- ---------------------------------------------------------------------------

alter table public.publish_requests enable row level security;
alter table public.public_items enable row level security;
alter table public.connect_requests enable row level security;
alter table public.reports enable row level security;
alter table public.deletion_requests enable row level security;

revoke all on public.publish_requests, public.public_items, public.connect_requests, public.reports,
  public.deletion_requests from public, anon, authenticated;

grant select on public.public_items to anon, authenticated;
grant select on public.publish_requests, public.connect_requests, public.reports, public.deletion_requests to authenticated;
grant insert (public_item_id, name, contact, message) on public.connect_requests to authenticated;
grant update (status) on public.connect_requests to authenticated;
grant insert (public_item_id, reason, note) on public.reports to anon, authenticated;
grant update (status, resolved_at, resolved_by) on public.reports to authenticated;
grant insert (family_id, story_id, reason) on public.deletion_requests to authenticated;
grant update (status, admin_note, resolved_at, resolved_by) on public.deletion_requests to authenticated;

create policy "public_items: everyone reads" on public.public_items
  for select to anon, authenticated using (true);

create policy "publish_requests: story readers and admin read" on public.publish_requests
  for select to authenticated
  using (public.is_admin() or public.can_read_story(story_id));

create policy "connect_requests: requester or admin read" on public.connect_requests
  for select to authenticated
  using (requester = (select auth.uid()) or public.is_admin());
create policy "connect_requests: signed-in users insert" on public.connect_requests
  for insert to authenticated
  with check (requester = (select auth.uid()));
create policy "connect_requests: admin update" on public.connect_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "reports: reporter or admin read" on public.reports
  for select to authenticated
  using (reporter = (select auth.uid()) or public.is_admin());
create policy "reports: anyone insert" on public.reports
  for insert to anon, authenticated
  with check (reporter is not distinct from (select auth.uid()) and public_item_id is not null);
create policy "reports: admin update" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "deletion_requests: requester or admin read" on public.deletion_requests
  for select to authenticated
  using (requested_by = (select auth.uid()) or public.is_admin());
create policy "deletion_requests: members or narrator user insert" on public.deletion_requests
  for insert to authenticated
  with check (requested_by = (select auth.uid())
    and (public.is_family_member(family_id)
      or (story_id is not null and exists (
        select 1 from public.stories s
        where s.id = story_id and s.family_id = deletion_requests.family_id and public.is_narrator_user(s.narrator_id)))));
create policy "deletion_requests: admin update" on public.deletion_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admins read stories (and their share settings) that have a publish request, to review them.
create policy "stories: admin reads requested" on public.stories
  for select to authenticated
  using (public.is_admin() and exists (select 1 from public.publish_requests pr where pr.story_id = stories.id));
create policy "story_share_settings: admin reads requested" on public.story_share_settings
  for select to authenticated
  using (public.is_admin() and exists (
    select 1 from public.publish_requests pr where pr.story_id = story_share_settings.story_id));

-- public-audio: public bucket (served by public URL). No client write policies: only the service role
-- writes 'items/{public_item_id}.webm'.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-audio', 'public-audio', true, 20971520, array['audio/*'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Snapshot builder
-- ---------------------------------------------------------------------------

-- What the public would see for p_story, as jsonb (keys = public_items columns minus id/timestamps).
create or replace function public.lh_public_snapshot(p_story uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_narr public.narrators%rowtype;
  v_set public.story_share_settings%rowtype;
  v_slug text;
  v_decade integer;
  v_raw text;
begin
  select * into v_story from public.stories s where s.id = p_story;
  if not found then
    return null;
  end if;
  select * into v_narr from public.narrators n where n.id = v_story.narrator_id;
  select * into v_set from public.story_share_settings ss where ss.story_id = p_story;
  if not found then
    v_set.show_audio := false;
    v_set.show_real_name := false;
    v_set.show_region := true;
    v_set.show_photos := false;
  end if;
  select t.slug into v_slug from public.topics t where t.id = v_story.topic_id;
  v_raw := v_story.fields ->> 'decade';
  if v_raw ~ '^\d{4}$' and v_raw::integer between 1900 and 2090 then
    v_decade := (v_raw::integer / 10) * 10;
  end if;
  return jsonb_build_object(
    'story_id', v_story.id,
    'kind', v_story.kind,
    'title', v_story.title,
    'summary', v_story.summary,
    'body', v_story.body,
    'fields', v_story.fields,
    'topic_id', v_story.topic_id,
    'topic_slug', v_slug,
    'lang', v_story.lang,
    'region', case when v_set.show_region then v_narr.region end,
    'decade', v_decade,
    'narrator_label', case
      when v_set.show_real_name then v_narr.display_name
      when v_narr.pen_name is not null then v_narr.pen_name
      else 'Người kể ẩn danh' end,
    'audio_allowed', v_set.show_audio and v_story.recording_id is not null
  );
end;
$$;

-- Exact preview of the public item for the sharing dialog / admin review.
create or replace function public.preview_public_item(p_story uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not (public.can_write_story(p_story) or (public.is_admin()
      and exists (select 1 from public.publish_requests pr where pr.story_id = p_story))) then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  return public.lh_public_snapshot(p_story);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Owner/manager or the narrator user asks to publish an approved story. Returns the (pending) request
-- id; an existing pending request is returned as is. Creates default share settings if missing.
create or replace function public.request_publish(p_story uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_story from public.stories s where s.id = p_story for update;
  if not found or not public.can_read_story(p_story) then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if not (public.family_role(v_story.family_id) in ('owner', 'manager') or public.is_narrator_user(v_story.narrator_id)) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if v_story.edit_status <> 'approved' then
    raise exception using errcode = '22023', message = 'story_not_approved';
  end if;
  select pr.id into v_id from public.publish_requests pr where pr.story_id = p_story and pr.status = 'pending';
  if v_id is not null then
    return v_id;
  end if;
  insert into public.story_share_settings (story_id) values (p_story) on conflict (story_id) do nothing;
  insert into public.publish_requests (story_id, family_id, requested_by)
  values (p_story, v_story.family_id, auth.uid())
  returning id into v_id;
  perform public.lh_audit(v_story.family_id, 'request_publish', 'story', p_story, jsonb_build_object('request_id', v_id));
  return v_id;
end;
$$;

-- Admin approves or rejects a pending request. On approve: upserts the public_items snapshot, sets
-- story visibility 'public' and returns the public item id (null on reject). The story must still be
-- approved (an edit after the request withdraws it).
create or replace function public.review_publish(p_request uuid, p_approve boolean, p_note text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_req public.publish_requests%rowtype;
  v_story public.stories%rowtype;
  v_snap jsonb;
  v_item uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select * into v_req from public.publish_requests pr where pr.id = p_request for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if v_req.status <> 'pending' then
    raise exception using errcode = '22023', message = 'request_not_pending';
  end if;
  select * into v_story from public.stories s where s.id = v_req.story_id for update;

  if not coalesce(p_approve, false) then
    update public.publish_requests
      set status = 'rejected', reviewer = auth.uid(), reviewed_at = now(), note = left(p_note, 2000)
      where id = p_request;
    perform public.lh_audit(v_story.family_id, 'reject_publish', 'story', v_story.id, jsonb_build_object('request_id', p_request));
    return null;
  end if;

  if v_story.edit_status <> 'approved' then
    raise exception using errcode = '22023', message = 'story_not_approved';
  end if;

  v_snap := public.lh_public_snapshot(v_story.id);
  insert into public.public_items as pi (story_id, kind, title, summary, body, fields, topic_id, topic_slug, lang,
    region, decade, narrator_label, audio_allowed, audio_path, published_at)
  values (v_story.id, (v_snap ->> 'kind')::public.story_kind, v_snap ->> 'title', v_snap ->> 'summary',
    v_snap ->> 'body', v_snap -> 'fields', (v_snap ->> 'topic_id')::uuid, v_snap ->> 'topic_slug', v_snap ->> 'lang',
    v_snap ->> 'region', (v_snap ->> 'decade')::integer, v_snap ->> 'narrator_label',
    (v_snap ->> 'audio_allowed')::boolean, null, now())
  on conflict (story_id) do update set
    kind = excluded.kind, title = excluded.title, summary = excluded.summary, body = excluded.body,
    fields = excluded.fields, topic_id = excluded.topic_id, topic_slug = excluded.topic_slug, lang = excluded.lang,
    region = excluded.region, decade = excluded.decade, narrator_label = excluded.narrator_label,
    audio_allowed = excluded.audio_allowed, audio_path = null, published_at = now()
  returning pi.id into v_item;

  update public.public_items
    set audio_path = case when audio_allowed then 'items/' || id::text || '.webm' end
    where id = v_item;
  update public.stories set visibility = 'public' where id = v_story.id;
  update public.publish_requests
    set status = 'approved', reviewer = auth.uid(), reviewed_at = now(), note = left(p_note, 2000)
    where id = p_request;
  perform public.lh_audit(v_story.family_id, 'approve_publish', 'story', v_story.id,
    jsonb_build_object('request_id', p_request, 'public_item_id', v_item));
  return v_item;
end;
$$;

-- Owner/manager or the narrator user takes a story off the public hub: deletes public_items, marks
-- requests 'withdrawn', sets visibility 'family'. The public-audio copy (audio_path in the audit
-- details) must be removed by the app / function.
create or replace function public.withdraw_public(p_story uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_item uuid;
  v_audio text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_story from public.stories s where s.id = p_story for update;
  if not found or not public.can_read_story(p_story) then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if not (public.family_role(v_story.family_id) in ('owner', 'manager') or public.is_narrator_user(v_story.narrator_id)) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  delete from public.public_items pi where pi.story_id = p_story returning pi.id, pi.audio_path into v_item, v_audio;
  update public.publish_requests set status = 'withdrawn'
    where story_id = p_story and status in ('pending', 'approved');
  update public.stories set visibility = 'family' where id = p_story and visibility = 'public';
  perform public.lh_audit(v_story.family_id, 'withdraw_public', 'story', p_story,
    jsonb_build_object('public_item_id', v_item, 'audio_path', v_audio));
end;
$$;

-- Share settings turned OFF on a public story take effect immediately on the snapshot.
create or replace function public.lh_share_settings_tighten()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snap jsonb;
begin
  if not exists (select 1 from public.public_items pi where pi.story_id = new.story_id) then
    return null;
  end if;
  v_snap := public.lh_public_snapshot(new.story_id);
  update public.public_items pi set
    audio_allowed = pi.audio_allowed and new.show_audio,
    audio_path = case when new.show_audio then pi.audio_path end,
    region = case when new.show_region then pi.region end,
    narrator_label = case when not new.show_real_name then v_snap ->> 'narrator_label' else pi.narrator_label end
  where pi.story_id = new.story_id;
  return null;
end;
$$;

create trigger story_share_settings_tighten after update on public.story_share_settings
  for each row execute function public.lh_share_settings_tighten();

-- Accent-insensitive search of the public hub: 'cham cay' finds 'chăm cây'. Every word of q must
-- match a word prefix (full-text) or q must be similar to the title (trigram). Ordered by rank then
-- published_at desc. lim is clamped to 1..50.
create or replace function public.search_public(
  q text default null,
  p_topic text default null,
  p_kind public.story_kind default null,
  p_region text default null,
  p_decade integer default null,
  lim integer default 12,
  off integer default 0
)
returns setof public.public_items
language sql
stable
set search_path = ''
as $$
  with params as (
    select nullif(btrim(regexp_replace(public.lh_unaccent(lower(coalesce(q, ''))), '[^[:alnum:]]+', ' ', 'g')), '') as qn
  ), tsq as (
    select p.qn,
      case when p.qn is null then null
        else to_tsquery('simple'::regconfig,
          (select string_agg(w || ':*', ' & ') from regexp_split_to_table(p.qn, ' ') as w where w <> ''))
      end as query
    from params p
  )
  select pi.*
  from public.public_items pi, tsq
  where (tsq.qn is null
      or pi.search_tsv @@ tsq.query
      or tsq.qn operator(extensions.<%) public.lh_unaccent(lower(pi.title)))
    and (p_topic is null or pi.topic_slug = p_topic)
    and (p_kind is null or pi.kind = p_kind)
    and (p_region is null or pi.region = p_region)
    and (p_decade is null or pi.decade = p_decade)
  order by
    case when tsq.qn is null then 0
      else ts_rank(pi.search_tsv, tsq.query)
        + extensions.word_similarity(tsq.qn, public.lh_unaccent(lower(pi.title))) end desc,
    pi.published_at desc
  limit greatest(1, least(coalesce(lim, 12), 50))
  offset greatest(0, coalesce(off, 0));
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.lh_public_snapshot(uuid), public.lh_share_settings_tighten()
  from public, anon, authenticated;
revoke execute on function public.preview_public_item(uuid), public.request_publish(uuid),
  public.review_publish(uuid, boolean, text), public.withdraw_public(uuid)
  from public, anon;
grant execute on function public.preview_public_item(uuid), public.request_publish(uuid),
  public.review_publish(uuid, boolean, text), public.withdraw_public(uuid)
  to authenticated;
revoke execute on function public.lh_unaccent(text),
  public.search_public(text, text, public.story_kind, text, integer, integer, integer) from public;
grant execute on function public.lh_unaccent(text),
  public.search_public(text, text, public.story_kind, text, integer, integer, integer) to anon, authenticated;
