import { describe, expect, it } from 'vitest';
import { env, siteHref } from '@/lib/env';
import { inviteUrl } from '@/features/families/urls';
import { linkStatus } from './linkStatus';
import { assistedTellPath, narratorLinkUrl } from './urls';
import { toConsentColumns, toNarratorRow, validateNarrator, type NarratorDraft } from './validation';

const TOKEN = 'Abc_def-0123456789ABCDEFGHIJKLMN';

describe('token URL builders', () => {
  it('builds absolute storytelling links under the site root', () => {
    const url = narratorLinkUrl(TOKEN);
    expect(url).toBe(siteHref(`/k/${TOKEN}`));
    expect(url.startsWith(env.siteUrl)).toBe(true);
    expect(url.endsWith(`/k/${TOKEN}`)).toBe(true);
    expect(url).not.toContain('//k/');
  });

  it('trims and encodes tokens', () => {
    expect(narratorLinkUrl(`  ${TOKEN}\n`)).toBe(siteHref(`/k/${TOKEN}`));
    expect(narratorLinkUrl('a/b?c')).toBe(siteHref('/k/a%2Fb%3Fc'));
  });

  it('builds invite links', () => {
    expect(inviteUrl(TOKEN)).toBe(siteHref(`/moi/${TOKEN}`));
  });

  it('builds the assisted storytelling path', () => {
    expect(assistedTellPath('7c1e0a9e-1111-4222-8333-444455556666')).toBe('/ke-chuyen?narrator=7c1e0a9e-1111-4222-8333-444455556666');
  });
});

describe('linkStatus', () => {
  const now = Date.parse('2026-10-21T10:00:00Z');
  const future = '2026-11-01T00:00:00Z';
  const past = '2026-10-01T00:00:00Z';
  it('orders revoked > claimed > expired > active', () => {
    expect(linkStatus({ revoked_at: past, claimed_at: past, expires_at: future }, now)).toBe('revoked');
    expect(linkStatus({ revoked_at: null, claimed_at: past, expires_at: past }, now)).toBe('claimed');
    expect(linkStatus({ revoked_at: null, claimed_at: null, expires_at: past }, now)).toBe('expired');
    expect(linkStatus({ revoked_at: null, claimed_at: null, expires_at: future }, now)).toBe('active');
  });
});

describe('validateNarrator', () => {
  const base: NarratorDraft = { display_name: 'Bà nội Lan', pen_name: '', birth_year: '', region: '', relation: '', lang: 'vi', generation: '', consent_method: '', helper_note: '' };
  it('accepts a minimal narrator', () => {
    expect(validateNarrator(base, 2026)).toEqual({});
  });
  it('flags missing names, long pen names and bad years', () => {
    expect(validateNarrator({ ...base, display_name: '  ' }, 2026).display_name).toBe('required');
    expect(validateNarrator({ ...base, pen_name: 'x'.repeat(81) }, 2026).pen_name).toBe('tooLong');
    expect(validateNarrator({ ...base, birth_year: '1899' }, 2026).birth_year).toBe('invalidYear');
    expect(validateNarrator({ ...base, birth_year: '2030' }, 2026).birth_year).toBe('invalidYear');
    expect(validateNarrator({ ...base, birth_year: '1942' }, 2026).birth_year).toBeUndefined();
  });
  it('maps empty fields to null', () => {
    expect(toNarratorRow({ ...base, display_name: ' Ông ', pen_name: ' ', birth_year: '1940', region: 'bac' })).toEqual({
      display_name: 'Ông',
      pen_name: null,
      birth_year: 1940,
      region: 'bac',
      relation: null,
      lang: 'vi',
      generation: null,
    });
  });
  it('validates relation, storytelling language and generation', () => {
    expect(validateNarrator({ ...base, relation: 'Bà nội', lang: 'en', generation: '2' }, 2026)).toEqual({});
    expect(validateNarrator({ ...base, relation: 'x'.repeat(61) }, 2026).relation).toBe('relationTooLong');
    expect(validateNarrator({ ...base, relation: `  ${'x'.repeat(60)}  ` }, 2026).relation).toBeUndefined();
    expect(validateNarrator({ ...base, lang: 'fr' as never }, 2026).lang).toBe('invalidLang');
    expect(validateNarrator({ ...base, generation: '0' }, 2026).generation).toBe('invalidGeneration');
    expect(validateNarrator({ ...base, generation: '7' }, 2026).generation).toBe('invalidGeneration');
    expect(validateNarrator({ ...base, generation: '1.5' }, 2026).generation).toBe('invalidGeneration');
    expect(validateNarrator({ ...base, generation: '6' }, 2026).generation).toBeUndefined();
  });
  it('maps relation, lang and generation to columns', () => {
    expect(toNarratorRow({ ...base, relation: '  Bà   ngoại ', lang: 'en', generation: '3' })).toMatchObject({ relation: 'Bà ngoại', lang: 'en', generation: 3 });
  });
  it('records how consent is confirmed and who helped (B11)', () => {
    expect(validateNarrator({ ...base, consent_method: 'self_device' }, 2026)).toEqual({});
    expect(validateNarrator({ ...base, consent_method: 'assisted_phone' }, 2026).helper_note).toBe('helperRequired');
    expect(validateNarrator({ ...base, consent_method: 'assisted_phone', helper_note: '   ' }, 2026).helper_note).toBe('helperRequired');
    expect(validateNarrator({ ...base, consent_method: 'assisted_in_person', helper_note: 'Cháu Minh Anh' }, 2026)).toEqual({});
    expect(validateNarrator({ ...base, consent_method: 'assisted_video', helper_note: 'x'.repeat(121) }, 2026).helper_note).toBe('helperTooLong');
    expect(validateNarrator({ ...base, consent_method: 'checkbox' as never }, 2026).consent_method).toBe('invalidConsentMethod');
  });
  it('maps consent columns, dropping a helper note when no method is recorded', () => {
    expect(toConsentColumns(base)).toEqual({ consent_method: null, helper_note: null });
    expect(toConsentColumns({ ...base, helper_note: 'Minh Anh' })).toEqual({ consent_method: null, helper_note: null });
    expect(toConsentColumns({ ...base, consent_method: 'assisted_phone', helper_note: '  Cháu   Minh Anh ' })).toEqual({ consent_method: 'assisted_phone', helper_note: 'Cháu Minh Anh' });
  });
});
