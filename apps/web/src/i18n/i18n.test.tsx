import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getLoaded, NAMESPACES } from './dictionaries';
import { LocaleProvider, LOCALE_STORAGE_KEY } from './LocaleProvider';
import { translate, useLocale, useT } from './useT';

function Probe() {
  const t = useT('common');
  const { setLocale } = useLocale();
  return (
    <div>
      <p data-testid="out">{t('nav.login')}</p>
      <button onClick={() => setLocale('en')}>en</button>
    </div>
  );
}

function leafKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
  it('switches language, persists it and updates <html lang>', async () => {
    render(
      <LocaleProvider initial="vi">
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('Đăng nhập');
    expect(document.documentElement.lang).toBe('vi');
    act(() => screen.getByText('en').click());
    // The new language's dictionaries load before the switch (no raw keys on screen).
    await waitFor(() => {
      expect(screen.getByTestId('out')).toHaveTextContent('Log in');
      expect(document.documentElement.lang).toBe('en');
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    });
  });

  it('interpolates {vars} and falls back to the key', () => {
    expect(translate('vi', 'common', 'brand.name')).toBe('Di Sản Sống');
    expect(translate('en', 'common', 'missing.key')).toBe('missing.key');
  });

  it('every namespace has identical vi/en key sets', () => {
    for (const ns of NAMESPACES) {
      expect(leafKeys(getLoaded('en', ns)).sort(), ns).toEqual(leafKeys(getLoaded('vi', ns)).sort());
    }
  });
});
