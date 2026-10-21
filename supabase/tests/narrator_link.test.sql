-- Narrator links: hashed tokens, roles, claim (idempotent, single device), expired, revoked, claimed twice,
-- rebinding; family invites; create_family.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- ===== Fixture =====
-- O1 owner A, V1 viewer A, E1 editor A, N1 anonymous narrator device (narrator nA), O2 owner B,
-- ADM admin, N2 another anonymous device.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'owner.a@test.dev', '{"display_name": "Chủ A"}', false, now()),
  ('22222222-2222-4222-8222-222222222222', 'viewer.a@test.dev', '{}', false, now()),
  ('33333333-3333-4333-8333-333333333333', 'editor.a@test.dev', '{}', false, now()),
  ('44444444-4444-4444-8444-444444444444', null, '{}', true, now()),
  ('55555555-5555-4555-8555-555555555555', 'owner.b@test.dev', '{}', false, now()),
  ('66666666-6666-4666-8666-666666666666', 'admin@test.dev', '{}', false, now()),
  ('77777777-7777-4777-8777-777777777777', null, '{}', true, now());
update public.profiles set is_admin = true where id = '66666666-6666-4666-8666-666666666666';
insert into public.families (id, name, owner_id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Gia đình A', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Gia đình B', '55555555-5555-4555-8555-555555555555');
insert into public.family_members (family_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'viewer'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'editor'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '55555555-5555-4555-8555-555555555555', 'owner');
insert into public.narrators (id, family_id, display_name, pen_name, birth_year, region, user_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Nguyễn Văn Ba', null, 1945, 'nam', '44444444-4444-4444-8444-444444444444'),
  ('a2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'Trần Thị Tư', 'Bà Tư', 1950, 'bac', null),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'Lê Văn Năm', null, 1948, 'trung', null);
insert into public.sessions (id, family_id, narrator_id) values
  ('5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001'),
  ('5b000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001');
insert into public.recordings (id, family_id, narrator_id, session_id, storage_path) values
  ('ca000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   '5a000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/rec-a.webm'),
  ('cb000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   '5b000000-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-00000000000b/b1000000-0000-4000-8000-000000000001/rec-b.webm');
insert into public.stories (id, family_id, narrator_id, recording_id, kind, title, body, visibility) values
  ('d1000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   'ca000000-0000-4000-8000-000000000001', 'story', 'Chuyện Tết xưa', 'Ngày xưa...', 'private'),
  ('d2000000-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001',
   null, 'experience', 'Kinh nghiệm chăm cây', 'Tưới nước...', 'family'),
  ('d3000000-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
   null, 'story', 'Chuyện của bà Tư', 'Bà kể...', 'private'),
  ('d4000000-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-000000000001',
   'cb000000-0000-4000-8000-000000000001', 'story', 'Chuyện nhà B', 'Nhà B...', 'family');
insert into storage.objects (bucket_id, name) values
  ('recordings', 'aaaaaaaa-0000-4000-8000-00000000000a/a1000000-0000-4000-8000-000000000001/rec-a.webm'),
  ('recordings', 'bbbbbbbb-0000-4000-8000-00000000000b/b1000000-0000-4000-8000-000000000001/rec-b.webm');

create function public.t_as(p_user uuid, p_anon boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;
create function public.t_err(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;
grant execute on function public.t_as(uuid, boolean), public.t_err(text) to anon, authenticated;

set local role authenticated;
select public.t_as('11111111-1111-4111-8111-111111111111');
select set_config('test.tok', public.create_narrator_link('a2000000-0000-4000-8000-000000000002', 30), true);
select is(char_length(current_setting('test.tok')), 32, 'the raw token is 32 url-safe chars');
select is((select token_hash from public.narrator_links where narrator_id = 'a2000000-0000-4000-8000-000000000002'),
  encode(extensions.digest(current_setting('test.tok'), 'sha256'), 'hex'), 'only the sha256 of the token is stored');
select ok((select expires_at between now() + interval '29 days' and now() + interval '31 days'
    from public.narrator_links where narrator_id = 'a2000000-0000-4000-8000-000000000002'), 'the link expires after 30 days');
select is(public.t_err($$select public.create_narrator_link('a2000000-0000-4000-8000-000000000002', 0)$$), '22023 invalid_ttl', 'ttl must be positive');
select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.t_err($$select public.create_narrator_link('a2000000-0000-4000-8000-000000000002')$$), '42501 forbidden', 'an editor cannot create links');
select is((select count(*)::integer from public.narrator_links), 0, 'an editor cannot read links');
select public.t_as('22222222-2222-4222-8222-222222222222');
select is(public.t_err($$select public.create_narrator_link('a2000000-0000-4000-8000-000000000002')$$), '42501 forbidden', 'a viewer cannot create links');

-- claim
select public.t_as('77777777-7777-4777-8777-777777777777', true);
select is(public.claim_narrator_link(current_setting('test.tok'))::text, 'a2000000-0000-4000-8000-000000000002', 'a device claims the link');
select ok(public.is_narrator_user('a2000000-0000-4000-8000-000000000002'), 'the device is now the narrator user');
select is((select array_agg(id::text) from public.stories), array['d3000000-0000-4000-8000-000000000003'], 'it sees that narrator''s stories only');
select is(public.claim_narrator_link(current_setting('test.tok'))::text, 'a2000000-0000-4000-8000-000000000002', 'claiming again is idempotent');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err(format('select public.claim_narrator_link(%L)', current_setting('test.tok'))), '22023 link_already_claimed',
  'a claimed link cannot be used by another device');
select is(public.t_err($$select public.claim_narrator_link('nope')$$), 'P0002 link_not_found', 'an unknown token is rejected');
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
select is(public.t_err(format('select public.claim_narrator_link(%L)', current_setting('test.tok'))), '42501 not_authenticated',
  'claim needs a signed-in (anonymous) user');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select user_id::text from public.narrators where id = 'a2000000-0000-4000-8000-000000000002'),
  '77777777-7777-4777-8777-777777777777', 'narrators.user_id is bound');
select is((select count(*)::integer from public.family_members), 3, 'claiming adds no family member');

-- expired
select set_config('test.tok2', public.create_narrator_link('a2000000-0000-4000-8000-000000000002', 1), true);
reset role;
update public.narrator_links set expires_at = now() - interval '1 minute'
  where token_hash = encode(extensions.digest(current_setting('test.tok2'), 'sha256'), 'hex');
set local role authenticated;
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err(format('select public.claim_narrator_link(%L)', current_setting('test.tok2'))), '22023 link_expired', 'an expired link is rejected');

-- revoked before use
select public.t_as('11111111-1111-4111-8111-111111111111');
select set_config('test.tok3', public.create_narrator_link('a2000000-0000-4000-8000-000000000002'), true);
select set_config('test.link3', (select id::text from public.narrator_links
  where token_hash = encode(extensions.digest(current_setting('test.tok3'), 'sha256'), 'hex')), true);
select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.t_err(format('select public.revoke_narrator_link(%L)', current_setting('test.link3'))), '42501 forbidden', 'an editor cannot revoke');
select public.t_as('11111111-1111-4111-8111-111111111111');
select lives_ok(format('select public.revoke_narrator_link(%L)', current_setting('test.link3')), 'the owner revokes');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err(format('select public.claim_narrator_link(%L)', current_setting('test.tok3'))), '22023 link_revoked', 'a revoked link is rejected');

