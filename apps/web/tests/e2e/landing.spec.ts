import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, mockSupabase } from './fixtures';
import { en, vi } from './i18n';

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
});

test('renders the hero in Vietnamese by default and switches to English', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toContainText(vi.landing.hero.line2);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

  const switcher = page.getByRole('banner').getByRole('group', { name: vi.common.lang.label });
  await switcher.getByRole('button', { name: 'en' }).click();
  await expect(h1).toContainText(en.landing.hero.line2);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('banner').getByRole('button', { name: 'en' })).toHaveAttribute('aria-pressed', 'true');

  // The choice survives a reload.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(en.landing.hero.line2);
});

test('primary CTA leads to the role choice (/bat-dau) with three ways in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: vi.common.nav.start }).click();
  await expect(page).toHaveURL(/\/bat-dau$/);
  const s = vi.legal.start;
  await expect(page.getByRole('heading', { level: 1, name: s.heading })).toBeVisible();
  const roles = page.getByRole('region', { name: s.rolesTitle }).getByRole('listitem');
  await expect(roles).toHaveCount(3);
  const cards = [
    { key: 'tell', href: '/ke-chuyen' },
    { key: 'keep', href: '/dang-ky' },
    { key: 'learn', href: '/kham-pha' },
  ] as const;
  for (const { key, href } of cards) {
    const card = roles.filter({ has: page.getByRole('heading', { level: 3, name: s.roles[key].title }) });
    await expect(card.getByRole('link', { name: s.roles[key].cta })).toHaveAttribute('href', href);
  }
  await expect(page.getByRole('link', { name: s.signIn })).toHaveAttribute('href', '/dang-nhap');

  // The family card leads to sign-up.
  await roles.getByRole('link', { name: s.roles.keep.cta }).click();
  await expect(page.getByRole('heading', { level: 1, name: vi.auth.signup.title })).toBeVisible();
});

test('the hero reaches the no-account demo (/trai-nghiem)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: vi.landing.cta.demo }).first().click();
  await expect(page).toHaveURL(/\/trai-nghiem$/);
  await expect(page.getByRole('heading', { level: 1, name: vi.demo.header.title })).toBeVisible();
  await expect(page.getByText(vi.demo.banner.text)).toBeVisible();
});

test('no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Walk the page so lazy sections and scroll-driven reveals render before measuring.
  for (let y = 0; y < 30_000; y += 700) {
    await page.mouse.wheel(0, 700);
    const atEnd = await page.evaluate(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2);
    if (atEnd) break;
  }
  await expectNoHorizontalScroll(page);
});

test('FAQ accordion works with the keyboard', async ({ page }) => {
  await page.goto('/');
  const faq = page.getByRole('region', { name: vi.landing.faq.title });
  const question = faq.getByRole('button', { name: vi.landing.faq.items.ai.q });
  await question.scrollIntoViewIfNeeded();
  await expect(question).toHaveAttribute('aria-expanded', 'false');

  await question.focus();
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  const panelId = await question.getAttribute('aria-controls');
  expect(panelId).toBeTruthy();
  await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();

  await page.keyboard.press('Space');
  await expect(question).toHaveAttribute('aria-expanded', 'false');

  // Tab reaches the next question.
  await page.keyboard.press('Tab');
  await expect(faq.getByRole('button', { name: vi.landing.faq.items.write.q })).toBeFocused();
});
