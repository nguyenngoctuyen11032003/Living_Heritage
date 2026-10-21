// Visual sweep (@visual, opt-in): `pnpm --filter @lh/web exec playwright test --grep @visual`.
// Screenshots every screen at 360×780 and 1440×900 in vi and en into test-results/visual/ (gitignored) and
// soft-checks layout defects a screenshot review would otherwise have to catch by eye:
//   - horizontal overflow, - clipped headings (overflow hidden + content taller/wider than the box, incl. tight
//   line-height that cuts Vietnamese stacked diacritics), - fixed/sticky bars overlapping each other.
// Findings are also written to test-results/visual/<shot>.json for the QA write-up.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { setLocale } from './fixtures';
import { openScreen, SCREENS } from './routes';

const OUT = fileURLToPath(new URL('../../test-results/visual/', import.meta.url));
const VIEWPORTS = [
  { label: 'mobile', width: 360, height: 780 },
  { label: 'desktop', width: 1440, height: 900 },
] as const;
const LOCALES = ['vi', 'en'] as const;

interface Findings {
  overflowX: number;
  offenders: string[];
  clippedHeadings: string[];
  tightHeadings: string[];
  overlappingBars: string[];
}

async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
}

async function collect(page: Page): Promise<Findings> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const describe = (el: Element) => {
      const cls = (el.getAttribute('class') ?? '').split(/\s+/).slice(0, 6).join('.');
      const txt = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} “${txt}”`;
    };
    const visible = (el: Element) => (el as HTMLElement).checkVisibility?.() ?? true;
    // Leaf-most elements sticking out of the viewport, ignoring anything inside an overflow-clipping ancestor.
    const clippedByAncestor = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return true;
      }
      return false;
    };
    const offenders = [...document.body.querySelectorAll('*')]
      .filter((el) => visible(el) && !(el instanceof SVGElement && !(el instanceof SVGSVGElement)))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && !clippedByAncestor(el);
      })
      .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o)))
      .slice(0, 8)
      .map((el) => `${describe(el)} right=${Math.round(el.getBoundingClientRect().right)}`);

    // sr-only headings (1×1 px, clipped on purpose) are not visual text.
    const headings = ([...document.querySelectorAll('h1, h2, h3')].filter(visible) as HTMLElement[]).filter((h) => h.offsetWidth > 2 && h.offsetHeight > 2);
    const clippedHeadings = headings
      .filter((h) => {
        const s = getComputedStyle(h);
        const clips = /(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY) || s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none';
        return clips && (h.scrollHeight > h.clientHeight + 1 || h.scrollWidth > h.clientWidth + 1);
      })
      .map(describe);
    // Stacked Vietnamese diacritics (ỗ, ẫ, Ữ) need roughly ≥1.15 line-height on display type, or the marks touch/clip.
    const tightHeadings = headings
      .filter((h) => {
        const s = getComputedStyle(h);
        const lh = s.lineHeight === 'normal' ? 1.2 : parseFloat(s.lineHeight) / parseFloat(s.fontSize);
        return h.getClientRects().length > 0 && h.offsetHeight > parseFloat(s.fontSize) * 1.6 && lh < 1.1;
      })
      .map((h) => `${describe(h)} lh=${(parseFloat(getComputedStyle(h).lineHeight) / parseFloat(getComputedStyle(h).fontSize)).toFixed(2)}`);

    const bars = [...document.body.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      if (!(s.position === 'fixed' || s.position === 'sticky') || !visible(el)) return false;
      // Empty pass-through layers (e.g. the toast viewport) cannot cover anything.
      if (s.pointerEvents === 'none' && !(el.textContent ?? '').trim()) return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 20 && r.bottom > 0 && r.top < window.innerHeight;
    });
    const overlappingBars: string[] = [];
    for (let i = 0; i < bars.length; i++) {
      for (let j = i + 1; j < bars.length; j++) {
        const a = bars[i]!;
        const b = bars[j]!;
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 4 && iy > 4) overlappingBars.push(`${describe(a)} × ${describe(b)}`);
      }
    }
    return { overflowX: document.documentElement.scrollWidth - vw, offenders, clippedHeadings, tightHeadings, overlappingBars };
  });
}

test.describe.configure({ mode: 'parallel' });

for (const route of SCREENS) {
  for (const vp of VIEWPORTS) {
    for (const locale of LOCALES) {
      const shot = `${route.name}.${vp.width}.${locale}`;
      test(`@visual ${shot}`, async ({ page }) => {
        mkdirSync(OUT, { recursive: true });
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setLocale(page, locale);
        await openScreen(page, route);
        await scrollThrough(page);

        await page.screenshot({ path: `${OUT}${shot}.fold.png` });
        await page.screenshot({ path: `${OUT}${shot}.png`, fullPage: true });

        const findings = await collect(page);
        writeFileSync(`${OUT}${shot}.json`, JSON.stringify({ route: route.path, viewport: vp, locale, ...findings }, null, 2));
        expect.soft(findings.overflowX, `horizontal overflow: ${findings.offenders.join(' | ')}`).toBeLessThanOrEqual(0);
        expect.soft(findings.clippedHeadings, 'clipped headings').toEqual([]);
        expect.soft(findings.overlappingBars, 'overlapping fixed bars').toEqual([]);
      });
    }
  }
}