-- revoking a claimed link cuts the device off
select public.t_as('11111111-1111-4111-8111-111111111111');
select lives_ok(format('select public.revoke_narrator_link(%L)', (select id from public.narrator_links
  where token_hash = encode(extensions.digest(current_setting('test.tok'), 'sha256'), 'hex'))), 'the owner revokes the claimed link');
select is((select user_id from public.narrators where id = 'a2000000-0000-4000-8000-000000000002'), null, 'the narrator is unbound');
select public.t_as('77777777-7777-4777-8777-777777777777', true);
select is((select count(*)::integer from public.stories), 0, 'the revoked device sees nothing');
select is(public.t_err(format('select public.claim_narrator_link(%L)', current_setting('test.tok'))), '22023 link_revoked',
  'the revoked device cannot claim again');

-- a fresh link moves narrator nA to a new device
select public.t_as('11111111-1111-4111-8111-111111111111');
select set_config('test.tok4', public.create_narrator_link('a1000000-0000-4000-8000-000000000001'), true);
select public.t_as('77777777-7777-4777-8777-777777777777', true);
select is(public.claim_narrator_link(current_setting('test.tok4'))::text, 'a1000000-0000-4000-8000-000000000001', 'a new device claims a fresh link');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is((select count(*)::integer from public.stories), 0, 'the previous device lost access');
select public.t_as('11111111-1111-4111-8111-111111111111');
select is((select details ->> 'rebound' from public.audit_log where action = 'claim_narrator_link'
    and details ->> 'narrator_id' = 'a1000000-0000-4000-8000-000000000001'), 'true', 'the rebinding is logged');

