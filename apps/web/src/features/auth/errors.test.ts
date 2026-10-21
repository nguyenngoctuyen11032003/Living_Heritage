import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n';
import { AUTH_ERROR_KEYS, authErrorKey } from './errors';
import { loginHref, safeNext } from './next';

describe('authErrorKey', () => {
  it('prefers the Supabase error code', () => {
    expect(authErrorKey({ code: 'invalid_credentials', message: 'whatever' })).toBe('invalidCredentials');
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('userExists');
    expect(authErrorKey({ code: 'weak_password' })).toBe('weakPassword');
    expect(authErrorKey({ code: 'over_email_send_rate_limit' })).toBe('rateLimit');
    expect(authErrorKey({ code: 'anonymous_provider_disabled' })).toBe('anonymousDisabled');
    expect(authErrorKey({ code: 'otp_disabled' })).toBe('noAccount');
    expect(authErrorKey({ code: 'otp_expired' })).toBe('linkInvalid');
  });

  it('falls back to known English messages', () => {
    expect(authErrorKey({ message: 'Invalid login credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ message: 'Email not confirmed' })).toBe('emailNotConfirmed');
    expect(authErrorKey({ message: 'User already registered' })).toBe('userExists');
    expect(authErrorKey({ message: 'Password should be at least 8 characters.' })).toBe('weakPassword');
    expect(authErrorKey({ message: 'Signups not allowed for otp' })).toBe('noAccount');
    expect(authErrorKey({ message: 'Anonymous sign-ins are disabled' })).toBe('anonymousDisabled');
    expect(authErrorKey({ message: 'invalid request: both auth code and code verifier should be non-empty' })).toBe('differentBrowser');
    expect(authErrorKey({ message: 'Email link is invalid or has expired' })).toBe('linkInvalid');
  });

  it('detects rate limits and network failures', () => {
    expect(authErrorKey({ status: 429, message: '' })).toBe('rateLimit');
    expect(authErrorKey({ name: 'AuthRetryableFetchError', message: '{}' })).toBe('network');
    expect(authErrorKey(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('returns unknown for anything else', () => {
    expect(authErrorKey(null)).toBe('unknown');
    expect(authErrorKey({ message: 'Database error saving new user' })).toBe('unknown');
    expect(authErrorKey('boom')).toBe('unknown');
  });

  it('has a translation for every key in both languages', () => {
    for (const key of AUTH_ERROR_KEYS) {
      expect(translate('vi', 'auth', `errors.${key}`)).not.toBe(`errors.${key}`);
      expect(translate('en', 'auth', `errors.${key}`)).not.toBe(`errors.${key}`);
    }
  });
});

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/gia-dinh/nguoi-ke?x=1')).toBe('/gia-dinh/nguoi-ke?x=1');
    expect(safeNext('/moi/abc')).toBe('/moi/abc');
  });
  it('rejects external or malformed targets', () => {
    expect(safeNext('https://evil.example')).toBe('/gia-dinh');
    expect(safeNext('//evil.example')).toBe('/gia-dinh');
    expect(safeNext('/\\evil.example')).toBe('/gia-dinh');
    expect(safeNext('javascript:alert(1)')).toBe('/gia-dinh');
    expect(safeNext(null, '/x')).toBe('/x');
  });
  it('builds encoded login links', () => {
    expect(loginHref('/moi/abc')).toBe('/dang-nhap?next=%2Fmoi%2Fabc');
    expect(loginHref('https://evil')).toBe('/dang-nhap');
    expect(loginHref(null, '/dang-ky')).toBe('/dang-ky');
  });
});
