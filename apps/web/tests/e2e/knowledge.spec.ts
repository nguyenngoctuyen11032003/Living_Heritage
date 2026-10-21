import { expect, test } from '@playwright/test';
import { IDS, mockSupabase, signedIn } from './fixtures';
import { fill, vi } from './i18n';

const t = vi.knowledge;

test('search calls search_public and keeps the query in the URL', async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto('/kham-pha');
  await expect(page.getByRole('heading', { level: 1, name: t.hero.title })).toBeVisible();
  await expect(page.getByText(fill(t.results.count, { n: 4 }))).toBeVisible();

  const search = page.getByRole('search');
  await search.getByRole('searchbox', { name: t.hero.searchLabel }).fill('tuong ban');
  await search.getByRole('button', { name: t.hero.searchCta, exact: true }).click();

  await expect(page).toHaveURL(/[?&]q=tuong(\+|%20)ban/);
  await expect(page.getByRole('link', { name: 'Cách ủ tương Bần' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chiếc xe đạp Phượng Hoàng' })).toHaveCount(0);
  expect(mock.rpcCalls('search_public').some((b) => b.q === 'tuong ban')).toBe(true);
});

test('filters sync to the URL and back', async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto('/kham-pha');
  const filters = page.getByRole('region', { name: t.filters.title });

  await filters.getByRole('combobox', { name: t.filters.topic }).selectOption('mon-an');
  await expect(page).toHaveURL(/chu-de=mon-an/);
  await expect.poll(() => mock.rpcCalls('search_public').some((b) => b.p_topic === 'mon-an')).toBe(true);

  await filters.getByRole('group', { name: t.filters.kind }).getByRole('button', { name: t.filters.kindShort.experience, exact: true }).click();
  await expect(page).toHaveURL(/loai=kinh-nghiem/);
  await expect(filters.getByRole('group', { name: t.filters.kind }).getByRole('button', { name: t.filters.kindShort.experience, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Cách ủ tương Bần' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trồng rau muống mùa mưa' })).toHaveCount(0);

  // A shared link restores the same filters.
  await page.goto('/kham-pha?chu-de=lam-vuon&vung=trung');
  await expect(filters.getByRole('combobox', { name: t.filters.topic })).toHaveValue('lam-vuon');
  await expect(filters.getByRole('combobox', { name: t.filters.region })).toHaveValue('trung');
  await expect(page.getByRole('link', { name: 'Trồng rau muống mùa mưa' })).toBeVisible();
});

test('an experience item shows every structured section and its source', async ({ page }) => {
  await mockSupabase(page);
  await page.goto(`/tri-thuc/${IDS.pubTuongBan}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Cách ủ tương Bần' })).toBeVisible();
  const s = t.detail.sections;
  for (const heading of [s.problem, s.steps, s.conditions, s.cautions, s.limits, s.source]) {
    await expect(page.getByRole('heading', { level: 2, name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Một người bà ở Hưng Yên').first()).toBeVisible();
  await expect(page.getByText('Trộn mốc với nước đậu và muối, phơi nắng 1 tháng')).toBeVisible();
});

test('report dialog requires a reason and files an anonymous report', async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/tri-thuc/${IDS.pubTuongBan}`);
  await page.getByRole('group', { name: t.detail.actionsLabel }).getByRole('button', { name: t.actions.report }).click();

  const dialog = page.getByRole('dialog', { name: t.report.title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: t.report.submit }).click();
  await expect(dialog.getByText(t.report.reasonRequired)).toBeVisible();
  expect(mock.db.reports).toHaveLength(0);

  await dialog.getByRole('radio', { name: t.report.reasons.inaccurate }).check();
  await dialog.getByRole('textbox', { name: t.report.note }).fill('Thời gian phơi nắng hình như là 2 tháng.');
  await dialog.getByRole('button', { name: t.report.submit }).click();

  await expect(page.getByText(t.report.success).first()).toBeVisible();
  expect(mock.db.reports).toEqual([expect.objectContaining({ public_item_id: IDS.pubTuongBan, reason: 'inaccurate', note: 'Thời gian phơi nắng hình như là 2 tháng.' })]);
});

test('unknown items show a not-found state instead of content', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/tri-thuc/90000000-0000-4000-8000-0000000000ff');
  // Known a11y gap: the not-found state renders its title as an h3 and the page has no h1 (see QA doc).
  await expect(page.getByRole('heading', { name: t.states.notFoundTitle })).toBeVisible();
  await expect(page.getByRole('link', { name: t.states.backToHub })).toHaveAttribute('href', '/kham-pha');
  await expect(page.getByText('Cách ủ tương Bần')).toHaveCount(0);
});

test('signed in, /da-luu lists the items saved to the account (saved_items)', async ({ page }) => {
  await mockSupabase(page, { db: { saved_items: [{ user_id: IDS.owner, public_item_id: IDS.pubTuongBan, created_at: '2026-10-20T00:00:00Z' }] } });
  await signedIn(page);
  await page.goto('/da-luu');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cách ủ tương Bần' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chiếc xe đạp Phượng Hoàng' })).toHaveCount(0);
});
