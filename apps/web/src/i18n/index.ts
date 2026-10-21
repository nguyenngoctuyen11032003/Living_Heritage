export { LocaleProvider, LocaleContext, LOCALE_STORAGE_KEY, detectLocale, preloadNamespaces } from './LocaleProvider';
export { useT, useDict, useLocale, usePick, translate } from './useT';
export type { TFunction, TVars } from './useT';
export type { Locale, Shape, DotPath } from './types';
export type { Namespace } from './dictionaries';
export { loadNamespace, loadNamespaces, loadAllDictionaries } from './dictionaries';
