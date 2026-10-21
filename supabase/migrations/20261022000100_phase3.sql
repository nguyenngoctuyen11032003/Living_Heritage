-- Phase 3: narrator relation/language/generation, story photos, semantic search over public items.

-- ---------------------------------------------------------------------------
-- Narrators: relation note, storytelling language (AI drafts in this language), generation for the family tree
-- ---------------------------------------------------------------------------

alter table public.narrators
  add column relation text check (relation is null or char_length(btrim(relation)) between 1 and 60),
  add column lang text not null default 'vi' check (lang in ('vi', 'en')),
  add column generation smallint check (generation is null or generation between 1 and 6);

comment on column public.narrators.lang is 'Language the narrator tells stories in; ai-process transcribes and drafts in it.';
comment on column public.narrators.generation is '1 = oldest generation shown in the family tree (cụ), 2 = ông bà, 3 = cha mẹ, ...';

grant insert (relation, lang, generation) on public.narrators to authenticated;
grant update (relation, lang, generation) on public.narrators to authenticated;

-- ---------------------------------------------------------------------------
-- Story photos (bucket `media`, path {family_id}/{uuid}.{ext}); access follows the story
-- ---------------------------------------------------------------------------

create table public.story_photos (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  family_id uuid not null,
  storage_path text not null unique
    check (storage_path ~ ('^' || family_id::text || '/[A-Za-z0-9._-]{1,120}$')),
  caption text check (caption is null or char_length(caption) <= 300),
  position integer not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (story_id, family_id) references public.stories (id, family_id) on delete cascade
);
create index story_photos_story_idx on public.story_photos (story_id, position);
create index story_photos_family_idx on public.story_photos (family_id, created_at desc);

alter table public.story_photos enable row level security;

create policy "story_photos: read with story" on public.story_photos
  for select to authenticated using (public.can_read_story(story_id));
create policy "story_photos: writers insert" on public.story_photos
  for insert to authenticated with check (public.can_write_story(story_id) and created_by = auth.uid());
create policy "story_photos: writers update" on public.story_photos
  for update to authenticated using (public.can_write_story(story_id)) with check (public.can_write_story(story_id));
create policy "story_photos: writers delete" on public.story_photos
  for delete to authenticated using (public.can_write_story(story_id));

revoke all on public.story_photos from public, anon, authenticated;
grant select, delete on public.story_photos to authenticated;
grant insert (story_id, family_id, storage_path, caption, position) on public.story_photos to authenticated;
grant update (caption, position) on public.story_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Semantic search over public items (pgvector + Gemini embeddings, written by the service role)
-- ---------------------------------------------------------------------------

create extension if not exists vector with schema extensions;

alter table public.public_items
  add column embedding extensions.vector(768),
  add column embedded_at timestamptz;

create index public_items_embedding_idx on public.public_items
  using hnsw (embedding extensions.vector_cosine_ops);

-- Any content change makes the embedding stale: clear it so the knowledge function re-embeds the row.
create or replace function public.lh_public_items_reset_embedding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.title is distinct from old.title or new.summary is distinct from old.summary
     or new.body is distinct from old.body or new.fields is distinct from old.fields then
    new.embedding := null;
    new.embedded_at := null;
  end if;
  return new;
end;
$$;

create trigger public_items_reset_embedding before update on public.public_items
  for each row execute function public.lh_public_items_reset_embedding();

revoke execute on function public.lh_public_items_reset_embedding() from public, anon, authenticated;

-- Nearest public items to a query embedding (cosine similarity, 1 = identical). Security definer: public_items
-- rows are public anyway, and clients have no column grant on embedding.
create or replace function public.match_public_items(
  p_embedding extensions.vector(768),
  p_limit integer default 6,
  p_min_similarity double precision default 0.5
)
returns table (
  id uuid,
  kind public.story_kind,
  title text,
  summary text,
  body text,
  fields jsonb,
  topic_slug text,
  narrator_label text,
  region text,
  decade integer,
  similarity double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select pi.id, pi.kind, pi.title, pi.summary, pi.body, pi.fields, pi.topic_slug, pi.narrator_label, pi.region, pi.decade,
         1 - (pi.embedding operator(extensions.<=>) p_embedding) as similarity
  from public.public_items pi
  where pi.embedding is not null
    and 1 - (pi.embedding operator(extensions.<=>) p_embedding) >= p_min_similarity
  order by pi.embedding operator(extensions.<=>) p_embedding
  limit least(greatest(coalesce(p_limit, 6), 1), 12);
$$;

revoke execute on function public.match_public_items(extensions.vector, integer, double precision) from public, anon;
grant execute on function public.match_public_items(extensions.vector, integer, double precision) to authenticated, service_role;