-- ===== Invites =====
reset role;
insert into auth.users (id, email, raw_user_meta_data, is_anonymous, created_at) values
  ('88888888-8888-4888-8888-888888888888', 'new.member@test.dev', '{}', false, now()),
  ('99999999-9999-4999-8999-999999999999', 'other@test.dev', '{}', false, now());
set local role authenticated;
select public.t_as('11111111-1111-4111-8111-111111111111');
select set_config('test.inv', public.create_family_invite('aaaaaaaa-0000-4000-8000-00000000000a', ' New.Member@Test.dev ', 'editor'), true);
select is(public.t_err($$select public.create_family_invite('aaaaaaaa-0000-4000-8000-00000000000a', 'x@test.dev', 'owner')$$), '22023 invalid_role',
  'nobody can be invited as owner');
select is((select email from public.family_invites), 'new.member@test.dev', 'the email is normalised');
select public.t_as('33333333-3333-4333-8333-333333333333');
select is(public.t_err($$select public.create_family_invite('aaaaaaaa-0000-4000-8000-00000000000a', 'x@test.dev')$$), '42501 forbidden',
  'an editor cannot invite');
select public.t_as('99999999-9999-4999-8999-999999999999');
select is(public.t_err(format('select public.accept_invite(%L)', current_setting('test.inv'))), '42501 invite_email_mismatch',
  'the invite is bound to its email');
select public.t_as('44444444-4444-4444-8444-444444444444', true);
select is(public.t_err(format('select public.accept_invite(%L)', current_setting('test.inv'))), '42501 anonymous_not_allowed',
  'anonymous users cannot accept invites');
select public.t_as('88888888-8888-4888-8888-888888888888');
select is(public.accept_invite(current_setting('test.inv'))::text, 'aaaaaaaa-0000-4000-8000-00000000000a', 'the invitee joins');
select is(public.family_role('aaaaaaaa-0000-4000-8000-00000000000a')::text, 'editor', 'with the invited role');
select is(public.accept_invite(current_setting('test.inv'))::text, 'aaaaaaaa-0000-4000-8000-00000000000a', 'accepting again is idempotent');
select is(public.t_err($$select public.accept_invite('nope')$$), 'P0002 invite_not_found', 'unknown invite');
select public.t_as('99999999-9999-4999-8999-999999999999');
select is(public.t_err(format('select public.accept_invite(%L)', current_setting('test.inv'))), '22023 invite_used', 'a used invite cannot be reused');

-- ===== create_family =====
select set_config('test.fam', public.create_family('  Nhà mới  ')::text, true);
select is(public.family_role(current_setting('test.fam')::uuid)::text, 'owner', 'the creator becomes owner');
select is((select name from public.families where id = current_setting('test.fam')::uuid), 'Nhà mới', 'the name is trimmed');
select is(public.t_err($$select public.create_family('   ')$$), '22023 invalid_name', 'an empty name is rejected');

select * from finish();
rollback;
