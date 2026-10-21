// The two demo journeys of the acceptance list (DỰ ÁN.md, Phụ lục B) end to end against the mocked backend,
// plus a keyboard-only pass over the player and the primary actions (NT13).
//   NT01: topic → session → draft → approve → vault → detail → output (book + print), no dead buttons on the way.
//   NT02: search with and without Vietnamese diacritics + filter → open an item → only the permitted information.
import { expect, test, type Page } from '@playwright/test';
import { anonymousNarrator, fakeMicrophone, IDS, mockSupabase, signedIn, TOPICS, type Mock } from './fixtures';
import { dismissHowTo, recordAndKeep } from './flows';
import { fill, vi } from './i18n';

// Long, multi-screen journeys: give them room on a busy machine.
test.describe.configure({ timeout: 90_000 });

/** Every link inside <main> points somewhere real (no "#", empty or javascript: hrefs). */
async function expectNoDeadLinks(page: Page) {
  const dead = await page.$$eval('main a', (as) =>
    as
      .filter((a) => (a as HTMLElement).checkVisibility?.() ?? true)
      .filter((a) => {
        const href = a.getAttribute('href');
        return !href || href === '#' || href.startsWith('javascript:');
      })
      .map((a) => a.outerHTML.slice(0, 120)),
  );
  expect(dead, `dead links on ${page.url()}`).toEqual([]);
}

/** The narrator records one answer for the first topic and lands on the AI draft. Returns the new story id. */
async function narratorRecordsAStory(page: Page, mock: Mock): Promise<string> {
  const t = vi.narrator;
  await fakeMicrophone(page);
  await page.goto('/ke-chuyen');
  await expectNoDeadLinks(page);
  await page.getByRole('link', { name: TOPICS[0]!.title_vi, exact: true }).click();
  await expect(page).toHaveURL(/\/ke-chuyen\/phien\/[0-9a-f-]{36}/);
  await dismissHowTo(page);
  const done = await recordAndKeep(page);
  await done.getByRole('link', { name: t.rec.view }).click();
  await expect(page).toHaveURL(/\/ban-nhap\/[0-9a-f-]{36}$/);
  const id = page.url().split('/').pop()!;
  expect(mock.db.stories!.find((s) => s.id === id)?.edit_status).toBe('pending_review');
  return id;
}

