-- Di Sản Sống: public hub hardening and saved items.
-- 1. search_public returns an explicit, anon-safe column list (no embedding / embedded_at / story_id), and anon /
--    authenticated lose SELECT on public_items.embedding and embedded_at (column grants instead of the table grant).
-- 2. The public snapshot carries the source recording's duration_s in `fields`, only when the audio may be shown;
--    a guard trigger keeps public_items.fields free of duration_s whenever audio_allowed is false. Existing rows
--    are backfilled.
-- 3. saved_items: a signed-in visitor's own bookmarks of public items.

-- ---------------------------------------------------------------------------
-- 1. search_public without internal columns
-- ---------------------------------------------------------------------------

-- The return type changes (setof public_items → explicit table), which needs a drop; same name, args and semantics.
drop function public.search_public(text, text, public.story_kind, text, integer, integer, integer);

create function public.search_public(
  q text default null,
  p_topic text default null,
  p_kind public.story_kind default null,
  p_region text default null,
  p_decade integer default null,
  lim integer default 12,
  off integer default 0
)
returns table (
  id uuid,
  kind public.story_kind,
  title text,
  summary text,
  body text,
  fields jsonb,
  topic_id uuid,
  topic_slug text,
  lang text,
  region text,
  decade integer,
  narrator_label text,
  audio_allowed boolean,
  audio_path text,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select nullif(btrim(regexp_replace(public.lh_unaccent(lower(coalesce(q, ''))), '[^[:alnum:]]+', ' ', 'g')), '') as qn
  ), tsq as (
    select p.qn,
      case when p.qn is null then null
        else to_tsquery('simple'::regconfig,
          (select string_agg(w || ':*', ' & ') from regexp_split_to_table(p.qn, ' ') as w where w <> ''))
      end as query
    from params p
  )
  select pi.id, pi.kind, pi.title, pi.summary, pi.body, pi.fields, pi.topic_id, pi.topic_slug, pi.lang, pi.region,
    pi.decade, pi.narrator_label, pi.audio_allowed, pi.audio_path, pi.published_at, pi.updated_at
  from public.public_items pi, tsq
  where (tsq.qn is null
      or pi.search_tsv @@ tsq.query
      or tsq.qn operator(extensions.<%) public.lh_unaccent(lower(pi.title)))
    and (p_topic is null or pi.topic_slug = p_topic)
    and (p_kind is null or pi.kind = p_kind)
    and (p_region is null or pi.region = p_region)
    and (p_decade is null or pi.decade = p_decade)
  order by
    case when tsq.qn is null then 0
      else ts_rank(pi.search_tsv, tsq.query)
        + extensions.word_similarity(tsq.qn, public.lh_unaccent(lower(pi.title))) end desc,
    pi.published_at desc
  limit greatest(1, least(coalesce(lim, 12), 50))
  offset greatest(0, coalesce(off, 0));
$$;

revoke execute on function public.search_public(text, text, public.story_kind, text, integer, integer, integer) from public;
grant execute on function public.search_public(text, text, public.story_kind, text, integer, integer, integer)
  to anon, authenticated;

-- Column grants replace the table grant: every column the web reads stays readable (story_id is still selected by
-- apps/web knowledge/types.ts PUBLIC_ITEM_COLUMNS), the embedding columns are not. service_role keeps full access.
revoke select on public.public_items from anon, authenticated;
grant select (id, story_id, kind, title, summary, body, fields, topic_id, topic_slug, lang, region, decade,
  narrator_label, audio_allowed, audio_path, published_at, updated_at, search_tsv)
  on public.public_items to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. duration_s in the public snapshot (only with audio)
-- ---------------------------------------------------------------------------

