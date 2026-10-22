-- Hardening found by the static RLS/RPC audit (B11, B12):
-- 1. stories.recording_id must belong to the story's own family and narrator. Without it an editor of
--    family A could attach a recording id of family B to a story, then publish it with show_audio and
--    have the public-audio sync copy B's private recording to the public bucket.
-- 2. deletion_requests.story_id must belong to the request's family.
-- 3. admin_withdraw_public: an admin can take a reported public item down (reports of unsafe/privacy
--    content had no takedown path; withdraw_public is limited to the family and the narrator).

create or replace function public.lh_story_recording_check()
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
    raise exception using errcode = '23514', message = 'invalid_recording';
  end if;
  return new;
end;
$$;

create trigger stories_recording_check before insert or update of recording_id, family_id, narrator_id on public.stories
  for each row execute function public.lh_story_recording_check();

revoke execute on function public.lh_story_recording_check() from public, anon, authenticated;

drop policy "deletion_requests: members or narrator user insert" on public.deletion_requests;
create policy "deletion_requests: members or narrator user insert" on public.deletion_requests
  for insert to authenticated
  with check (requested_by = (select auth.uid())
    and (story_id is null or exists (
      select 1 from public.stories s where s.id = story_id and s.family_id = deletion_requests.family_id))
    and (public.is_family_member(family_id)
      or (story_id is not null and exists (
        select 1 from public.stories s
        where s.id = story_id and s.family_id = deletion_requests.family_id and public.is_narrator_user(s.narrator_id)))));

-- Admin takes a public story off the hub (deletes public_items, requests 'withdrawn', visibility 'family').
-- Returns the public-audio path that was in use (the sync function also removes orphaned files).
create or replace function public.admin_withdraw_public(p_story uuid, p_reason text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_family uuid;
  v_item uuid;
  v_audio text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select s.family_id into v_family from public.stories s where s.id = p_story for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  delete from public.public_items pi where pi.story_id = p_story returning pi.id, pi.audio_path into v_item, v_audio;
  if v_item is null then
    raise exception using errcode = 'P0002', message = 'not_found';
  end if;
  update public.publish_requests set status = 'withdrawn'
    where story_id = p_story and status in ('pending', 'approved');
  update public.stories set visibility = 'family' where id = p_story and visibility = 'public';
  perform public.lh_audit(v_family, 'admin_withdraw', 'story', p_story,
    jsonb_build_object('public_item_id', v_item, 'audio_path', v_audio, 'reason', left(p_reason, 500)));
  return v_audio;
end;
$$;

revoke execute on function public.admin_withdraw_public(uuid, text) from public, anon;
grant execute on function public.admin_withdraw_public(uuid, text) to authenticated;
