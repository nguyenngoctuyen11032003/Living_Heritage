-- Di Sản Sống spec 1 §7: storytelling content — sessions, recordings, transcripts, stories and their
-- versions, share settings, collections, memory books, the private Storage buckets and the
-- save_story_draft / approve_story RPCs.
--
-- Who sees what (family F, narrator N):
--   * owner / manager / editor of F: everything of F (all stories, all recordings).
--   * viewer of F: stories with visibility 'family' or 'public' (and the recordings behind them).
--   * the narrator user of N (anonymous device bound by claim_narrator_link): N's sessions, recordings,
--     transcripts and stories only — never other narrators' content or family administration.
--   * anon: nothing here (the public hub reads public_items only).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  narrator_id uuid not null,
  topic_id uuid references public.topics (id) on delete set null,
  started_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (narrator_id, family_id) references public.narrators (id, family_id) on delete cascade,
  unique (id, narrator_id, family_id)
);
create index sessions_narrator_idx on public.sessions (narrator_id, created_at desc);
create index sessions_family_idx on public.sessions (family_id);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  narrator_id uuid not null,
  session_id uuid not null,
  question_id uuid references public.questions (id) on delete set null,
  storage_path text not null unique,
  duration_s numeric(7, 2) check (duration_s is null or duration_s between 0 and 610),
  mime text not null default 'audio/webm' check (mime ~ '^audio/[A-Za-z0-9.+-]+(;.*)?$' and char_length(mime) <= 100),
  size_bytes integer check (size_bytes is null or size_bytes between 0 and 20971520),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (session_id, narrator_id, family_id) references public.sessions (id, narrator_id, family_id) on delete cascade,
  -- Object path inside the `recordings` bucket: {family_id}/{narrator_id}/{file}
  check (storage_path ~ ('^' || family_id::text || '/' || narrator_id::text || '/[A-Za-z0-9._-]{1,120}$'))
);
create index recordings_session_idx on public.recordings (session_id);
create index recordings_narrator_idx on public.recordings (narrator_id, created_at desc);
create index recordings_family_idx on public.recordings (family_id);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  version integer not null default 1 check (version >= 1),
  text text not null check (char_length(text) <= 200000),
  uncertain_spans jsonb not null default '[]'::jsonb check (jsonb_typeof(uncertain_spans) = 'array'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recording_id, version)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  narrator_id uuid not null,
  recording_id uuid references public.recordings (id) on delete set null,
  kind public.story_kind not null default 'story',
  title text not null default '' check (char_length(title) <= 200),
  summary text check (summary is null or char_length(summary) <= 2000),
  body text not null default '' check (char_length(body) <= 100000),
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 65536),
  topic_id uuid references public.topics (id) on delete set null,
  lang text not null default 'vi' check (lang ~ '^[a-z]{2,3}(-[A-Za-z]{2,4})?$'),
  edit_status public.edit_status not null default 'draft',
  visibility public.visibility not null default 'private',
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  current_version integer not null default 1 check (current_version >= 1),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (narrator_id, family_id) references public.narrators (id, family_id) on delete cascade,
  unique (id, family_id)
);
create index stories_family_idx on public.stories (family_id, created_at desc);
create index stories_narrator_idx on public.stories (narrator_id);
create index stories_recording_idx on public.stories (recording_id) where recording_id is not null;
comment on column public.stories.fields is
  'experience: {skill, context, conditions[], steps[], cautions[], limits}; optional decade (int, e.g. 1970) feeds public_items.decade.';

create table public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  version integer not null check (version >= 1),
  title text not null,
  summary text,
  body text not null,
  fields jsonb not null,
  edit_status public.edit_status not null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (story_id, version)
);

create table public.story_share_settings (
  story_id uuid primary key references public.stories (id) on delete cascade,
  show_audio boolean not null default false,
  show_real_name boolean not null default false,
  show_region boolean not null default true,
  show_photos boolean not null default false,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, family_id)
);
create index collections_family_idx on public.collections (family_id);

