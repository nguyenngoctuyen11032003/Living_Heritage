import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPublicEnv } from './check-public-env.mjs';

const jwt = (role) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.sig`;
const ok = { VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123' };
const full = {
  ...ok,
  VITE_SITE_URL: 'https://nguyenngoctuyen11032003.github.io/Living_Heritage',
  VITE_BASE_PATH: '/Living_Heritage/',
};

test('accepts the four allowed variables with publishable or anon keys', () => {
  assert.deepEqual(checkPublicEnv(ok), []);
  assert.deepEqual(checkPublicEnv(full, { strict: true }), []);
  assert.deepEqual(checkPublicEnv({ ...ok, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }), []);
});

test('rejects secret and service_role keys', () => {
  assert.match(checkPublicEnv({ ...ok, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })[0], /SECRET/);
  assert.match(checkPublicEnv({ ...ok, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role') })[0], /service_role/);
});

test('rejects any VITE_ name outside the allowlist', () => {
  for (const name of ['VITE_GEMINI_API_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_DB_PASSWORD', 'VITE_FOO']) {
    const errors = checkPublicEnv({ ...ok, [name]: 'x' });
    assert.equal(errors.length, 1, name);
    assert.match(errors[0], new RegExp(name));
  }
  // Non-VITE_ server-side variables are not bundled and stay allowed.
  assert.deepEqual(checkPublicEnv({ ...ok, SUPABASE_SERVICE_ROLE_KEY: 'x', GEMINI_API_KEY: 'y', SUPABASE_ACCESS_TOKEN: 'z' }), []);
});

test('scans allowed VITE_ values for secrets', () => {
  assert.match(checkPublicEnv({ ...ok, VITE_SITE_URL: 'sb_secret_x' })[0], /sb_secret_/);
  assert.match(checkPublicEnv({ ...ok, VITE_BASE_PATH: jwt('service_role') })[0], /service_role/);
  assert.ok(checkPublicEnv({ ...ok, VITE_OTHER: jwt('service_role') }).length >= 2);
});

test('strict mode requires values; non-strict allows empty', () => {
  assert.deepEqual(checkPublicEnv({}), []);
  assert.equal(checkPublicEnv({}, { strict: true }).length, 1);
});

test('rejects half-configured env in any mode', () => {
  for (const strict of [false, true]) {
    assert.match(checkPublicEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co' }, { strict })[0], /VITE_SUPABASE_PUBLISHABLE_KEY/);
    assert.match(checkPublicEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_1' }, { strict })[0], /VITE_SUPABASE_URL/);
  }
});

test('rejects non-https, placeholder and malformed URLs', () => {
  for (const bad of ['http://abc.supabase.co', 'https://<project-ref>.supabase.co', 'https://localhost', 'https://abc.supabase.co/rest']) {
    assert.ok(checkPublicEnv({ ...ok, VITE_SUPABASE_URL: bad }).length > 0, bad);
  }
  assert.deepEqual(checkPublicEnv({ ...ok, VITE_SUPABASE_URL: 'https://abc.supabase.co/' }), []);
});

test('JWT key must have role anon explicitly', () => {
  const noRole = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{}').toString('base64url')}.sig`;
  assert.ok(checkPublicEnv({ ...ok, VITE_SUPABASE_PUBLISHABLE_KEY: noRole }).length > 0);
  assert.ok(checkPublicEnv({ ...ok, VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJ.%%%.x' }).length > 0);
  assert.match(checkPublicEnv({ ...ok, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('authenticated') })[0], /authenticated/);
});
