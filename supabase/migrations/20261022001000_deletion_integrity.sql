-- Deletion integrity (audit follow-up to 20261022000600):
-- 1. admin_process_deletion never forgets objects: when a request already has erased_objects (e.g. it was reopened
--    to 'processing' after a storage cleanup failed), the stored list is merged with anything newly found and
--    returned again, instead of being overwritten by an empty list. Done requests still return the stored list.
-- 2. A story or family request can only become 'done' together with erased_objects (i.e. through
--    admin_process_deletion), so a manual "done" cannot skip the erasure. Account requests and 'rejected' are
--    unaffected.

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
  if new.status = 'done' and new.scope in ('story', 'family') and new.erased_objects is null
     and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    raise exception using errcode = '22023', message = 'erase_required';
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

  -- Keep every object found by an earlier (partly failed) run: merge, de-duplicated.
  select coalesce(jsonb_agg(distinct e.obj), '[]'::jsonb) into v_objects
  from jsonb_array_elements(coalesce(v_req.erased_objects, '[]'::jsonb) || v_objects) as e(obj);

  update public.deletion_requests
    set status = 'done', erased_objects = v_objects, resolved_at = now(), resolved_by = auth.uid()
    where id = p_request;
  perform public.lh_audit(v_audit_family, 'erase_' || v_req.scope, 'deletion_request', p_request,
    jsonb_build_object('family_id', v_req.family_id, 'story_id', v_req.story_id,
      'object_count', jsonb_array_length(v_objects)));
  return query select o ->> 'bucket', o ->> 'path' from jsonb_array_elements(v_objects) o;
end;
$$;

revoke execute on function public.lh_deletion_request_guard() from public, anon, authenticated;
revoke execute on function public.admin_process_deletion(uuid) from public, anon;
grant execute on function public.admin_process_deletion(uuid) to authenticated;
