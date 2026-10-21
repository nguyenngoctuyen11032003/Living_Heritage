import { preloadNamespaces } from '@/i18n';
import type { AreaRoutes } from '../types';

// Area 'landing' (Workstream C): the homepage as the index route of SiteLayout.
export const area: AreaRoutes = {
  // The landing dictionary downloads alongside the page chunk instead of after it (no second round trip).
  // handle.noBackend: no Supabase SDK before first paint (app/router.tsx).
  site: [{ index: true, handle: { noBackend: true }, lazy: async () => ({ Component: (await Promise.all([import('./LandingPage'), preloadNamespaces(['landing'])]))[0].default }) }],
};
