import { useSyncExternalStore } from 'react';
import type { DataRouter } from 'react-router';

const CSS = `
.lh-navbar{position:fixed;inset:0 0 auto 0;height:3px;z-index:100;pointer-events:none;overflow:hidden;opacity:0;animation:lh-navbar-in 1ms linear 150ms forwards}
.lh-navbar::after{content:"";position:absolute;inset:0;background:var(--heritage,currentColor);transform-origin:left;animation:lh-navbar-run 1.1s ease-out forwards}
@keyframes lh-navbar-in{to{opacity:1}}
@keyframes lh-navbar-run{from{transform:scaleX(.05)}to{transform:scaleX(.9)}}
@media (prefers-reduced-motion:reduce){html:not([data-motion="full"]) .lh-navbar::after{animation:none;transform:scaleX(.6)}}
html[data-motion="reduce"] .lh-navbar::after{animation:none;transform:scaleX(.6)}
`;

/** Thin top bar shown only when a navigation takes longer than ~150ms (no flicker, no layout shift). */
export function NavProgress({ router }: { router: DataRouter }) {
  const busy = useSyncExternalStore(
    (cb) => router.subscribe(cb),
    () => router.state.navigation.state !== 'idle',
    () => false,
  );
  if (!busy) return null;
  return (
    <>
      <style>{CSS}</style>
      <div className="lh-navbar" aria-hidden="true" />
    </>
  );
}
