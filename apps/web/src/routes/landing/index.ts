import type { AreaRoutes } from '../types';

// Area 'landing' (Workstream C): the homepage as the index route of SiteLayout.
export const area: AreaRoutes = {
  site: [{ index: true, lazy: async () => ({ Component: (await import('./LandingPage')).default }) }],
};
