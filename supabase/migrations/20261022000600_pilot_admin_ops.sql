-- Audit round, DB follow-ups (DỰ ÁN.md B4, B11, B12, B13, B17, NT11, NT17):
-- 1. app_events + log_event / pilot_summary / content_counts: pilot event log by participant code (no content).
-- 2. admin_withdraw_public: an admin takes a public item down after a report (mandatory reason, audited). Reports
--    now survive the public item (on delete set null) so the moderation trail is kept.
-- 3. topics / questions: `active` flag; admins insert / update (soft-disable, never delete); others see active rows.
-- 4. deletion_requests.scope + erased_objects and admin_process_deletion: erase a story or a whole family in one
--    transaction and return the storage objects a service-role caller must delete.
-- 5. Narrator consent method and helper (B11/B13: no single catch-all consent checkbox): narrators.consent_method /
--    helper_note, and approve_story gains p_consent_method / p_helper_relation.

-- ---------------------------------------------------------------------------
-- 1. Pilot events
-- ---------------------------------------------------------------------------

create table public.app_events (
  id bigint generated always as identity primary key,
  code text not null check (code in ('topic_start', 'record_start', 'record_stop', 'upload_ok', 'draft_created',
    'draft_edit', 'approve', 'search', 'open_result', 'share_request', 'connect_sent', 'help_opened', 'session_end')),
  participant_code text check (participant_code is null or participant_code ~ '^[A-Za-z0-9-]{1,32}$'),
  web_version text check (web_version is null or char_length(web_version) <= 40),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index app_events_participant_idx on public.app_events (participant_code, created_at) where participant_code is not null;
create index app_events_user_idx on public.app_events (user_id, created_at) where user_id is not null;
create index app_events_created_idx on public.app_events (created_at);
comment on table public.app_events is
  'B17 pilot events: event code, participant code, web version, time. Never content or search terms. Written only by log_event().';

alter table public.app_events enable row level security;
revoke all on public.app_events from public, anon, authenticated;

-- Records one event. Unknown codes / malformed participant codes raise 22023. Light abuse guard: a signed-in user
-- (anonymous devices included) keeps at most 120 events per minute, signed-out callers 1000 per minute in total;
-- beyond that events are dropped silently.
create or replace function public.log_event(p_code text, p_participant text default null, p_version text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_participant text := nullif(btrim(coalesce(p_participant, '')), '');
  v_version text := nullif(btrim(coalesce(p_version, '')), '');
begin
  if p_code is null or p_code not in ('topic_start', 'record_start', 'record_stop', 'upload_ok', 'draft_created',
      'draft_edit', 'approve', 'search', 'open_result', 'share_request', 'connect_sent', 'help_opened', 'session_end') then
    raise exception using errcode = '22023', message = 'invalid_event';
  end if;
  if v_participant is not null and v_participant !~ '^[A-Za-z0-9-]{1,32}$' then
    raise exception using errcode = '22023', message = 'invalid_participant';
  end if;
  if v_version is not null and char_length(v_version) > 40 then
    raise exception using errcode = '22023', message = 'invalid_version';
  end if;
  if v_uid is not null then
    if (select count(*) from public.app_events e
        where e.user_id = v_uid and e.created_at > now() - interval '1 minute') >= 120 then
      return;
    end if;
  elsif (select count(*) from public.app_events e
         where e.user_id is null and e.created_at > now() - interval '1 minute') >= 1000 then
    return;
  end if;
  insert into public.app_events (code, participant_code, web_version, user_id)
  values (p_code, v_participant, v_version, v_uid);
end;
$$;

-- Admin: one row per participant code — first/last event, total, counts per code, completed (has 'approve'),
-- help_opened count (NT17: completion and the steps that needed help).
create or replace function public.pilot_summary()
returns table (
  participant_code text,
  first_at timestamptz,
  last_at timestamptz,
  event_count bigint,
  counts jsonb,
  completed boolean,
  help_opened bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return query
  with per_code as (
    select e.participant_code as pc, e.code, count(*) as n, min(e.created_at) as f, max(e.created_at) as l
    from public.app_events e
    where e.participant_code is not null
    group by e.participant_code, e.code
  )
  select pc.pc, min(pc.f), max(pc.l), sum(pc.n)::bigint, jsonb_object_agg(pc.code, pc.n),
    bool_or(pc.code = 'approve'), coalesce(sum(pc.n) filter (where pc.code = 'help_opened'), 0)::bigint
  from per_code pc
  group by pc.pc
  order by min(pc.f);
end;
$$;

-- Admin: content counts for NT11. approved_sources counts approved content by independent source (a recording
-- that yielded a story and an experience card counts once; text-only items count by story), never PDFs/books.
create or replace function public.content_counts()
returns table (approved_sources bigint, approved_items bigint, public_items bigint, drafts bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return query
  select
    (select count(distinct coalesce(s.recording_id, s.id)) from public.stories s where s.edit_status = 'approved'),
    (select count(*) from public.stories s where s.edit_status = 'approved'),
    (select count(*) from public.public_items pi),
    (select count(*) from public.stories s where s.edit_status in ('draft', 'pending_review'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Admin takedown
-- ---------------------------------------------------------------------------

alter table public.reports drop constraint if exists reports_public_item_id_fkey;
alter table public.reports
  add constraint reports_public_item_id_fkey foreign key (public_item_id) references public.public_items (id) on delete set null;

-- Admin removes a public item (e.g. after a report). p_reason (3..500 chars) is mandatory and logged. Same cleanup
-- as withdraw_public: the public_items row goes (search, links, embedding), publish requests become 'withdrawn',
-- the story returns to 'family'. Open reports on the item are resolved. The caller then runs public-audio-sync to
-- remove the public audio copy (audio_path is in the audit details).
create or replace function public.admin_withdraw_public(p_item uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item public.public_items%rowtype;
  v_family uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  select * into v_item from public.public_items pi where pi.id = p_item for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  select s.family_id into v_family from public.stories s where s.id = v_item.story_id for update;
  update public.reports set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
    where public_item_id = p_item and status = 'open';
  delete from public.public_items pi where pi.id = p_item;
  update public.publish_requests set status = 'withdrawn'
    where story_id = v_item.story_id and status in ('pending', 'approved');
  update public.stories set visibility = 'family' where id = v_item.story_id and visibility = 'public';
  perform public.lh_audit(v_family, 'admin_withdraw', 'story', v_item.story_id,
    jsonb_build_object('public_item_id', p_item, 'audio_path', v_item.audio_path, 'reason', v_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Question library management
-- ---------------------------------------------------------------------------

alter table public.topics add column active boolean not null default true;
alter table public.questions add column active boolean not null default true;

grant insert (slug, title_vi, title_en, icon, sort, active) on public.topics to authenticated;
grant update (title_vi, title_en, icon, sort, active) on public.topics to authenticated;
grant insert (topic_id, prompt_vi, prompt_en, kind_hint, sort, active) on public.questions to authenticated;
grant update (topic_id, prompt_vi, prompt_en, kind_hint, sort, active) on public.questions to authenticated;

drop policy if exists "topics: public read" on public.topics;
drop policy if exists "questions: public read" on public.questions;
create policy "topics: anon reads active" on public.topics for select to anon using (active);
create policy "topics: active or admin read" on public.topics for select to authenticated
  using (active or public.is_admin());
create policy "questions: anon reads active" on public.questions for select to anon using (active);
create policy "questions: active or admin read" on public.questions for select to authenticated
  using (active or public.is_admin());
create policy "topics: admin insert" on public.topics for insert to authenticated with check (public.is_admin());
create policy "topics: admin update" on public.topics for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "questions: admin insert" on public.questions for insert to authenticated with check (public.is_admin());
create policy "questions: admin update" on public.questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Deletion: explicit scope, erase RPC
-- ---------------------------------------------------------------------------

-- Requests survive the erasure of their family (family_id becomes null) so the status stays visible to admins and
-- to the requester.
alter table public.deletion_requests alter column family_id drop not null;
alter table public.deletion_requests drop constraint if exists deletion_requests_family_id_fkey;
alter table public.deletion_requests
  add constraint deletion_requests_family_id_fkey foreign key (family_id) references public.families (id) on delete set null;
alter table public.deletion_requests
  add column scope text check (scope is null or scope in ('story', 'family', 'account')),
  add column erased_objects jsonb check (erased_objects is null or jsonb_typeof(erased_objects) = 'array');
comment on column public.deletion_requests.scope is
  'Fixed at insert: story (story_id set), account (reason starts with "[account]"), otherwise family.';
comment on column public.deletion_requests.erased_objects is
  'Set by admin_process_deletion: [{bucket, path}] of storage objects to delete (returned again on repeat calls).';

update public.deletion_requests set scope = case
  when story_id is not null then 'story'
  when coalesce(reason, '') like '[account]%' then 'account'
  else 'family' end
where scope is null;

create or replace function public.lh_deletion_request_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.family_id is null then
      raise exception using errcode = '22023', message = 'family_required';
    end if;
    new.scope := case
      when new.story_id is not null then 'story'
      when coalesce(new.reason, '') like '[account]%' then 'account'
      else 'family' end;
    new.erased_objects := null;
  else
    -- scope never changes after filing: a story request whose story is gone must not turn into a family request.
    new.scope := old.scope;
  end if;
  if new.story_id is not null and (tg_op = 'INSERT' or new.story_id is distinct from old.story_id) and not exists (
    select 1 from public.stories s where s.id = new.story_id and s.family_id = new.family_id
  ) then
    raise exception using errcode = '22023', message = 'story_not_in_family';
  end if;
  if new.status in ('open', 'processing') then
    new.resolved_at := null;
    new.resolved_by := null;
  elsif new.resolved_at is null then
    new.resolved_at := now();
    new.resolved_by := coalesce(new.resolved_by, auth.uid());
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.lh_audit(new.family_id, 'deletion_status', 'deletion_request', new.id,
      jsonb_build_object('from', old.status, 'to', new.status, 'story_id', new.story_id, 'scope', new.scope));
  end if;
  return new;
end;
$$;

-- Admin erases what a deletion request covers, in one transaction, and returns the storage objects the caller
-- (the admin-erase Edge Function, service role) must delete:
--   story  → the story and its derived rows (versions, share settings, public item, publish requests, book
--            chapters, collection items, photos); its recording (+ transcripts, AI jobs) unless another story still
--            uses it. Objects: that recording file, the story's photo files, the public audio copy.
--   family → the family row and everything under it (cascade). Objects: every file under {family_id}/ in the
--            `recordings` and `media` buckets and every public audio copy of the family's stories.
--   account → not handled here (needs the auth admin API): 22023 account_scope_not_supported.
-- Status becomes 'done' with erased_objects stored; a repeat call on a done request returns the same list.
-- Errors: 42501 forbidden (not admin), P0002 not_found, 22023 request_rejected / account_scope_not_supported.
-- No books/PDF files are stored server-side (books render from stories), so none are returned.
create or replace function public.admin_process_deletion(p_request uuid)
returns table (bucket text, path text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_req public.deletion_requests%rowtype;
  v_story public.stories%rowtype;
  v_objects jsonb := '[]'::jsonb;
  v_audit_family uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select * into v_req from public.deletion_requests d where d.id = p_request for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  if v_req.status = 'done' then
    return query select o ->> 'bucket', o ->> 'path' from jsonb_array_elements(coalesce(v_req.erased_objects, '[]'::jsonb)) o;
    return;
  end if;
  if v_req.status = 'rejected' then
    raise exception using errcode = '22023', message = 'request_rejected';
  end if;
  if v_req.scope = 'account' then
    raise exception using errcode = '22023', message = 'account_scope_not_supported';
  end if;

  if v_req.scope = 'story' then
    v_audit_family := v_req.family_id;
    select * into v_story from public.stories s where s.id = v_req.story_id for update;
    if found then
      select coalesce(jsonb_agg(x.obj), '[]'::jsonb) into v_objects from (
        select jsonb_build_object('bucket', 'recordings', 'path', r.storage_path) as obj
          from public.recordings r
          where r.id = v_story.recording_id
            and not exists (select 1 from public.stories o where o.recording_id = r.id and o.id <> v_story.id)
        union all
        select jsonb_build_object('bucket', 'media', 'path', sp.storage_path)
          from public.story_photos sp where sp.story_id = v_story.id
        union all
        select jsonb_build_object('bucket', 'public-audio', 'path', pi.audio_path)
          from public.public_items pi where pi.story_id = v_story.id and pi.audio_path is not null
      ) x;
      delete from public.stories s where s.id = v_story.id;
      delete from public.recordings r
        where r.id = v_story.recording_id
          and not exists (select 1 from public.stories o where o.recording_id = r.id);
    end if;
  elsif v_req.family_id is not null then
    v_audit_family := null;  -- the family's own audit rows go with it
    select coalesce(jsonb_agg(x.obj), '[]'::jsonb) into v_objects from (
      select jsonb_build_object('bucket', so.bucket_id, 'path', so.name) as obj
        from storage.objects so
        where so.bucket_id in ('recordings', 'media') and so.name like v_req.family_id::text || '/%'
      union
      select jsonb_build_object('bucket', 'recordings', 'path', r.storage_path)
        from public.recordings r where r.family_id = v_req.family_id
      union
      select jsonb_build_object('bucket', 'media', 'path', sp.storage_path)
        from public.story_photos sp where sp.family_id = v_req.family_id
      union
      select jsonb_build_object('bucket', 'public-audio', 'path', pi.audio_path)
        from public.public_items pi join public.stories s on s.id = pi.story_id
        where s.family_id = v_req.family_id and pi.audio_path is not null
    ) x;
    delete from public.families f where f.id = v_req.family_id;
  end if;

  update public.deletion_requests
    set status = 'done', erased_objects = v_objects, resolved_at = now(), resolved_by = auth.uid()
    where id = p_request;
  perform public.lh_audit(v_audit_family, 'erase_' || v_req.scope, 'deletion_request', p_request,
    jsonb_build_object('family_id', v_req.family_id, 'story_id', v_req.story_id,
      'object_count', jsonb_array_length(v_objects)));
  return query select o ->> 'bucket', o ->> 'path' from jsonb_array_elements(v_objects) o;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Consent method and helper
-- ---------------------------------------------------------------------------

alter table public.narrators
  add column consent_method text check (consent_method is null
    or consent_method in ('self_device', 'assisted_in_person', 'assisted_phone', 'assisted_video')),
  add column helper_note text check (helper_note is null or char_length(helper_note) <= 120);
comment on column public.narrators.consent_method is
  'How this narrator confirms content: self_device (own link/device) or assisted_* (a helper records it).';
comment on column public.narrators.helper_note is 'Who helps the narrator and how (free text, ≤120 chars).';

grant insert (consent_method, helper_note) on public.narrators to authenticated;
grant update (consent_method, helper_note) on public.narrators to authenticated;

drop function public.approve_story(uuid, boolean);

-- Confirms the story. Allowed for the narrator user (method 'narrator', consent 'self_device'), or — only while
-- the narrator has no bound user — for an owner/manager recording assisted consent: p_consent_method in
-- assisted_in_person / assisted_phone / assisted_video and p_helper_relation (1..60 chars, e.g. "con gái").
-- Legacy callers that pass only p_assisted_consent = true fall back to the narrator's stored consent_method /
-- helper_note, else are logged as consent_method 'unspecified' (to be tightened once the web sends the method).
-- Both are stored in the audit row and in story_versions.note ('assisted:<method>:<helper>').
-- Approving never changes visibility (approval ≠ publication).
create or replace function public.approve_story(
  p_story uuid,
  p_assisted_consent boolean default false,
  p_consent_method text default null,
  p_helper_relation text default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_narr public.narrators%rowtype;
  v_method text;
  v_consent text;
  v_helper text := nullif(btrim(coalesce(p_helper_relation, '')), '');
  v_note text;
  v_version integer;
  v_assisted boolean := coalesce(p_assisted_consent, false) or p_consent_method is not null;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select * into v_story from public.stories s where s.id = p_story for update;
  if not found or not public.can_read_story(p_story) then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  select * into v_narr from public.narrators n where n.id = v_story.narrator_id;

  if public.is_narrator_user(v_story.narrator_id) then
    v_method := 'narrator';
    v_consent := 'self_device';
    v_helper := null;
    v_note := 'narrator';
  elsif v_narr.user_id is null and public.family_role(v_story.family_id) in ('owner', 'manager') and v_assisted then
    v_method := 'assisted';
    if p_consent_method is not null then
      if p_consent_method not in ('assisted_in_person', 'assisted_phone', 'assisted_video') then
        raise exception using errcode = '22023', message = 'invalid_consent_method';
      end if;
      if v_helper is null or char_length(v_helper) > 60 then
        raise exception using errcode = '22023', message = 'helper_relation_required';
      end if;
      v_consent := p_consent_method;
    else
      v_consent := case when v_narr.consent_method like 'assisted\_%' then v_narr.consent_method else 'unspecified' end;
      v_helper := left(coalesce(v_helper, nullif(btrim(coalesce(v_narr.helper_note, '')), '')), 60);
    end if;
    v_note := 'assisted:' || v_consent || coalesce(':' || v_helper, '');
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
  values (p_story, v_version, v_story.title, v_story.summary, v_story.body, v_story.fields, 'approved', left(v_note, 200), auth.uid());
  perform public.lh_audit(v_story.family_id, 'approve_story', 'story', p_story,
    jsonb_build_object('method', v_method, 'consent_method', v_consent, 'helper_relation', v_helper, 'version', v_version));
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.lh_deletion_request_guard() from public, anon, authenticated;
revoke execute on function public.log_event(text, text, text) from public;
grant execute on function public.log_event(text, text, text) to anon, authenticated;
revoke execute on function public.pilot_summary(), public.content_counts(), public.admin_withdraw_public(uuid, text),
  public.admin_process_deletion(uuid), public.approve_story(uuid, boolean, text, text)
  from public, anon;
grant execute on function public.pilot_summary(), public.content_counts(), public.admin_withdraw_public(uuid, text),
  public.admin_process_deletion(uuid), public.approve_story(uuid, boolean, text, text)
  to authenticated;
