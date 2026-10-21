import { defineConfig, devices } from '@playwright/test';

// E2E runs against a production build made with `vite build --mode e2e` (root .env.e2e points Supabase at
// https://e2e.invalid, which every spec answers with page.route() mocks — no network, no real backend).
// The build goes to its own folder so a parallel `pnpm build` (real .env) can never be the build under test.
// PLAYWRIGHT_PORT lets parallel checkouts each serve their own build; an already-running server is only reused
// with PLAYWRIGHT_REUSE_SERVER=1.
const E2E_OUT_DIR = 'node_modules/.e2e-dist';
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
// A CLI --grep naming @visual must not be cancelled by the default grepInvert below.
const wantsVisual = !!process.env.PLAYWRIGHT_VISUAL || process.argv.some((a) => a.includes('@visual'));
// Locally we drive the installed Google Chrome (no browser download); CI installs Playwright's Chromium.
const useChromeChannel = !process.env.CI && process.env.PLAYWRIGHT_CHANNEL !== 'chromium';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  // The visual sweep is opt-in: `pnpm --filter @lh/web exec playwright test --grep @visual` (or PLAYWRIGHT_VISUAL=1).
  grepInvert: wantsVisual ? undefined : /@visual/,
  expect: { timeout: 7_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    // page.route() cannot see requests made by a service worker.
    serviceWorkers: 'block',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(useChromeChannel ? { channel: 'chrome' } : {}) },
    },
  ],
  webServer: {
    command: `pnpm exec vite preview --outDir ${E2E_OUT_DIR} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 60_000,
  },
});
