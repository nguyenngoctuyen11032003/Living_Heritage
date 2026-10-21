// Multi-step UI flows shared by several specs. Selectors come from the dictionaries (./i18n).
import { expect, type Locator, type Page } from '@playwright/test';
import { vi } from './i18n';

const t = vi.narrator;

/** Resolves true if `loc` shows up within `ms`, false otherwise (for screens that appear only once per device). */
export async function appears(loc: Locator, ms = 3_000): Promise<boolean> {
  return loc.waitFor({ timeout: ms }).then(
    () => true,
    () => false,
  );
}

/** The one-time "Trước khi ghi âm" consent sheet: agree if it is open. */
export async function agreeToRecordingConsent(page: Page, via: 'click' | 'keyboard' = 'click') {
  const consent = page.getByRole('dialog', { name: t.consent.title });
  if (!(await appears(consent, 2_000))) return;
  const agree = consent.getByRole('button', { name: t.consent.agree });
  if (via === 'keyboard') {
    await agree.focus();
    await page.keyboard.press('Enter');
  } else await agree.click();
  await expect(consent).toBeHidden();
}

/** Dismiss the first-visit how-to sheet if it opens. */
export async function dismissHowTo(page: Page) {
  const howto = page.getByRole('dialog', { name: t.howto.title });
  if (await appears(howto)) await howto.getByRole('button', { name: t.howto.dismiss }).click();
  await expect(howto).toBeHidden();
}

/**
 * On /ke-chuyen/phien/:id: start → (consent) → recording → stop → listen-back → keep → (consent) → "done" status.
 * Returns the done status region (it holds the link to the draft).
 */
export async function recordAndKeep(page: Page, via: 'click' | 'keyboard' = 'click'): Promise<Locator> {
  const press = async (name: string) => {
    const btn = page.getByRole('button', { name, exact: true });
    if (via === 'keyboard') {
      await btn.focus();
      await page.keyboard.press('Enter');
    } else await btn.click();
  };
  await press(t.rec.start);
  await agreeToRecordingConsent(page, via);
  await expect(page.getByRole('status').filter({ hasText: t.rec.status.recording })).toBeVisible();
  await press(t.rec.stopLabel);
  await expect(page.getByRole('heading', { name: t.rec.reviewTitle })).toBeVisible();
  await press(t.rec.keep);
  await agreeToRecordingConsent(page, via);
  const done = page.getByRole('status').filter({ hasText: t.rec.doneTitle });
  await expect(done).toBeVisible();
  return done;
}
