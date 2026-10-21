import { expect, test } from '@playwright/test';
import { anonymousNarrator, fakeMicrophone, IDS, mockSupabase, TOPICS } from './fixtures';
import { fill, vi } from './i18n';

const t = vi.narrator;

test('a storytelling link signs the narrator in anonymously and opens the topics', async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/k/${IDS.linkToken}`);

  await expect(page).toHaveURL(/\/ke-chuyen$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fill(t.home.greeting, { who: 'ông/bà Nguyễn Thị Lan' }));
  const topics = page.getByRole('region', { name: t.home.topicsLabel });
  for (const topic of TOPICS) await expect(topics.getByRole('link', { name: topic.title_vi, exact: true })).toBeVisible();

  expect(mock.calls.some((c) => c.path === '/auth/v1/signup')).toBe(true);
  expect(mock.rpcCalls('claim_narrator_link')).toEqual([{ p_token: IDS.linkToken }]);
  expect(await page.evaluate(() => localStorage.getItem('lh.narratorId'))).toBe(IDS.narratorBa);
});

test('an expired link explains what to do', async ({ page }) => {
  await mockSupabase(page, { rpcErrors: { claim_narrator_link: 'link_expired' } });
  await page.goto(`/k/${IDS.linkToken}`);
  await expect(page.getByRole('heading', { level: 1, name: vi.auth.link.errors.link_expired.title })).toBeVisible();
  await expect(page.getByRole('link', { name: vi.auth.link.home })).toBeVisible();
});

test('record → keep → upload → AI draft → open the draft', async ({ page }) => {
  const mock = await mockSupabase(page);
  await anonymousNarrator(page, mock);
  await fakeMicrophone(page);

  await page.goto('/ke-chuyen');
  await page.getByRole('link', { name: TOPICS[0]!.title_vi, exact: true }).click();
  await expect(page).toHaveURL(/\/ke-chuyen\/phien\/[0-9a-f-]{36}/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(String(mock.db.questions![0]!.prompt_vi));
  // First visit on this device: the three-step how-to opens once and is dismissed with one big button.
  const howto = page.getByRole('dialog', { name: t.howto.title });
  const shown = await howto.waitFor({ timeout: 3_000 }).then(
    () => true,
    () => false,
  );
  if (shown) await howto.getByRole('button', { name: t.howto.dismiss }).click();
  await expect(howto).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: t.rec.status.idle })).toBeVisible();

  await page.getByRole('button', { name: t.rec.start }).click();
  await expect(page.getByRole('status').filter({ hasText: t.rec.status.recording })).toBeVisible();
  await page.getByRole('button', { name: t.rec.stopLabel }).click();

  await expect(page.getByRole('heading', { name: t.rec.reviewTitle })).toBeVisible();
  // Nothing has left the device before "keep".
  expect(mock.calls.some((c) => c.path.startsWith('/storage/v1/object/recordings/'))).toBe(false);
  await page.getByRole('button', { name: t.rec.keep }).click();

  const done = page.getByRole('status').filter({ hasText: t.rec.doneTitle });
  await expect(done).toBeVisible();
  const upload = mock.calls.find((c) => c.method === 'POST' && c.path.startsWith('/storage/v1/object/recordings/'));
  expect(upload?.path).toMatch(new RegExp(`/recordings/${IDS.family}/${IDS.narratorBa}/[0-9a-f-]{36}\\.webm$`));
  const inserted = mock.db.recordings!.at(-1)!;
  expect(inserted).toMatchObject({ family_id: IDS.family, narrator_id: IDS.narratorBa, mime: expect.stringMatching(/^audio\/webm/) });
  const ai = mock.calls.find((c) => c.path === '/functions/v1/ai-process');
  expect(ai?.body).toMatchObject({ action: 'transcribe_and_draft', recording_id: inserted.id, lang: 'vi' });

  await done.getByRole('link', { name: t.rec.view }).click();
  await expect(page).toHaveURL(/\/ban-nhap\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('button', { name: vi.review.approval.confirm })).toBeVisible();
});
