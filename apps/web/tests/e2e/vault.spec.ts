import { expect, test, type Page } from '@playwright/test';
import { IDS, mockSupabase, signedIn } from './fixtures';
import { fill, vi } from './i18n';

const t = vi.vault;

const storyList = (page: Page) => page.getByRole('region', { name: t.results.heading }).getByRole('article');

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
  await signedIn(page);
});

test('the vault lists every family story with its status', async ({ page }) => {
  await page.goto('/gia-dinh');
  await expect(page.getByRole('heading', { level: 1, name: 'Nhà họ Nguyễn' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: fill(t.results.count, { n: 4 }) })).toBeVisible();
  await expect(storyList(page)).toHaveCount(4);
  for (const title of ['Tết ở làng Đông Ngạc năm 1955', 'Cách gói bánh chưng vuông của bà', 'Những mùa gặt ở quê', 'Chiếc xe đạp Phượng Hoàng']) {
    await expect(storyList(page).getByRole('link', { name: title })).toBeVisible();
  }
});

test('filters narrow the list and are kept in the URL', async ({ page }) => {
  await page.goto('/gia-dinh');
  await expect(storyList(page)).toHaveCount(4);

  await page.getByRole('combobox', { name: t.filters.narrator }).selectOption({ label: 'Nguyễn Văn Hùng' });
  await expect(page).toHaveURL(new RegExp(`nguoi-ke=${IDS.narratorOng}`));
  await expect(storyList(page)).toHaveCount(1);
  await expect(storyList(page).getByRole('link', { name: 'Chiếc xe đạp Phượng Hoàng' })).toBeVisible();

  await page.getByRole('combobox', { name: t.filters.narrator }).selectOption({ label: t.filters.all });
  await page.getByRole('combobox', { name: t.filters.kind }).selectOption({ label: t.kind.experience });
  await expect(page).toHaveURL(/loai=/);
  await expect(storyList(page)).toHaveCount(1);
  await expect(storyList(page).getByRole('link', { name: 'Cách gói bánh chưng vuông của bà' })).toBeVisible();

  // Reload keeps the filter.
  await page.reload();
  await expect(storyList(page)).toHaveCount(1);
});

test('search matches without Vietnamese diacritics', async ({ page }) => {
  await page.goto('/gia-dinh');
  const search = page.getByRole('search');
  await search.getByRole('searchbox', { name: t.search.label }).fill('banh chung');
  await search.getByRole('button', { name: t.search.submit, exact: true }).click();
  await expect(page).toHaveURL(/q=banh/);
  await expect(storyList(page).getByRole('link', { name: 'Cách gói bánh chưng vuông của bà' })).toBeVisible();
  await expect(storyList(page).getByRole('link', { name: 'Chiếc xe đạp Phượng Hoàng' })).toHaveCount(0);
});

test('story detail shows the reading text, the original voice and the source facts', async ({ page }) => {
  await page.goto('/gia-dinh');
  await storyList(page).getByRole('link', { name: 'Tết ở làng Đông Ngạc năm 1955' }).click();
  await expect(page).toHaveURL(new RegExp(`/cau-chuyen/${IDS.storyTet}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Tết ở làng Đông Ngạc năm 1955' })).toBeVisible();
  await expect(page.getByRole('region', { name: t.detail.reading })).toContainText('Năm ấy bà mới lên mười');
  await expect(page.getByRole('button', { name: vi.landing.ui.player.play })).toBeVisible();
  const source = page.getByRole('region', { name: t.detail.source.title });
  await expect(source).toContainText('5:12');
  await expect(page.getByRole('link', { name: t.detail.actions.edit })).toHaveAttribute('href', `/ban-nhap/${IDS.storyTet}`);
});

test('an experience card shows its structured sections', async ({ page }) => {
  await page.goto(`/cau-chuyen/${IDS.storyBanhChung}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Cách gói bánh chưng vuông của bà' })).toBeVisible();
  for (const label of [t.detail.experience.conditions, t.detail.experience.steps, t.detail.experience.cautions]) {
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Luộc liên tục 10 đến 12 tiếng, thêm nước sôi khi cạn')).toBeVisible();
});
