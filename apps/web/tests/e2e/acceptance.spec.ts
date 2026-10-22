// Mock-backed checks mapped to the acceptance criteria in DỰ ÁN.md B19 (NT01, NT02, NT03, NT12, NT13).
// NT04-NT11 and NT14-NT18 need a real device, the real backend or an operator and are not covered here
// (RLS and cross-family access live in supabase/tests, pgTAP).
import { expect, test, type Page } from '@playwright/test';
import { anonymousNarrator, expectNoHorizontalScroll, fakeMicrophone, IDS, mockSupabase, ready, signedIn, TOPICS } from './fixtures';
import { vi } from './i18n';
import { openScreen, SCREENS } from './routes';

/** True when the page offers at least one way forward (link or button): the demo path has no dead end. */
async function hasExit(page: Page) {
  return page.locator('main a[href], main button, nav a[href]').first().isVisible();
}

test('NT01: narrator link, session, draft, vault, story and book outputs have no dead end', async ({ page }) => {
  const mock = await mockSupabase(page);
  await fakeMicrophone(page);

  await page.goto(`/k/${IDS.linkToken}`);
  await expect(page).toHaveURL(/\/ke-chuyen$/);
  await ready(page);
  expect(await hasExit(page)).toBe(true);

  await page.getByRole('link', { name: TOPICS[0]!.title_vi, exact: true }).click();
  await expect(page).toHaveURL(/\/ke-chuyen\/phien\//);
  await ready(page);
  expect(await hasExit(page)).toBe(true);

  await page.goto(`/ban-nhap/${IDS.storyHarvest}`);
  await ready(page);
  expect(await hasExit(page)).toBe(true);

  await signedIn(page);
  await page.goto('/gia-dinh');
  await ready(page);
  await page.getByRole('region', { name: vi.vault.results.heading }).getByRole('link', { name: 'Tết ở làng Đông Ngạc năm 1955' }).click();
  await expect(page).toHaveURL(new RegExp(`/cau-chuyen/${IDS.storyTet}`));
  await ready(page);
  expect(await hasExit(page)).toBe(true);

  for (const path of ['/sach', `/sach/${IDS.book}`, `/sach/${IDS.book}/in`]) {
    await page.goto(path);
    await ready(page);
    await expect(page.getByRole('heading', { level: 1, name: vi.common.notFound.title })).toHaveCount(0);
  }
  expect(mock.unmocked, 'every backend call of the demo path is answered by a mock').toEqual([]);
});

test('NT02: search by keyword, open an item and see its source and allowed use', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/kham-pha');
  await ready(page);
  const search = page.getByRole('search');
  await search.getByRole('searchbox', { name: vi.knowledge.hero.searchLabel }).fill('tuong');
  await search.getByRole('button', { name: vi.knowledge.hero.searchCta, exact: true }).click();
  await page.getByRole('link', { name: 'Cách ủ tương Bần' }).click();
  await expect(page).toHaveURL(new RegExp(`/tri-thuc/${IDS.pubTuongBan}`));
  await expect(page.getByRole('heading', { name: vi.knowledge.detail.sections.source })).toBeVisible();
  await expect(page.getByText(vi.knowledge.detail.sourceUsage.slice(0, 40), { exact: false })).toBeVisible();
});

test('NT03: illustrative data is labelled in an empty public hub and on the landing page', async ({ page }) => {
  await mockSupabase(page, { db: { public_items: [] } });
  await page.goto('/kham-pha');
  await ready(page);
  await expect(page.getByRole('complementary', { name: vi.knowledge.sample.bannerTitle })).toBeVisible();

  await page.goto('/');
  await ready(page);
  await expect(page.getByText(vi.landing.sample.note)).toBeVisible();
});

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

test.describe('NT13: keyboard, reflow, audio and motion', () => {
  test('the skip link is the first tab stop and moves focus to the main content', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/kham-pha');
    await ready(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: vi.common.nav.skipToContent });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

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

  test('narrator topic cards work from the keyboard', async ({ page }) => {
    const mock = await mockSupabase(page);
    await anonymousNarrator(page, mock);
    await page.goto('/ke-chuyen');
    await ready(page);
    const first = page.getByRole('region', { name: vi.narrator.home.topicsLabel }).getByRole('link', { name: TOPICS[0]!.title_vi, exact: true });
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ke-chuyen\/phien\//);
  });
});
