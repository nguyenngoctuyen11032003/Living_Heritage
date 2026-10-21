import { page, type AreaRoutes } from '../types';

// Area 'admin' (Workstream G): moderation console, signed-in app layout; the page itself checks rpc('is_admin').
export const area: AreaRoutes = {
  app: [page('quan-tri', () => import('@/features/admin/AdminPage'))],
};