create table public.collection_items (
  collection_id uuid not null,
  family_id uuid not null,
  story_id uuid not null,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, story_id),
  foreign key (collection_id, family_id) references public.collections (id, family_id) on delete cascade,
  foreign key (story_id, family_id) references public.stories (id, family_id) on delete cascade
);
create index collection_items_story_idx on public.collection_items (story_id);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  subtitle text check (subtitle is null or char_length(subtitle) <= 200),
  cover_style text not null default 'classic' check (cover_style ~ '^[a-z0-9-]{1,30}$'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, family_id)
);
create index books_family_idx on public.books (family_id);

create table public.book_chapters (
  book_id uuid not null,
  family_id uuid not null,
  story_id uuid not null,
  position integer not null default 0,
  primary key (book_id, story_id),
  foreign key (book_id, family_id) references public.books (id, family_id) on delete cascade,
  foreign key (story_id, family_id) references public.stories (id, family_id) on delete cascade
);
create index book_chapters_story_idx on public.book_chapters (story_id);

create trigger stories_touch before update on public.stories
  for each row execute function public.lh_touch_updated_at();
create trigger story_share_settings_touch before update on public.story_share_settings
  for each row execute function public.lh_touch_updated_at();
create trigger books_touch before update on public.books
  for each row execute function public.lh_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_family_editor(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.family_role(fid) in ('owner', 'manager', 'editor'), false);
$$;

create or replace function public.can_read_story(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stories s
    where s.id = sid
      and (public.is_family_editor(s.family_id)
        or public.is_narrator_user(s.narrator_id)
        or (s.visibility <> 'private' and public.is_family_member(s.family_id)))
  );
$$;

create or replace function public.can_write_story(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stories s
    where s.id = sid and (public.is_family_editor(s.family_id) or public.is_narrator_user(s.narrator_id))
  );
$$;

create or replace function public.can_read_recording(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recordings r
    where r.id = rid
      and (public.is_family_editor(r.family_id)
        or public.is_narrator_user(r.narrator_id)
        or (public.is_family_member(r.family_id) and exists (
          select 1 from public.stories s where s.recording_id = r.id and s.visibility <> 'private')))
  );
$$;

-- Storage `recordings` bucket, object name {family_id}/{narrator_id}/{file}.
create or replace function public.can_upload_recording_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(p_name, '/', 3) <> '' and split_part(p_name, '/', 4) = ''
    and exists (
      select 1 from public.narrators n
      where n.id = public.lh_path_uuid(p_name, 2) and n.family_id = public.lh_path_uuid(p_name, 1)
        and (public.is_family_editor(n.family_id) or public.is_narrator_user(n.id))
    );
$$;

create or replace function public.can_read_recording_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.narrators n
    where n.id = public.lh_path_uuid(p_name, 2) and n.family_id = public.lh_path_uuid(p_name, 1)
      and (public.is_family_editor(n.family_id)
        or public.is_narrator_user(n.id)
        or (public.is_family_member(n.family_id) and exists (
          select 1 from public.recordings r join public.stories s on s.recording_id = r.id
          where r.storage_path = p_name and s.visibility <> 'private')))
  );
$$;

-- Snapshot version 1 when a story is created (by a client or by the ai-process function).
create or replace function public.lh_story_initial_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.story_versions (story_id, version, title, summary, body, fields, edit_status, created_by)
  values (new.id, new.current_version, new.title, new.summary, new.body, new.fields, new.edit_status, new.created_by)
  on conflict (story_id, version) do nothing;
  return null;
end;
$$;

create trigger stories_initial_version after insert on public.stories
  for each row execute function public.lh_story_initial_version();

-- ---------------------------------------------------------------------------
-- RLS and privileges
-- ---------------------------------------------------------------------------

alter table public.sessions enable row level security;
alter table public.recordings enable row level security;
alter table public.transcripts enable row level security;
alter table public.stories enable row level security;
alter table public.story_versions enable row level security;
alter table public.story_share_settings enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.books enable row level security;
alter table public.book_chapters enable row level security;

revoke all on public.sessions, public.recordings, public.transcripts, public.stories, public.story_versions,
  public.story_share_settings, public.collections, public.collection_items, public.books, public.book_chapters
  from public, anon, authenticated;

grant select on public.sessions, public.recordings, public.transcripts, public.stories, public.story_versions,
  public.story_share_settings, public.collections, public.collection_items, public.books, public.book_chapters
  to authenticated;
