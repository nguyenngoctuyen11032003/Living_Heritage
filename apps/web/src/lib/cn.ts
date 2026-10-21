// Unprefixed Tailwind display utilities. Two of them on one element fight each other and the stylesheet order, not
// the caller, decides the winner (QA 2026-10-22 P0 #1: `cn('inline-flex', 'hidden sm:inline-flex')` never hid).
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

/**
 * Join class names, skipping falsy values.
 *
 * The one conflict it resolves is `display`: when several unprefixed display utilities are present, the last one wins
 * (so a caller's `className="hidden sm:flex"` overrides a component's base `flex`). Variants (`sm:flex`, `group-hover:hidden`)
 * and important utilities (`!flex`, `flex!`) are left as written. Every other class is passed through unchanged.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  const tokens = parts
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);
  let lastDisplay = -1;
  tokens.forEach((token, i) => {
    if (DISPLAY.has(token)) lastDisplay = i;
  });
  if (lastDisplay === -1) return tokens.join(' ');
  return tokens.filter((token, i) => i === lastDisplay || !DISPLAY.has(token)).join(' ');
}
