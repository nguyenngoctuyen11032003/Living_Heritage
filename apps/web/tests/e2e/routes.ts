// Every screen the a11y and visual sweeps visit, with who must be signed in to see it.
import { expect, test, type Page } from '@playwright/test';
import { anonymousNarrator, IDS, mockSupabase, signedIn, type Mock, type MockOptions } from './fixtures';
import { vi } from './i18n';

export type Who = 'anon' | 'owner' | 'admin' | 'narrator';

export interface ScreenRoute {
  name: string;
  path: string;
  who: Who;
  area: 'public' | 'auth' | 'narrator' | 'review' | 'vault' | 'books' | 'knowledge' | 'admin' | 'settings' | 'media';
  /** Phase-3 screens that may not be built yet: a 404 marks the test fixme instead of failing. */
  pending?: boolean;
  mock?: MockOptions;
  /** A known, reported a11y defect: the a11y sweep expects this route to fail until it is fixed. */
  knownA11yIssue?: string;
}

export const SCREENS: ScreenRoute[] = [
  { name: 'landing', path: '/', who: 'anon', area: 'public' },
  { name: 'how-it-works', path: '/cach-hoat-dong', who: 'anon', area: 'public' },
  { name: 'plans', path: '/goi-dich-vu', who: 'anon', area: 'public' },
  { name: 'organizations', path: '/to-chuc', who: 'anon', area: 'public' },
  { name: 'memory-book', path: '/sach-ky-uc', who: 'anon', area: 'public' },
  { name: 'privacy', path: '/quyen-rieng-tu', who: 'anon', area: 'public' },
  { name: 'terms', path: '/dieu-khoan', who: 'anon', area: 'public' },
  { name: 'login', path: '/dang-nhap', who: 'anon', area: 'auth' },
  { name: 'signup', path: '/dang-ky', who: 'anon', area: 'auth' },
  { name: 'forgot-password', path: '/quen-mat-khau', who: 'anon', area: 'auth' },
  { name: 'claim-link', path: `/k/${IDS.linkToken}`, who: 'anon', area: 'narrator', mock: { rpcErrors: { claim_narrator_link: 'link_expired' } } },
  { name: 'narrator-home', path: '/ke-chuyen', who: 'narrator', area: 'narrator' },
  { name: 'narrator-my-stories', path: '/ke-chuyen/cua-toi', who: 'narrator', area: 'narrator' },
  { name: 'narrator-session', path: `/ke-chuyen/phien/${IDS.session1}`, who: 'narrator', area: 'narrator' },
  { name: 'review-draft-owner', path: `/ban-nhap/${IDS.storyHarvest}`, who: 'owner', area: 'review' },
  { name: 'review-draft-narrator', path: `/ban-nhap/${IDS.storyHarvest}`, who: 'narrator', area: 'review' },
  { name: 'review-experience', path: `/ban-nhap/${IDS.storyBanhChung}`, who: 'owner', area: 'review' },
  { name: 'vault', path: '/gia-dinh', who: 'owner', area: 'vault' },
  { name: 'vault-empty', path: '/gia-dinh', who: 'owner', area: 'vault', mock: { db: { stories: [], recordings: [] } } },
  { name: 'story-detail', path: `/cau-chuyen/${IDS.storyTet}`, who: 'owner', area: 'vault' },
  { name: 'story-experience', path: `/cau-chuyen/${IDS.storyBanhChung}`, who: 'owner', area: 'vault' },
  { name: 'collections', path: '/gia-dinh/bo-suu-tap', who: 'owner', area: 'vault' },
  { name: 'collection', path: `/gia-dinh/bo-suu-tap/${IDS.collection}`, who: 'owner', area: 'vault' },
  { name: 'narrators', path: '/gia-dinh/nguoi-ke', who: 'owner', area: 'vault' },
  { name: 'members', path: '/gia-dinh/thanh-vien', who: 'owner', area: 'vault' },
  { name: 'books', path: '/sach', who: 'owner', area: 'books' },
  { name: 'book-builder', path: `/sach/${IDS.book}`, who: 'owner', area: 'books' },
  { name: 'book-print', path: `/sach/${IDS.book}/in`, who: 'owner', area: 'books', knownA11yIssue: 'print view has no h1 (BookPrint.tsx)' },
  { name: 'explore', path: '/kham-pha', who: 'anon', area: 'knowledge' },
  { name: 'explore-empty', path: '/kham-pha?q=khong-co-gi-ca', who: 'anon', area: 'knowledge' },
  { name: 'item-experience', path: `/tri-thuc/${IDS.pubTuongBan}`, who: 'anon', area: 'knowledge' },
  { name: 'item-story', path: `/tri-thuc/${IDS.pubBike}`, who: 'anon', area: 'knowledge' },
  { name: 'saved', path: '/da-luu', who: 'anon', area: 'knowledge' },
  { name: 'admin', path: '/quan-tri', who: 'admin', area: 'admin', mock: { admin: true } },
  { name: 'settings', path: '/cai-dat', who: 'owner', area: 'settings', pending: true },
  { name: 'data-center', path: '/gia-dinh/du-lieu', who: 'owner', area: 'settings', pending: true },
  { name: 'album', path: '/gia-dinh/album', who: 'owner', area: 'media', pending: true },
  { name: 'family-tree', path: '/gia-dinh/cay-gia-dinh', who: 'owner', area: 'media', pending: true },
];

/** Mock the backend, sign in as `who`, open the route and wait for its first heading. Returns the mock. */
export async function openScreen(page: Page, route: ScreenRoute): Promise<Mock> {
  const mock = await mockSupabase(page, route.mock);
  if (route.who === 'owner' || route.who === 'admin') await signedIn(page, route.who);
  if (route.who === 'narrator') await anonymousNarrator(page, mock);
  await page.goto(route.path);
  await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({ timeout: 10_000 });
  // Lazy data: wait until skeletons / busy regions are gone (best effort).
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 5_000 }).catch(() => {});
  const notFound = await page.getByRole('heading', { level: 1, name: vi.common.notFound.title }).count();
  if (route.pending && notFound) test.fixme(true, `${route.path} is not built yet (phase 3)`);
  expect(notFound, `${route.path} rendered the 404 page`).toBe(0);
  return mock;
}