grant insert (family_id, narrator_id, topic_id) on public.sessions to authenticated;
grant update (topic_id, ended_at) on public.sessions to authenticated;
grant delete on public.sessions to authenticated;
grant insert (family_id, narrator_id, session_id, question_id, storage_path, duration_s, mime, size_bytes) on public.recordings to authenticated;
grant delete on public.recordings to authenticated;
grant insert (recording_id, version, text, uncertain_spans) on public.transcripts to authenticated;
grant insert (family_id, narrator_id, recording_id, kind, title, summary, body, fields, topic_id, lang, visibility) on public.stories to authenticated;
grant update (visibility, topic_id) on public.stories to authenticated;
grant delete on public.stories to authenticated;
grant insert (story_id, show_audio, show_real_name, show_region, show_photos) on public.story_share_settings to authenticated;
grant update (show_audio, show_real_name, show_region, show_photos) on public.story_share_settings to authenticated;
grant insert (family_id, title, description) on public.collections to authenticated;
grant update (title, description) on public.collections to authenticated;
grant delete on public.collections to authenticated;
grant insert (collection_id, family_id, story_id, position) on public.collection_items to authenticated;
grant update (position) on public.collection_items to authenticated;
grant delete on public.collection_items to authenticated;
grant insert (family_id, title, subtitle, cover_style) on public.books to authenticated;
grant update (title, subtitle, cover_style) on public.books to authenticated;
grant delete on public.books to authenticated;
grant insert (book_id, family_id, story_id, position) on public.book_chapters to authenticated;
grant update (position) on public.book_chapters to authenticated;
grant delete on public.book_chapters to authenticated;

-- sessions
create policy "sessions: members and narrator user read" on public.sessions
  for select to authenticated
  using (public.is_family_member(family_id) or public.is_narrator_user(narrator_id));
create policy "sessions: editors and narrator user insert" on public.sessions
  for insert to authenticated
  with check (public.is_family_editor(family_id) or public.is_narrator_user(narrator_id));
create policy "sessions: editors and narrator user update" on public.sessions
  for update to authenticated
  using (public.is_family_editor(family_id) or public.is_narrator_user(narrator_id))
  with check (public.is_family_editor(family_id) or public.is_narrator_user(narrator_id));
create policy "sessions: owner/manager delete" on public.sessions
  for delete to authenticated
  using (public.family_role(family_id) in ('owner', 'manager'));

-- recordings
create policy "recordings: editors, narrator user, or viewers of shared stories read" on public.recordings
  for select to authenticated
  using (public.is_family_editor(family_id) or public.is_narrator_user(narrator_id)
    or (public.is_family_member(family_id) and exists (
      select 1 from public.stories s where s.recording_id = recordings.id and s.visibility <> 'private')));
create policy "recordings: editors and narrator user insert" on public.recordings
  for insert to authenticated
  with check (public.is_family_editor(family_id) or public.is_narrator_user(narrator_id));
create policy "recordings: owner/manager delete" on public.recordings
  for delete to authenticated
  using (public.family_role(family_id) in ('owner', 'manager'));

-- transcripts
create policy "transcripts: recording readers read" on public.transcripts
  for select to authenticated
  using (public.can_read_recording(recording_id));
create policy "transcripts: editors and narrator user insert" on public.transcripts
  for insert to authenticated
  with check (exists (
    select 1 from public.recordings r
    where r.id = recording_id and (public.is_family_editor(r.family_id) or public.is_narrator_user(r.narrator_id))));

-- stories
create policy "stories: editors and narrator user read all, members read shared" on public.stories
  for select to authenticated
  using (public.is_family_editor(family_id) or public.is_narrator_user(narrator_id)
    or (visibility <> 'private' and public.is_family_member(family_id)));
create policy "stories: editors and narrator user insert" on public.stories
  for insert to authenticated
  with check ((public.is_family_editor(family_id) or public.is_narrator_user(narrator_id))
    and visibility in ('private', 'family'));
