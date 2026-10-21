-- Media bucket access follows story_photos:
-- 1. anyone who can read a story can read its photo files (incl. the narrator device, which is not a family member);
-- 2. family editors may delete a media file once no story_photos row references it any more (the app deletes the row
--    first, then the file), so editors no longer leave orphaned files behind.

create or replace function public.can_read_media_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.story_photos sp
    where sp.storage_path = p_name and public.can_read_story(sp.story_id)
  );
$$;

create or replace function public.media_object_unreferenced(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.story_photos sp where sp.storage_path = p_name);
$$;

revoke execute on function public.can_read_media_object(text), public.media_object_unreferenced(text) from public, anon;
grant execute on function public.can_read_media_object(text), public.media_object_unreferenced(text) to authenticated;

create policy "media: story readers read photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.can_read_media_object(name));

create policy "media: editors delete unreferenced" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and public.is_family_editor(public.lh_path_uuid(name, 1))
    and public.media_object_unreferenced(name)
  );
