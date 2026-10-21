-- Audit round, DB follow-ups for review (A3) and admin (A7):
-- 1. connect_requests survive a takedown/withdrawal of their public item (on delete set null; reports already got
--    this in 20261022000600), so the moderation history is kept.
-- 2. Status changes on reports and connect_requests are audited (actor, role, old/new status, time).
-- 3. save_story_draft gains p_expected_version (optimistic lock: 'stale_version') and p_topic_id (the topic can be
--    changed together with an edit; the edit puts the story back to pending_review, so the narrator re-approves).
-- 4. approve_story gains p_expected_version. Both keep working for callers that omit the new parameters.

-- ---------------------------------------------------------------------------
-- 1. connect_requests.public_item_id: on delete set null
-- ---------------------------------------------------------------------------

alter table public.connect_requests alter column public_item_id drop not null;
alter table public.connect_requests drop constraint if exists connect_requests_public_item_id_fkey;
alter table public.connect_requests
  add constraint connect_requests_public_item_id_fkey foreign key (public_item_id) references public.public_items (id) on delete set null;

-- New requests must still name a public item.
drop policy if exists "connect_requests: signed-in users insert" on public.connect_requests;
create policy "connect_requests: signed-in users insert" on public.connect_requests
  for insert to authenticated
  with check (requester = (select auth.uid()) and public_item_id is not null);

-- ---------------------------------------------------------------------------
-- 2. Audit status changes of reports / connect requests
-- ---------------------------------------------------------------------------

create or replace function public.lh_moderation_status_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid;
begin
  if new.status is distinct from old.status then
    select s.family_id into v_family
    from public.public_items pi join public.stories s on s.id = pi.story_id
    where pi.id = coalesce(new.public_item_id, old.public_item_id);
    perform public.lh_audit(v_family,
      case when tg_table_name = 'reports' then 'report_status' else 'connect_status' end,
      case when tg_table_name = 'reports' then 'report' else 'connect_request' end,
      new.id,
      jsonb_build_object('from', old.status, 'to', new.status, 'public_item_id', coalesce(new.public_item_id, old.public_item_id)));
  end if;
  return null;
end;
$$;

create trigger reports_status_audit after update of status on public.reports
  for each row execute function public.lh_moderation_status_audit();
create trigger connect_requests_status_audit after update of status on public.connect_requests
  for each row execute function public.lh_moderation_status_audit();

-- ---------------------------------------------------------------------------
-- 3. save_story_draft(p_expected_version, p_topic_id)
-- ---------------------------------------------------------------------------

drop function public.save_story_draft(uuid, text, text, text, jsonb);

-- Saves an edit as a new version (returns the new version number) and puts the story back to 'pending_review'
-- (the narrator must confirm again). If the story is public it is withdrawn at once (public_items row deleted,
-- publish requests 'withdrawn', visibility 'family', audit 'auto_withdraw'); the public-audio copy is then removed
-- by public-audio-sync.
--   p_expected_version: when given and different from stories.current_version → 22023 'stale_version'.
--   p_topic_id: when given, the story's topic becomes this topic (must exist and be active → else 'invalid_topic').
create or replace function public.save_story_draft(
  p_story uuid,
  p_title text,
  p_summary text,
  p_body text,
  p_fields jsonb,
  p_expected_version integer default null,
  p_topic_id uuid default null
)
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
  if p_expected_version is not null and p_expected_version <> v_story.current_version then
    raise exception using errcode = '22023', message = 'stale_version';
  end if;
  if p_fields is not null and jsonb_typeof(p_fields) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_fields';
  end if;
  if p_topic_id is not null and not exists (select 1 from public.topics t where t.id = p_topic_id and t.active) then
    raise exception using errcode = '22023', message = 'invalid_topic';
  end if;

  v_version := v_story.current_version + 1;
  update public.stories set
    title = coalesce(p_title, ''),
    summary = nullif(btrim(coalesce(p_summary, '')), ''),
    body = coalesce(p_body, ''),
    fields = coalesce(p_fields, '{}'::jsonb),
    topic_id = coalesce(p_topic_id, topic_id),
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

-- ---------------------------------------------------------------------------
-- 4. approve_story(p_expected_version)
-- ---------------------------------------------------------------------------

drop function public.approve_story(uuid, boolean, text, text);

-- As in 20261022000600 (narrator device, or assisted consent with method + helper), plus p_expected_version:
-- when given and different from stories.current_version → 22023 'stale_version' (the narrator would otherwise
-- approve a text they have not seen).
create or replace function public.approve_story(
  p_story uuid,
  p_assisted_consent boolean default false,
  p_consent_method text default null,
  p_helper_relation text default null,
  p_expected_version integer default null
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

  if p_expected_version is not null and p_expected_version <> v_story.current_version then
    raise exception using errcode = '22023', message = 'stale_version';
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

revoke execute on function public.lh_moderation_status_audit() from public, anon, authenticated;
revoke execute on function public.save_story_draft(uuid, text, text, text, jsonb, integer, uuid),
  public.approve_story(uuid, boolean, text, text, integer) from public, anon;
grant execute on function public.save_story_draft(uuid, text, text, text, jsonb, integer, uuid),
  public.approve_story(uuid, boolean, text, text, integer) to authenticated;
