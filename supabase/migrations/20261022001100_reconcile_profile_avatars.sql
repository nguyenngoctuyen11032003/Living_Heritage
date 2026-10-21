-- Reconcile profile avatar setup that was applied to production before its migration history was recorded.
-- Keep this idempotent so it repairs any partial application of 20261022000500.

alter table public.profiles
  add column if not exists avatar_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_avatar_path_check'
  ) then
    alter table public.profiles
      add constraint profiles_avatar_path_check
      check (avatar_path is null or (char_length(avatar_path) <= 300 and avatar_path like id::text || '/%'));
  end if;
end;
$$;

grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: owner reads own folder" on storage.objects;
create policy "avatars: owner reads own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid());

drop policy if exists "avatars: owner uploads to own folder" on storage.objects;
create policy "avatars: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid() and not public.is_anonymous_user());

drop policy if exists "avatars: owner updates own folder" on storage.objects;
create policy "avatars: owner updates own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid())
  with check (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid() and not public.is_anonymous_user());

drop policy if exists "avatars: owner deletes own folder" on storage.objects;
create policy "avatars: owner deletes own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.lh_path_uuid(name, 1) = auth.uid());
