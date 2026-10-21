// Registry of all namespaces (lead-owned). Workstreams edit only their own dict/<ns>.*.ts files.
//
// Every namespace × locale is its own lazy chunk: a page downloads only the dictionaries it uses, in its own language
// (the landing page needs `common` + `landing`, ~5 KB gz, instead of all 28 files, ~64 KB gz). useT() suspends on a
// namespace that is not loaded yet; after the first paint the rest of the current language is prefetched on idle, so
// later navigations find everything in memory.
import type admin from './dict/admin.vi';
import type auth from './dict/auth.vi';
import type books from './dict/books.vi';
import type common from './dict/common.vi';
import type demo from './dict/demo.vi';
import type family from './dict/family.vi';
import type knowledge from './dict/knowledge.vi';
import type landing from './dict/landing.vi';
import type legal from './dict/legal.vi';
import type media from './dict/media.vi';
import type narrator from './dict/narrator.vi';
import type review from './dict/review.vi';
import type settings from './dict/settings.vi';
import type vault from './dict/vault.vi';
import type { Locale } from './types';

export interface Dictionaries {
  common: typeof common;
  landing: typeof landing;
  legal: typeof legal;
  auth: typeof auth;
  narrator: typeof narrator;
  family: typeof family;
  review: typeof review;
  vault: typeof vault;
  books: typeof books;
  knowledge: typeof knowledge;
  admin: typeof admin;
  settings: typeof settings;
  media: typeof media;
  demo: typeof demo;
}
export type Namespace = keyof Dictionaries;

export const NAMESPACES = ['common', 'landing', 'legal', 'auth', 'narrator', 'family', 'review', 'vault', 'books', 'knowledge', 'admin', 'settings', 'media', 'demo'] as const satisfies readonly Namespace[];

const modules = import.meta.glob<{ default: object }>('./dict/*.ts');

const loaded: Record<Locale, Partial<Record<Namespace, object>>> = { vi: {}, en: {} };

/**
 * One promise per dictionary, kept for the page's lifetime and tagged with React's thenable status fields, so `use()`
 * returns synchronously once it has settled (an untagged promise would suspend every component for a microtask).
 */
type Tracked = Promise<object> & { status?: 'pending' | 'fulfilled' | 'rejected'; value?: object; reason?: unknown };
const promises = new Map<string, Tracked>();

/** The dictionary if it is in memory, else undefined (synchronous; never triggers a download). */
export function getLoaded(locale: Locale, ns: Namespace): object | undefined {
  return loaded[locale][ns];
}

/** Downloads one dictionary; the same promise every call (safe to pass to `use()`). A failed download is retried. */
export function loadNamespace(locale: Locale, ns: Namespace): Promise<object> {
  const key = `${ns}.${locale}`;
  const cached = promises.get(key);
  if (cached && cached.status !== 'rejected') return cached;
  const load = modules[`./dict/${key}.ts`];
  if (!load) return Promise.reject(new Error(`Unknown dictionary ${key}`));
  const p: Tracked = load().then((m) => m.default);
  p.status = 'pending';
  p.then(
    (value) => {
      loaded[locale][ns] = value;
      p.status = 'fulfilled';
      p.value = value;
    },
    (reason: unknown) => {
      p.status = 'rejected';
      p.reason = reason;
    },
  );
  promises.set(key, p);
  return p;
}

export function loadNamespaces(locale: Locale, namespaces: readonly Namespace[]): Promise<unknown> {
  return Promise.all(namespaces.map((ns) => loadNamespace(locale, ns)));
}

/** Namespaces already in memory for a locale (switching language preloads these in the new one first: no flash). */
export function loadedNamespaces(locale: Locale): Namespace[] {
  return NAMESPACES.filter((ns) => loaded[locale][ns]);
}

/** Tests and tooling: everything, both languages. */
export function loadAllDictionaries(): Promise<unknown> {
  return Promise.all((['vi', 'en'] as const).map((l) => loadNamespaces(l, NAMESPACES)));
}