-- Content changes go through save_story_draft; visibility 'public' only through review_publish/withdraw_public.
create policy "stories: editors and narrator user change visibility/topic" on public.stories
  for update to authenticated
  using ((public.is_family_editor(family_id) or public.is_narrator_user(narrator_id)) and visibility <> 'public')
  with check ((public.is_family_editor(family_id) or public.is_narrator_user(narrator_id)) and visibility in ('private', 'family'));
create policy "stories: owner/manager delete" on public.stories
  for delete to authenticated
  using (public.family_role(family_id) in ('owner', 'manager'));

-- story_versions (written only by trigger / RPCs)
create policy "story_versions: story readers read" on public.story_versions
  for select to authenticated
  using (public.can_read_story(story_id));

-- story_share_settings
create policy "story_share_settings: story readers read" on public.story_share_settings
  for select to authenticated
  using (public.can_read_story(story_id));
create policy "story_share_settings: story writers insert" on public.story_share_settings
  for insert to authenticated
  with check (public.can_write_story(story_id));
create policy "story_share_settings: story writers update" on public.story_share_settings
  for update to authenticated
  using (public.can_write_story(story_id)) with check (public.can_write_story(story_id));

-- collections / collection_items
create policy "collections: members read" on public.collections
  for select to authenticated using (public.is_family_member(family_id));
create policy "collections: editors insert" on public.collections
  for insert to authenticated with check (public.is_family_editor(family_id));
create policy "collections: editors update" on public.collections
  for update to authenticated using (public.is_family_editor(family_id)) with check (public.is_family_editor(family_id));
create policy "collections: editors delete" on public.collections
  for delete to authenticated using (public.is_family_editor(family_id));
create policy "collection_items: readers of the story read" on public.collection_items
  for select to authenticated using (public.is_family_member(family_id) and public.can_read_story(story_id));
create policy "collection_items: editors insert" on public.collection_items
  for insert to authenticated with check (public.is_family_editor(family_id));
create policy "collection_items: editors update" on public.collection_items
  for update to authenticated using (public.is_family_editor(family_id)) with check (public.is_family_editor(family_id));
create policy "collection_items: editors delete" on public.collection_items
  for delete to authenticated using (public.is_family_editor(family_id));

-- books / book_chapters
create policy "books: members read" on public.books
  for select to authenticated using (public.is_family_member(family_id));
create policy "books: editors insert" on public.books
  for insert to authenticated with check (public.is_family_editor(family_id));
create policy "books: editors update" on public.books
  for update to authenticated using (public.is_family_editor(family_id)) with check (public.is_family_editor(family_id));
create policy "books: editors delete" on public.books
  for delete to authenticated using (public.is_family_editor(family_id));
create policy "book_chapters: readers of the story read" on public.book_chapters
  for select to authenticated using (public.is_family_member(family_id) and public.can_read_story(story_id));
create policy "book_chapters: editors insert" on public.book_chapters
  for insert to authenticated with check (public.is_family_editor(family_id));
create policy "book_chapters: editors update" on public.book_chapters
  for update to authenticated using (public.is_family_editor(family_id)) with check (public.is_family_editor(family_id));
create policy "book_chapters: editors delete" on public.book_chapters
  for delete to authenticated using (public.is_family_editor(family_id));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Saves an edit as a new version (returns the new version number) and puts the story back to