test('NT01: topic → session → draft → narrator approves → vault → detail → book → print', async ({ page, browser }) => {
  const mock = await mockSupabase(page);
  await anonymousNarrator(page, mock);
  const storyId = await narratorRecordsAStory(page, mock);
  const title = mock.db.stories!.find((s) => s.id === storyId)!.title as string;

  // Draft: AI text is shown for checking; the narrator is the one who approves.
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expectNoDeadLinks(page);
  await page.getByRole('button', { name: vi.review.approval.confirm }).click();
  await expect(page.getByText(vi.review.approval.successTitle)).toBeVisible();
  expect(mock.rpcCalls('approve_story')).toEqual([{ p_story: storyId, p_assisted_consent: false, p_expected_version: 1 }]);
  // Approval is not publication: still private, and the next step offers the scopes with "private" preselected.
  expect(mock.db.stories!.find((s) => s.id === storyId)?.visibility).toBe('private');
  await page.getByRole('status').getByRole('button', { name: vi.review.approval.nextStep }).click();
  const share = page.getByRole('dialog', { name: vi.review.share.title });
  await expect(share.getByRole('radio', { name: new RegExp(`^${vi.review.share.options.private.title}`) })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(share).toBeHidden();

  // The family owner (another device) finds the approved story in the vault, on the same fake backend.
  const ctx = await browser.newContext({ locale: 'vi-VN', serviceWorkers: 'block', reducedMotion: 'reduce', baseURL: test.info().project.use.baseURL });
  const owner = await ctx.newPage();
  const ownerMock = await mockSupabase(owner, { db: mock.db });
  await signedIn(owner);
  await owner.goto('/gia-dinh');
  const list = owner.getByRole('region', { name: vi.vault.results.heading }).getByRole('article');
  await expect(list).toHaveCount(5);
  await expectNoDeadLinks(owner);
  await list.getByRole('link', { name: title }).click();

  // Detail: reading text + original voice + source facts.
  await expect(owner).toHaveURL(new RegExp(`/cau-chuyen/${storyId}$`));
  await expect(owner.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(owner.getByRole('button', { name: vi.landing.ui.player.play })).toBeVisible();
  await expect(owner.getByRole('region', { name: vi.vault.detail.source.title })).toContainText(vi.vault.visibility.private);
  await expectNoDeadLinks(owner);

  // Output: add it to the family book, then open the book and its print view.
  const addToBook = owner.getByRole('button', { name: vi.vault.detail.actions.book });
  await expect(addToBook).toBeEnabled();
  await addToBook.click();
  const dialog = owner.getByRole('dialog', { name: vi.vault.addToBook.title });
  await dialog.getByRole('button', { name: vi.vault.addToBook.add }).first().click();
  await expect(dialog.getByText(vi.vault.addToBook.already)).toBeVisible();
  expect(ownerMock.db.book_chapters!.some((c) => c.story_id === storyId && c.book_id === IDS.book)).toBe(true);
  await dialog.getByRole('button', { name: vi.vault.addToCollection.done }).click();

  await owner.goto(`/sach/${IDS.book}`);
  await expect(owner.getByText(title).first()).toBeVisible();
  await expectNoDeadLinks(owner);
  await owner.getByRole('link', { name: vi.books.builder.print }).click();
  await expect(owner).toHaveURL(new RegExp(`/sach/${IDS.book}/in$`));
  await expect(owner.getByText(title).first()).toBeVisible();
  await expect(owner.getByText(vi.books.print.label).first()).toBeVisible();
  expect(ownerMock.unmocked, 'requests the fake backend did not understand').toEqual([]);
  await ctx.close();
});

test('NT01: every internal link on the demo path opens a real page (no 404)', async ({ page }) => {
  test.setTimeout(120_000);
  await mockSupabase(page);
  await signedIn(page);
  const paths = ['/gia-dinh', `/cau-chuyen/${IDS.storyTet}`, `/ban-nhap/${IDS.storyHarvest}`, `/sach/${IDS.book}`, '/kham-pha', `/tri-thuc/${IDS.pubTuongBan}`];
  const hrefs = new Set<string>();
  for (const p of paths) {
    await page.goto(p);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    for (const h of await page.$$eval('main a[href^="/"]', (as) => as.map((a) => a.getAttribute('href')!))) hrefs.add(h.split('#')[0]!);
  }
  const broken: string[] = [];
  for (const href of hrefs) {
    await page.goto(href);
    const h1 = await page.locator('h1').first().waitFor({ timeout: 8_000 }).then(() => true, () => false);
    if (!h1) broken.push(`${href} (no h1 after 8 s: stuck loading?)`);
    else if (await page.getByRole('heading', { level: 1, name: vi.common.notFound.title }).count()) broken.push(`${href} (404)`);
  }
  expect(broken, 'links on the demo path that do not open a working page').toEqual([]);
});

test('NT02: search with and without diacritics, filter, open an item and see only what was permitted', async ({ page }) => {
  const t = vi.knowledge;
  const mock = await mockSupabase(page);
  await page.goto('/kham-pha');
  const search = page.getByRole('search');
  const box = search.getByRole('searchbox', { name: t.hero.searchLabel });

  // With diacritics.
  await box.fill('tương Bần');
  await search.getByRole('button', { name: t.hero.searchCta, exact: true }).click();
  await expect(page.getByRole('link', { name: 'Cách ủ tương Bần' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chợ Bến Thành những năm 80' })).toHaveCount(0);

  // Without diacritics: the same result.
  await box.fill('tuong ban');
  await search.getByRole('button', { name: t.hero.searchCta, exact: true }).click();
  await expect(page).toHaveURL(/[?&]q=tuong(\+|%20)ban/);
  await expect(page.getByRole('link', { name: 'Cách ủ tương Bần' })).toBeVisible();

  // A keyword + kind filter: experience cards only.
  await box.fill('rau muong');
  await search.getByRole('button', { name: t.hero.searchCta, exact: true }).click();
  const filters = page.getByRole('region', { name: t.filters.title });
  await filters.getByRole('group', { name: t.filters.kind }).getByRole('button', { name: t.filters.kindShort.experience, exact: true }).click();
  await expect(page).toHaveURL(/loai=kinh-nghiem/);
  await expect.poll(() => mock.rpcCalls('search_public').some((b) => b.q === 'rau muong' && b.p_kind === 'experience')).toBe(true);
  await expect(page.getByRole('link', { name: 'Trồng rau muống mùa mưa' })).toBeVisible();

  // Open the tương Bần item: the narrator is shown by the anonymised label, never by name, and the voice is withheld.
  await page.goto('/kham-pha?q=tuong+ban');
  await page.getByRole('link', { name: 'Cách ủ tương Bần' }).click();
  await expect(page).toHaveURL(new RegExp(`/tri-thuc/${IDS.pubTuongBan}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Cách ủ tương Bần' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: t.detail.sections.source, exact: true })).toBeVisible();
  await expect(page.getByText('Một người bà ở Hưng Yên').first()).toBeVisible();
  await expect(page.getByText(t.detail.textOnly)).toBeVisible();
  await expect(page.getByRole('button', { name: vi.landing.ui.player.play })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Nguyễn Thị Lan');
  // The family's own caveat on how far the experience applies is shown with it.
  await expect(page.getByText('chưa được kiểm chứng như một quy trình an toàn thực phẩm', { exact: false })).toBeVisible();
  await expectNoDeadLinks(page);
});

test.describe('keyboard only', () => {
  test('the story player plays, pauses and seeks from the keyboard', async ({ page }) => {
    await mockSupabase(page);
    await signedIn(page);
    await page.goto(`/cau-chuyen/${IDS.storyTet}`);
    const play = page.getByRole('button', { name: vi.landing.ui.player.play });
    await expect(play).toBeVisible();

    // Tab reaches the play button (with a visible focus ring) without the mouse.
    for (let i = 0; i < 40 && !(await play.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(play).toBeFocused();
    const ring = await play.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 ? 'outline' : s.boxShadow !== 'none' ? 'shadow' : '';
    });
    expect(ring, 'the focused play button shows a focus indicator').not.toBe('');

    await page.keyboard.press('Enter');
    const pause = page.getByRole('button', { name: vi.landing.ui.player.pause });
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: vi.landing.ui.player.play })).toHaveAttribute('aria-pressed', 'false');

    // Tab on to the seek slider; it is visually hidden, so its track must show the focus ring instead.
    const seek = page.getByRole('slider', { name: vi.landing.ui.player.seek });
    for (let i = 0; i < 6 && !(await seek.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(seek).toBeFocused();
    const trackOutline = await seek.evaluate((el) => getComputedStyle(el.parentElement!).outlineStyle);
    expect(trackOutline, 'the seek track shows a focus ring').not.toBe('none');
    await page.keyboard.press('Home');
    await expect(seek).toHaveValue('0');
  });

  test('the narrator records, keeps and opens the draft with the keyboard alone', async ({ page }) => {
    const t = vi.narrator;
    const mock = await mockSupabase(page);
    await anonymousNarrator(page, mock);
    await fakeMicrophone(page);
    await page.goto('/ke-chuyen');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The skip link is the first stop and lands on <main>.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: vi.common.nav.skipToContent })).toBeFocused();

    const topic = page.getByRole('link', { name: TOPICS[0]!.title_vi, exact: true });
    await topic.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ke-chuyen\/phien\//);
    const howto = page.getByRole('dialog', { name: t.howto.title });
    if (await howto.waitFor({ timeout: 3_000 }).then(() => true, () => false)) {
      // A modal opens with focus inside it; its button is reached and pressed from the keyboard.
      await expect.poll(() => howto.evaluate((d) => d.contains(document.activeElement))).toBe(true);
      await howto.getByRole('button', { name: t.howto.dismiss }).focus();
      await page.keyboard.press('Enter');
      await expect(howto).toBeHidden();
    }

    const done = await recordAndKeep(page, 'keyboard');
    await done.getByRole('link', { name: t.rec.view }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ban-nhap\//);

    const confirm = page.getByRole('button', { name: vi.review.approval.confirm });
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(vi.review.approval.successTitle)).toBeVisible();
  });

  test('the explore search and filters work from the keyboard', async ({ page }) => {
    const t = vi.knowledge;
    await mockSupabase(page);
    await page.goto('/kham-pha');
    const box = page.getByRole('search').getByRole('searchbox', { name: t.hero.searchLabel });
    await box.focus();
    await page.keyboard.type('tuong ban');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/q=tuong/);
    await expect(page.getByText(fill(t.results.count, { n: 1 })).first()).toBeVisible();

    const kind = page.getByRole('region', { name: t.filters.title }).getByRole('group', { name: t.filters.kind }).getByRole('button', { name: t.filters.kindShort.experience, exact: true });
    await kind.focus();
    await page.keyboard.press('Enter');
    await expect(kind).toHaveAttribute('aria-pressed', 'true');
  });
});

test('NT01: a family viewer can read the book but gets no print / PDF output', async ({ page }) => {
  await mockSupabase(page);
  await signedIn(page, 'viewer');
  await page.goto(`/sach/${IDS.book}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: vi.books.builder.print })).toHaveCount(0);
  await expectNoDeadLinks(page);
});
