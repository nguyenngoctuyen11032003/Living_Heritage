import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n';
import { AVATAR_MAX_BYTES, avatarObjectPath, validateAvatarFile } from './avatar';

describe('profile avatar', () => {
  it('accepts supported images up to 2 MB', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: 'image/jpeg', size: AVATAR_MAX_BYTES })).toBeNull();
  });

  it('rejects other types and oversized files', () => {
    expect(validateAvatarFile({ type: 'application/pdf', size: 10 })).toBe('type');
    expect(validateAvatarFile({ type: 'image/svg+xml', size: 10 })).toBe('type');
    expect(validateAvatarFile({ type: 'image/webp', size: AVATAR_MAX_BYTES + 1 })).toBe('size');
  });

  it('stores objects under the user folder with a fresh name', () => {
    expect(avatarObjectPath('u1', 'image/png', 'abc')).toBe('u1/abc.png');
    expect(avatarObjectPath('u1', 'image/jpeg', 'abc')).toBe('u1/abc.jpg');
  });

  it('has messages in both languages', () => {
    for (const locale of ['vi', 'en'] as const) {
      for (const key of ['errorType', 'errorSize', 'uploadFailed', 'change', 'remove']) {
        expect(translate(locale, 'settings', `profile.avatar.${key}`)).not.toBe(`profile.avatar.${key}`);
      }
      expect(translate(locale, 'common', 'theme.toDark')).not.toBe('theme.toDark');
    }
  });
});