-- 'pending_review' (the narrator must confirm again). If the story is public it is withdrawn at once
-- (public_items row deleted, publish requests 'withdrawn', visibility 'family', audit 'auto_withdraw');
-- the public-audio copy at the logged audio_path must then be removed by the app / function.
create or replace function public.save_story_draft(p_story uuid, p_title text, p_summary text, p_body text, p_fields jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_version integer;
  v_audio text;
  v_item uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_story from public.stories s where s.id = p_story for update;
  if not found or not public.can_read_story(p_story) then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if not public.can_write_story(p_story) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_fields is not null and jsonb_typeof(p_fields) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_fields';
  end if;

  v_version := v_story.current_version + 1;
  update public.stories set
    title = coalesce(p_title, ''),
    summary = nullif(btrim(coalesce(p_summary, '')), ''),
    body = coalesce(p_body, ''),
    fields = coalesce(p_fields, '{}'::jsonb),
    edit_status = 'pending_review',
    approved_by = null,
    approved_at = null,
    visibility = case when visibility = 'public' then 'family'::public.visibility else visibility end,
    current_version = v_version
  where id = p_story;

  insert into public.story_versions (story_id, version, title, summary, body, fields, edit_status, created_by)
  select s.id, s.current_version, s.title, s.summary, s.body, s.fields, s.edit_status, auth.uid()
  from public.stories s where s.id = p_story;

  update public.publish_requests set status = 'withdrawn'
  where story_id = p_story and status in ('pending', 'approved');

  delete from public.public_items pi where pi.story_id = p_story returning pi.id, pi.audio_path into v_item, v_audio;
  if v_item is not null then
    perform public.lh_audit(v_story.family_id, 'auto_withdraw', 'story', p_story,
      jsonb_build_object('public_item_id', v_item, 'audio_path', v_audio, 'version', v_version));
  end if;
  return v_version;
end;
$$;

-- Confirms the story ("Xác nhận đúng ý tôi"). Allowed for the narrator user, or — only while the
-- narrator has no bound user — for an owner/manager who records assisted consent
-- (p_assisted_consent = true; logged as method 'assisted'). Snapshots an 'approved' version and
-- returns its number. Approving never changes visibility (approval ≠ publication).
create or replace function public.approve_story(p_story uuid, p_assisted_consent boolean default false)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_narrator_user uuid;
  v_method text;
  v_version integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_story from public.stories s where s.id = p_story for update;
  if not found or not public.can_read_story(p_story) then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  select n.user_id into v_narrator_user from public.narrators n where n.id = v_story.narrator_id;

  if public.is_narrator_user(v_story.narrator_id) then
    v_method := 'narrator';
  elsif v_narrator_user is null and public.family_role(v_story.family_id) in ('owner', 'manager')
        and coalesce(p_assisted_consent, false) then
    v_method := 'assisted';
  else
    raise exception using errcode = '42501', message = 'not_narrator';
  end if;

  if v_story.edit_status = 'approved' then
    return v_story.current_version;
  end if;

  v_version := v_story.current_version + 1;
  update public.stories set
    edit_status = 'approved', approved_by = auth.uid(), approved_at = now(), current_version = v_version
  where id = p_story;
  insert into public.story_versions (story_id, version, title, summary, body, fields, edit_status, note, created_by)
  values (p_story, v_version, v_story.title, v_story.summary, v_story.body, v_story.fields, 'approved', v_method, auth.uid());
  perform public.lh_audit(v_story.family_id, 'approve_story', 'story', p_story,
    jsonb_build_object('method', v_method, 'version', v_version));
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage buckets: recordings (private), media (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recordings', 'recordings', false, 20971520, array['audio/*']),
  ('media', 'media', false, 10485760, array['image/*'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- recordings: {family_id}/{narrator_id}/{uuid}.webm
create policy "recordings: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'recordings' and public.can_read_recording_object(name));
create policy "recordings: upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recordings' and public.can_upload_recording_object(name));
create policy "recordings: owner/manager delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recordings' and public.family_role(public.lh_path_uuid(name, 1)) in ('owner', 'manager'));

-- media: {family_id}/{anything}
create policy "media: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.is_family_member(public.lh_path_uuid(name, 1)));
create policy "media: editors upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_family_editor(public.lh_path_uuid(name, 1)));
create policy "media: owner/manager delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.family_role(public.lh_path_uuid(name, 1)) in ('owner', 'manager'));

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.lh_story_initial_version() from public, anon, authenticated;
revoke execute on function public.is_family_editor(uuid), public.can_read_story(uuid), public.can_write_story(uuid),
  public.can_read_recording(uuid), public.can_upload_recording_object(text), public.can_read_recording_object(text),
  public.save_story_draft(uuid, text, text, text, jsonb), public.approve_story(uuid, boolean)
  from public, anon;
grant execute on function public.is_family_editor(uuid), public.can_read_story(uuid), public.can_write_story(uuid),
  public.can_read_recording(uuid), public.can_upload_recording_object(text), public.can_read_recording_object(text),
  public.save_story_draft(uuid, text, text, text, jsonb), public.approve_story(uuid, boolean)
  to authenticated;
