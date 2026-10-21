-- B11/B13: no catch-all consent checkbox. On the assisted path approve_story now always needs p_consent_method
-- (assisted_in_person / assisted_phone / assisted_video) and p_helper_relation (1..60 chars); the legacy fallback
-- of 20261022000600/0700 (narrator's stored method, else 'unspecified') is removed. Same signature as 0700.
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
    if p_consent_method is null or p_consent_method not in ('assisted_in_person', 'assisted_phone', 'assisted_video') then
      raise exception using errcode = '22023', message = 'invalid_consent_method';
    end if;
    if v_helper is null or char_length(v_helper) > 60 then
      raise exception using errcode = '22023', message = 'helper_relation_required';
    end if;
    v_consent := p_consent_method;
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
