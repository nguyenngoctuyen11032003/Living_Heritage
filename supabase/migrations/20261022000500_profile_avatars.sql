-- Profile avatars (settings > Hồ sơ).
--
-- 1. profiles.avatar_path: object path in the public 'avatars' bucket. The path (not a full URL) is stored so a
--    user cannot point their avatar at an arbitrary external URL that co-members' browsers would then load; the
--    check pins it to the user's own folder '{user_id}/…'. The client builds the public URL from the path.
-- 2. 'avatars' bucket: public read (avatars are shown to co-members and are not sensitive), 2 MB, images only.
--    Writes are limited to the caller's own folder: avatars/{auth.uid()}/{file}.

alter table public.profiles
  add column if not exists avatar_path text
    check (avatar_path is null or (char_length(avatar_path) <= 300 and avatar_path like id::text || '/%'));

grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without a select policy; this one lets the owner list/remove their files.
create policy "avatars: owner reads own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid());
create policy "avatars: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid() and not public.is_anonymous_user());
create policy "avatars: owner updates own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid())
  with check (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid() and not public.is_anonymous_user());
create policy "avatars: owner deletes own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid());
