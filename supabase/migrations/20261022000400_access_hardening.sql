-- Audit round (DỰ ÁN.md B11/B12, NT07): server-side access hardening.
--
-- 1. media bucket: drop "media: members read". It let every family member (viewers included) list and download
--    the photo files of PRIVATE stories, because it OR-ed with "media: story readers read photos". Photo files
--    now follow the story (can_read_media_object); editors (who read every family story anyway) keep reading the
--    whole family folder, which the upload/cleanup flow needs.
-- 2. stories.recording_id must point to a recording of the same family and narrator. Before, an editor of
--    family B who knew a recording id of family A could attach it to a B story; publishing that story with audio
--    would make public-audio-sync copy A's private audio to the public bucket.
-- 3. Admin access to private content is limited to stories with a PENDING publish request (the review the
--    narrator's side asked for) instead of any request ever made, and every admin preview is logged with its
--    reason ('publish_review').
-- 4. audit_log records the actor's role (B12: người thực hiện, vai trò, phiên bản, phạm vi, thời điểm); story
--    rows also get the story version and scope (visibility) when the RPC did not log them itself.
-- 5. deletion_requests: status flow open (tiếp nhận) → processing (đang xử lý) → done/rejected (hoàn tất); the
--    story must belong to the request's family; every status change is logged.

-- ---------------------------------------------------------------------------
-- 1. media bucket read access
-- ---------------------------------------------------------------------------

drop policy if exists "media: members read" on storage.objects;

create policy "media: editors read family files" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.is_family_editor(public.lh_path_uuid(name, 1)));

-- ---------------------------------------------------------------------------
-- 2. stories.recording_id stays inside the story's family and narrator
-- ---------------------------------------------------------------------------

create or replace function public.lh_story_recording_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.recording_id is not null and not exists (
    select 1 from public.recordings r
    where r.id = new.recording_id and r.family_id = new.family_id and r.narrator_id = new.narrator_id
  ) then
    raise exception using errcode = '22023', message = 'recording_mismatch';
  end if;
  return new;
end;
$$;

create trigger stories_recording_guard before insert or update of recording_id, family_id, narrator_id on public.stories
  for each row execute function public.lh_story_recording_guard();

-- ---------------------------------------------------------------------------
-- 3. Admin reads private content only for a pending review, and the preview is logged
-- ---------------------------------------------------------------------------

drop policy if exists "stories: admin reads requested" on public.stories;
create policy "stories: admin reads pending review" on public.stories
  for select to authenticated
  using (public.is_admin() and exists (
    select 1 from public.publish_requests pr where pr.story_id = stories.id and pr.status = 'pending'));

drop policy if exists "story_share_settings: admin reads requested" on public.story_share_settings;
create policy "story_share_settings: admin reads pending review" on public.story_share_settings
  for select to authenticated
  using (public.is_admin() and exists (
    select 1 from public.publish_requests pr
    where pr.story_id = story_share_settings.story_id and pr.status = 'pending'));

-- Volatile now (it writes the audit row), so PostgREST runs it in a read-write transaction.
create or replace function public.preview_public_item(p_story uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if public.can_write_story(p_story) then
    return public.lh_public_snapshot(p_story);
  end if;
  if public.is_admin() and exists (
      select 1 from public.publish_requests pr where pr.story_id = p_story and pr.status = 'pending') then
    select s.family_id into v_family from public.stories s where s.id = p_story;
    perform public.lh_audit(v_family, 'admin_preview', 'story', p_story, jsonb_build_object('reason', 'publish_review'));
    return public.lh_public_snapshot(p_story);
  end if;
  raise exception using errcode = 'P0002', message = 'not_found';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. audit_log: actor role, story version and scope
-- ---------------------------------------------------------------------------

alter table public.audit_log add column actor_role text check (actor_role is null or actor_role ~ '^[a-z_]{1,20}$');
comment on column public.audit_log.actor_role is
  'owner | manager | editor | viewer (family role), narrator (bound narrator device), admin, service (no JWT user), none.';

create or replace function public.lh_audit_enrich()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
begin
  if new.actor_role is null then
    new.actor_role := case
      when new.actor is null then 'service'
      when new.family_id is not null and public.family_role(new.family_id) is not null then public.family_role(new.family_id)::text
      when new.family_id is not null and public.is_family_narrator_user(new.family_id) then 'narrator'
      when public.is_admin() then 'admin'
      else 'none'
    end;
  end if;
  if new.target_type = 'story' and new.target_id is not null then
    select * into v_story from public.stories s where s.id = new.target_id;
    if found then
      if not (new.details ? 'version') then
        new.details := new.details || jsonb_build_object('version', v_story.current_version);
      end if;
      if not (new.details ? 'scope') then
        new.details := new.details || jsonb_build_object('scope', v_story.visibility);
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger audit_log_enrich before insert on public.audit_log
  for each row execute function public.lh_audit_enrich();

-- ---------------------------------------------------------------------------
-- 5. deletion_requests status flow
-- ---------------------------------------------------------------------------

alter table public.deletion_requests drop constraint if exists deletion_requests_status_check;
alter table public.deletion_requests
  add constraint deletion_requests_status_check check (status in ('open', 'processing', 'done', 'rejected'));
comment on column public.deletion_requests.status is
  'open = tiếp nhận (received), processing = đang xử lý, done / rejected = hoàn tất. resolved_at is set only when finished.';

create or replace function public.lh_deletion_request_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
      jsonb_build_object('from', old.status, 'to', new.status, 'story_id', new.story_id));
  end if;
  return new;
end;
$$;

create trigger deletion_requests_guard before insert or update on public.deletion_requests
  for each row execute function public.lh_deletion_request_guard();

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on function public.lh_story_recording_guard(), public.lh_audit_enrich(), public.lh_deletion_request_guard()
  from public, anon, authenticated;
revoke execute on function public.preview_public_item(uuid) from public, anon;
grant execute on function public.preview_public_item(uuid) to authenticated;
