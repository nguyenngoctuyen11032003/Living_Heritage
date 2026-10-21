import { expect, test } from '@playwright/test';
import { anonymousNarrator, IDS, mockSupabase, signedIn } from './fixtures';
import { fill, vi } from './i18n';

const t = vi.review;

test('the draft shows the verbatim transcript with "needs checking" marks', async ({ page }) => {
  await mockSupabase(page);
  await signedIn(page);
  await page.goto(`/ban-nhap/${IDS.storyHarvest}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Những mùa gặt ở quê' })).toBeVisible();
  const source = page.getByRole('region', { name: t.source.heading });
  await expect(source.getByText(fill(t.source.uncertainCount, { n: 3 }))).toBeVisible();
  const marks = source.locator('mark');
  await expect(marks).toHaveCount(3);
  for (const mark of await marks.all()) await expect(mark).toContainText(t.source.uncertainLabel);
  await expect(marks.nth(2)).toContainText(t.source.uncertainUnclear);

  // The draft is the edited text, separate from the transcript.
  const draft = page.getByRole('region', { name: t.editor.heading });
  await expect(draft.getByRole('textbox').first()).toHaveValue('Những mùa gặt ở quê');
});

test('a family owner cannot approve for the narrator without recorded consent', async ({ page }) => {
  await mockSupabase(page);
  await signedIn(page);
  await page.goto(`/ban-nhap/${IDS.storyHarvest}`);
  await expect(page.getByRole('button', { name: t.approval.confirm })).toHaveCount(0);
  const assisted = page.getByRole('button', { name: t.approval.assistedButton });
  await expect(assisted).toBeDisabled();
  await page.getByRole('checkbox', { name: t.approval.assistedConsent }).check();
  await expect(assisted).toBeEnabled();
});

test('the narrator confirms the draft (approve_story) and is offered the sharing choices', async ({ page }) => {
  const mock = await mockSupabase(page);
  await anonymousNarrator(page, mock);
  await page.goto(`/ban-nhap/${IDS.storyHarvest}`);

  await expect(page.getByText(t.approval.question)).toBeVisible();
  await page.getByRole('button', { name: t.approval.confirm }).click();
  await expect(page.getByText(t.approval.successTitle)).toBeVisible();
  expect(mock.rpcCalls('approve_story')).toEqual([{ p_story: IDS.storyHarvest, p_assisted_consent: false }]);
  expect(mock.db.stories!.find((s) => s.id === IDS.storyHarvest)?.edit_status).toBe('approved');

  // The success panel (a status region) carries the next step. (ReviewPage renders a second identical CTA — see QA doc.)
  await page.getByRole('status').getByRole('button', { name: t.approval.nextStep }).click();
  const dialog = page.getByRole('dialog', { name: t.share.title });
  await expect(dialog).toBeVisible();
  const options = dialog.getByRole('group', { name: t.share.options.label });
  await expect(options.getByRole('radio')).toHaveCount(3);
  await expect(options.getByRole('radio', { name: new RegExp(`^${t.share.options.private.title}`) })).toBeChecked();
});

test('share dialog from the story page lists the three scopes with the current one checked', async ({ page }) => {
  await mockSupabase(page);
  await signedIn(page);
  await page.goto(`/cau-chuyen/${IDS.storyTet}`);
  await page.getByRole('button', { name: vi.vault.detail.actions.access }).click();

  const dialog = page.getByRole('dialog', { name: t.share.title });
  const options = dialog.getByRole('group', { name: t.share.options.label });
  await expect(options.getByRole('radio', { name: new RegExp(`^${t.share.options.private.title}`) })).toBeVisible();
  await expect(options.getByRole('radio', { name: new RegExp(`^${t.share.options.family.title}`) })).toBeChecked();
  await expect(options.getByRole('radio', { name: new RegExp(`^${t.share.options.request_publish.title}`) })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
