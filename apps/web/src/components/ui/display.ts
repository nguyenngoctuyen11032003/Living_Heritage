// `cn()` only joins classes; it does not resolve conflicts. A component whose base classes include a display
// utility (`inline-flex`, `flex`, `block`…) therefore cannot be hidden by a caller passing `className="hidden sm:inline-flex"`:
// both `display` rules apply and the stylesheet order, not the caller, decides the winner (QA 2026-10-22 P0 #1).
//
// Rule for components/ui and components/layout: the base display class goes through `baseDisplay()`, which drops it
// when the caller's className already sets an unprefixed display utility. Responsive variants (`sm:flex`) never conflict
// with the base class, so they don't count. Callers in layout code should still prefer wrapping (`<div className="hidden sm:block">`).

const DISPLAY = new Set([
  'block',
  'inline-block',
  'inline',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'contents',
  'flow-root',
  'list-item',
  'table',
  'inline-table',
  'table-row',
  'table-cell',
  'hidden',
]);

/** True when `className` sets a display utility without a variant prefix (e.g. `hidden`, `!flex`, `grid!`). */
export function hasDisplayOverride(className?: string | null): boolean {
  if (!className) return false;
  return className.split(/\s+/).some((token) => DISPLAY.has(token.replace(/^!|!$/g, '')));
}

/** `display` unless the caller's className already chooses one. */
export function baseDisplay(display: string, className?: string | null): string {
  return hasDisplayOverride(className) ? '' : display;
}
