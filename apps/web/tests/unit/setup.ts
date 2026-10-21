import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { loadAllDictionaries } from '@/i18n';

// Dictionaries are lazy chunks in the app (useT suspends until one arrives); tests render synchronously, so load all.
await loadAllDictionaries();

afterEach(() => {
  cleanup();
  localStorage.clear();
});

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!('IntersectionObserver' in window)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
}

// motion's WAAPI path makes happy-dom raise unhandled AbortErrors; force the JS animation fallback in tests.
if ('animate' in Element.prototype) {
  delete (Element.prototype as unknown as Record<string, unknown>).animate;
}
