import { describe, expect, it } from 'vitest';
import { micHelpBrowser } from './micHelp';

describe('micHelpBrowser', () => {
  it('sends every iOS browser (and iPadOS desktop mode) to the iOS settings steps', () => {
    expect(micHelpBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1')).toBe('ios');
    expect(micHelpBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1')).toBe('ios');
    expect(micHelpBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15', 5)).toBe('ios');
  });

  it('tells Android, desktop Safari, Firefox and Chromium apart', () => {
    expect(micHelpBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36')).toBe('android');
    expect(micHelpBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15', 0)).toBe('safari');
    expect(micHelpBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0')).toBe('firefox');
    expect(micHelpBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0')).toBe('chromium');
    expect(micHelpBrowser('')).toBe('chromium');
  });
});
