// "Máy chưa cho dùng micro": which browser's steps to show (B7 — guidance per browser, never a re-prompt loop).

export type MicHelpBrowser = 'ios' | 'android' | 'safari' | 'firefox' | 'chromium';

/** Rough browser family from the user agent. Every iOS browser is WebKit and follows the iOS settings path. */
export function micHelpBrowser(ua: string, maxTouchPoints = 0): MicHelpBrowser {
  // iPadOS 13+ reports a Mac user agent; touch points give it away.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/Safari\//i.test(ua) && !/Chrome\/|Chromium\/|Edg\//i.test(ua)) return 'safari';
  return 'chromium';
}

export function currentMicHelpBrowser(): MicHelpBrowser {
  if (typeof navigator === 'undefined') return 'chromium';
  return micHelpBrowser(navigator.userAgent ?? '', navigator.maxTouchPoints ?? 0);
}
