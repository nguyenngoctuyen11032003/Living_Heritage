import { useCallback, useContext } from 'react';
import { dictionaries, type Dictionaries, type Namespace } from './dictionaries';
import { LocaleContext, type LocaleContextValue } from './LocaleProvider';
import type { DotPath, Locale } from './types';

export type TVars = Record<string, string | number>;
export type TFunction<N extends Namespace> = (key: DotPath<Dictionaries[N]>, vars?: TVars) => string;

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

/** Pure lookup, usable outside React. Missing keys return the key itself. */
export function translate(locale: Locale, ns: Namespace, key: string, vars?: TVars): string {
  let node: unknown = dictionaries[locale][ns];
  for (const part of key.split('.')) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** const t = useT('landing'); t('hero.title', { n: 3 }) */
export function useT<N extends Namespace>(ns: N): TFunction<N> {
  const { locale } = useLocale();
  return useCallback((key, vars) => translate(locale, ns, key, vars), [locale, ns]);
}

/** Pick the field for the current locale from bilingual data: pick({ vi: 'Xin chào', en: 'Hello' }). */
export function usePick() {
  const { locale } = useLocale();
  return useCallback(<T>(value: { vi: T; en: T }): T => value[locale], [locale]);
}
