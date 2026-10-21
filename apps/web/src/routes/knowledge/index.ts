import { page, type AreaRoutes } from '../types';

// Area 'knowledge' (Workstream G): public knowledge hub, item detail, saved list and the QR listen page.
export const area: AreaRoutes = {
  site: [
    page('kham-pha', () => import('@/features/knowledge/pages/ExplorePage')),
    page('tri-thuc/:id', () => import('@/features/knowledge/pages/ItemPage')),
    page('da-luu', () => import('@/features/knowledge/pages/SavedPage')),
    page('nghe/:storyId', () => import('@/features/knowledge/pages/ListenPage')),
  ],
};
