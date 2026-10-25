// Mock-backed checks mapped to the acceptance criteria in DỰ ÁN.md B19 that journeys.spec.ts / visual.spec.ts do not
// already cover: NT12 (no horizontal scroll at 360 / 768 / 1440 on every public
// screen) and the NT13 pieces not asserted elsewhere (focus rings on a form, reflow at 320 px, no autoplay, reduced motion).
// NT01 / NT02 and the keyboard-only passes live in journeys.spec.ts; the skip link is asserted there too.
// NT04-NT11 and NT14-NT18 need a real device, the real backend or an operator (RLS: supabase/tests, pgTAP).
import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, IDS, mockSupabase, ready, signedIn } from './fixtures';
import { openScreen, SCREENS } from './routes';

test('NT03: the landing page invents no achievement counters', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/');
  await ready(page);
  const text = (await page.locator('main').innerText()).toLowerCase();
  expect(text).not.toMatch(/\d[\d.,]*\s*\+?\s*(người dùng|gia đình đã|đối tác|users|partners|families)/);
});

test.describe('NT12: no horizontal scroll at 360 / 768 / 1440 px', () => {
  const publicRoutes = SCREENS.filter((r) => r.who === 'anon' && r.area !== 'narrator');
  for (const width of [360, 768, 1440]) {
    for (const route of publicRoutes) {
      test(`${route.name} @${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openScreen(page, route);
        await expectNoHorizontalScroll(page);
      });
    }
  }
});

test.describe('NT13: focus, reflow, audio and motion', () => {
  test('tab stops on the login form show a visible focus indicator', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/dang-nhap');
    await ready(page);
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
        return { key: `${el.tagName}:${el.getAttribute('name') ?? el.textContent?.trim().slice(0, 20)}`, visible };
      });
      if (!info) continue;
      seen.add(info.key);
      expect(info.visible, `focus ring on ${info.key}`).toBe(true);
    }
    expect(seen.size, 'the form is reachable by keyboard').toBeGreaterThan(3);
  });

  test('reflows at 320 px (200% zoom of a 640 px window) without horizontal scroll', async ({ page }) => {
    await mockSupabase(page);
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ['/dang-nhap', '/kham-pha', `/tri-thuc/${IDS.pubTuongBan}`]) {
      await page.goto(path);
      await ready(page);
      await expectNoHorizontalScroll(page);
    }
  });

  test('no audio or video starts by itself on story and item pages', async ({ page }) => {
    await mockSupabase(page);
    await signedIn(page);
    for (const path of [`/cau-chuyen/${IDS.storyTet}`, `/tri-thuc/${IDS.pubBike}`]) {
      await page.goto(path);
      await ready(page);
      await page.waitForTimeout(500);
      const playing = await page.$$eval('audio, video', (els) => els.filter((e) => !(e as HTMLMediaElement).paused || e.hasAttribute('autoplay')).length);
      expect(playing, `${path} must not autoplay`).toBe(0);
    }
  });

  test('prefers-reduced-motion is honoured: no infinite animations on the landing page', async ({ page }) => {
    await mockSupabase(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await ready(page);
    const infinite = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations === Infinity)
        .map((a) => (a as CSSAnimation).animationName ?? 'animation'),
    );
    expect(infinite).toEqual([]);
  });
});
