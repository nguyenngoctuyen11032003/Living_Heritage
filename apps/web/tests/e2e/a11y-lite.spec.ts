import { expect, test } from '@playwright/test';
import { openScreen, SCREENS } from './routes';

// A cheap structural sweep (no axe-core dependency): one h1, named buttons, alt on images, labelled fields.
for (const route of SCREENS) {
  test(`${route.name} (${route.path}) has one h1, named controls and image alts`, async ({ page }) => {
    test.fail(!!route.knownA11yIssue, `known issue: ${route.knownA11yIssue}`);
    await openScreen(page, route);

    const h1s = await page.$$eval('h1', (els) => els.filter((el) => (el as HTMLElement).checkVisibility?.() ?? true).map((el) => el.textContent?.trim() ?? ''));
    expect(h1s, 'exactly one visible h1').toHaveLength(1);
    expect(h1s[0], 'the h1 has text').not.toBe('');

    const unnamedButtons = await page.$$eval('button, [role="button"], a[href]', (els) => {
      const textOf = (id: string) => document.getElementById(id)?.textContent?.trim() ?? '';
      const nameOf = (el: Element): string => {
        const labelledby = el.getAttribute('aria-labelledby');
        if (labelledby) return labelledby.split(/\s+/).map(textOf).join(' ').trim();
        const label = el.getAttribute('aria-label')?.trim();
        if (label) return label;
        const visibleText = [...el.childNodes]
          .map((n) => (n.nodeType === Node.TEXT_NODE ? n.textContent : n instanceof Element && n.getAttribute('aria-hidden') !== 'true' ? (n.textContent ?? '') + (n.getAttribute('alt') ?? '') + (n.querySelector?.('img[alt]')?.getAttribute('alt') ?? '') : ''))
          .join('')
          .trim();
        if (visibleText) return visibleText;
        return el.getAttribute('title')?.trim() ?? '';
      };
      return els
        .filter((el) => (el as HTMLElement).checkVisibility?.() ?? true)
        .filter((el) => !nameOf(el))
        .map((el) => el.outerHTML.slice(0, 160));
    });
    expect(unnamedButtons, 'buttons and links need an accessible name').toEqual([]);

    const imagesWithoutAlt = await page.$$eval('img:not([alt]), [role="img"]:not([aria-label]):not([aria-labelledby])', (els) =>
      els.filter((el) => el.getAttribute('aria-hidden') !== 'true').map((el) => el.outerHTML.slice(0, 160)),
    );
    expect(imagesWithoutAlt, 'images need alt text (alt="" when decorative)').toEqual([]);

    const unlabelledFields = await page.$$eval('input:not([type="hidden"]), select, textarea', (els) =>
      els
        .filter((el) => (el as HTMLElement).checkVisibility?.() ?? true)
        .filter((el) => {
          const f = el as HTMLInputElement;
          return !(f.labels?.length || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || f.getAttribute('title'));
        })
        .map((el) => el.outerHTML.slice(0, 160)),
    );
    expect(unlabelledFields, 'form fields need a label').toEqual([]);
  });
}
