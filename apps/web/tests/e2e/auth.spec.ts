import { expect, test } from '@playwright/test';
import { mockSupabase } from './fixtures';
import { fill, vi } from './i18n';

const t = vi.auth;

test.describe('login', () => {
  test('validates the email before calling the server', async ({ page }) => {
    const mock = await mockSupabase(page);
    await page.goto('/dang-nhap');
    await expect(page.getByRole('heading', { level: 1, name: t.login.title })).toBeVisible();

    await page.getByRole('button', { name: t.login.submit, exact: true }).click();
    const email = page.getByRole('textbox', { name: t.fields.email });
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert').filter({ hasText: t.fields.emailInvalid })).toBeVisible();
    expect(mock.calls.filter((c) => c.path.startsWith('/auth/v1/token'))).toHaveLength(0);
  });

  test('maps invalid credentials to a friendly message', async ({ page }) => {
    await mockSupabase(page, { login: { email: 'minhanh@example.com', password: 'dung-mat-khau-1' } });
    await page.goto('/dang-nhap');
    await page.getByRole('textbox', { name: t.fields.email }).fill('minhanh@example.com');
    await page.getByLabel(new RegExp(`^${t.fields.password}`)).fill('sai-mat-khau-1');
    await page.getByRole('button', { name: t.login.submit, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(t.errors.invalidCredentials);
  });

  test('signs in and opens the family vault', async ({ page }) => {
    await mockSupabase(page, { login: { email: 'minhanh@example.com', password: 'dung-mat-khau-1' } });
    await page.goto('/dang-nhap?next=%2Fgia-dinh');
    await page.getByRole('textbox', { name: t.fields.email }).fill('minhanh@example.com');
    await page.getByLabel(new RegExp(`^${t.fields.password}`)).fill('dung-mat-khau-1');
    await page.getByRole('button', { name: t.login.submit, exact: true }).click();
    await expect(page).toHaveURL(/\/gia-dinh$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Nhà họ Nguyễn' })).toBeVisible();
  });
});

test.describe('signup', () => {
  test('requires consent before creating the account', async ({ page }) => {
    const mock = await mockSupabase(page);
    await page.goto('/dang-ky');
    await page.getByRole('textbox', { name: t.fields.displayName }).fill('Minh Anh');
    await page.getByRole('textbox', { name: t.fields.email }).fill('minhanh@example.com');
    await page.getByLabel(new RegExp(`^${t.fields.password}`)).fill('mot-mat-khau-dai');
    await page.getByRole('button', { name: t.signup.submit }).click();

    const consent = page.getByRole('checkbox');
    await expect(consent).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert').filter({ hasText: t.signup.consentRequired })).toBeVisible();
    expect(mock.calls.filter((c) => c.path === '/auth/v1/signup')).toHaveLength(0);

    await consent.check();
    await page.getByRole('button', { name: t.signup.submit }).click();
    const status = page.getByRole('status').filter({ hasText: t.signup.checkEmailTitle });
    await expect(status).toBeVisible();
    await expect(status).toContainText(fill(t.signup.checkEmailBody, { email: 'minhanh@example.com' }).slice(0, 40));
    await expect(status).toContainText('minhanh@example.com');
    const signup = mock.calls.find((c) => c.path === '/auth/v1/signup');
    expect(signup?.body).toMatchObject({ email: 'minhanh@example.com' });
  });

  test('rejects a short password', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/dang-ky');
    await page.getByRole('textbox', { name: t.fields.displayName }).fill('Minh Anh');
    await page.getByRole('textbox', { name: t.fields.email }).fill('minhanh@example.com');
    await page.getByLabel(new RegExp(`^${t.fields.password}`)).fill('ngan');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: t.signup.submit }).click();
    await expect(page.getByLabel(new RegExp(`^${t.fields.password}`))).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert').filter({ hasText: fill(t.fields.passwordTooShort, { n: 8 }) })).toBeVisible();
  });
});