create or replace function public.lh_public_snapshot(p_story uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_narr public.narrators%rowtype;
  v_set public.story_share_settings%rowtype;
  v_slug text;
  v_decade integer;
  v_raw text;
  v_audio boolean;
  v_duration numeric;
  v_fields jsonb;
begin
  select * into v_story from public.stories s where s.id = p_story;
  if not found then
    return null;
  end if;
  select * into v_narr from public.narrators n where n.id = v_story.narrator_id;
  select * into v_set from public.story_share_settings ss where ss.story_id = p_story;
  if not found then
    v_set.show_audio := false;
    v_set.show_real_name := false;
    v_set.show_region := true;
    v_set.show_photos := false;
  end if;
  select t.slug into v_slug from public.topics t where t.id = v_story.topic_id;
  v_raw := v_story.fields ->> 'decade';
  if v_raw ~ '^\d{4}$' and v_raw::integer between 1900 and 2090 then
    v_decade := (v_raw::integer / 10) * 10;
  end if;
  v_audio := coalesce(v_set.show_audio, false) and v_story.recording_id is not null;
  v_fields := coalesce(v_story.fields, '{}'::jsonb) - 'duration_s';
  if v_audio then
    select r.duration_s into v_duration from public.recordings r where r.id = v_story.recording_id;
    if v_duration is not null then
      v_fields := v_fields || jsonb_build_object('duration_s', v_duration);
    end if;
  end if;
  return jsonb_build_object(
    'story_id', v_story.id,
    'kind', v_story.kind,
    'title', v_story.title,
    'summary', v_story.summary,
    'body', v_story.body,
    'fields', v_fields,
    'topic_id', v_story.topic_id,
    'topic_slug', v_slug,
    'lang', v_story.lang,
    'region', case when v_set.show_region then v_narr.region end,
    'decade', v_decade,
    'narrator_label', case
      when v_set.show_real_name then v_narr.display_name
      when v_narr.pen_name is not null then v_narr.pen_name
      else 'Người kể ẩn danh' end,
    'audio_allowed', v_audio
  );
end;
$$;

revoke execute on function public.lh_public_snapshot(uuid) from public, anon, authenticated;

-- Invariant: a public item whose audio may not be shown never reveals the recording's duration (e.g. after the
-- share-settings trigger switches audio off).
create or replace function public.lh_public_items_audio_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.audio_allowed and new.fields ? 'duration_s' then
    new.fields := new.fields - 'duration_s';
  end if;
  return new;
end;
$$;

revoke execute on function public.lh_public_items_audio_fields() from public, anon, authenticated;

create trigger public_items_audio_fields before insert or update on public.public_items
  for each row execute function public.lh_public_items_audio_fields();

-- Backfill: published items with audio get their duration; items without audio lose any stray duration_s.
-- (Changing fields clears the embedding; the knowledge function re-embeds those rows lazily.)
update public.public_items pi
  set fields = pi.fields || jsonb_build_object('duration_s', r.duration_s)
  from public.stories s
  join public.recordings r on r.id = s.recording_id
  where s.id = pi.story_id
    and pi.audio_allowed
    and r.duration_s is not null
    and (pi.fields -> 'duration_s') is distinct from to_jsonb(r.duration_s);
update public.public_items pi
  set fields = pi.fields - 'duration_s'
  where not pi.audio_allowed and pi.fields ? 'duration_s';

-- ---------------------------------------------------------------------------
-- 3. saved_items
-- ---------------------------------------------------------------------------

create table public.saved_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  public_item_id uuid not null references public.public_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, public_item_id)
);
create index saved_items_item_idx on public.saved_items (public_item_id);
comment on table public.saved_items is 'A signed-in visitor''s bookmarks of public items; withdrawn items disappear (cascade).';

alter table public.saved_items enable row level security;
revoke all on public.saved_items from public, anon, authenticated;
grant select, delete on public.saved_items to authenticated;
grant insert (user_id, public_item_id) on public.saved_items to authenticated;

create policy "saved_items: own rows read" on public.saved_items
  for select to authenticated using (user_id = auth.uid());
create policy "saved_items: own rows insert" on public.saved_items
  for insert to authenticated with check (user_id = auth.uid());
create policy "saved_items: own rows delete" on public.saved_items
  for delete to authenticated using (user_id = auth.uid());
