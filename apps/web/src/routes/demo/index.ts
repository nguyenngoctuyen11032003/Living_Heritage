import { page, type AreaRoutes } from '../types';

// Area 'demo': the no-account storytelling walkthrough (B1/B18, NT01). Fully in memory, no API calls.
export const area: AreaRoutes = {
  site: [page('trai-nghiem', () => import('@/features/demo/DemoPage'))],
};
