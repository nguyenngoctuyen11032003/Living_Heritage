import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/design/global.css';
import { App } from './App';

// After a deploy, old lazy chunks 404: reload once to pick up the new build (guarded against reload loops).
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('lh.chunkReload') ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem('lh.chunkReload', String(Date.now()));
    event.preventDefault();
    window.location.reload();
  } catch {
    /* storage unavailable: fall through to the route error page */
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
